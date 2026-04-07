import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "e2b";
import { readFileSync } from "fs";
import { resolve } from "path";

export const runtime = "nodejs";
export const maxDuration = 600;

const E2B_API_KEY       = process.env.E2B_API_KEY ?? "";
const E2B_TEMPLATE      = process.env.E2B_TEMPLATE_ID ?? "base";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";

const AGENT2_PROMPT = (() => {
  try {
    return readFileSync(resolve(process.cwd(), "public/lib/agent2.prompt.txt"), "utf-8");
  } catch {
    return "You are a TypeScript expert. Fix ALL TypeScript errors. Return ONLY the complete fixed file. No fences.";
  }
})();

type LogType = "info" | "agent" | "success" | "error";

// ─── SSE ─────────────────────────────────────────────────────────────────────

function makeSSE(ctrl: ReadableStreamDefaultController<Uint8Array>) {
  const enc = new TextEncoder();
  const push = (o: Record<string, unknown>) => {
    try { ctrl.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`)); } catch { /**/ }
  };
  return {
    log:   (msg: string, t: LogType = "info") => push({ type: "log", msg, logType: t }),
    done:  (script: string)                   => push({ type: "done", script }),
    fatal: (msg: string)                      => push({ type: "fatal", msg }),
  };
}

type SSE = ReturnType<typeof makeSSE>;

// ─── runSafe ─────────────────────────────────────────────────────────────────
// - Wraps every command with `yes |` to auto-answer any interactive prompt
// - Uses sentinel echo to capture real exit code (SDK throws on non-zero)
// - Never throws, always returns { out, code }

async function runSafe(
  sbx: Sandbox,
  cmd: string,
  opts: { timeout?: number; onLine?: (l: string) => void; interactive?: boolean } = {}
): Promise<{ out: string; code: number }> {
  const S = "__EC__";
  let out = "";

  // Wrap with `yes |` to answer any Y/n prompts automatically
  // Use `script -q -c` to force PTY so interactive CLIs don't detect non-TTY
  const wrapped = opts.interactive === true
    ? `bash -c 'yes | ${cmd.replace(/'/g, "'\\''")} 2>&1; echo ${S}:$?'`
    : `bash -c '${cmd.replace(/'/g, "'\\''")} 2>&1; echo ${S}:$?'`;

  try {
    await sbx.commands.run(wrapped, {
      timeout: opts.timeout ?? 120_000,
      onStdout: (line: string) => {
        out += line + "\n";
        if (opts.onLine && !line.includes(S)) opts.onLine(line.trimEnd());
      },
    });
  } catch { /**/ }

  const m = out.match(new RegExp(`${S}:(\\d+)`));
  const code = m ? parseInt(m[1], 10) : 0; // default 0 — assume ok if sentinel missing
  out = out.replace(new RegExp(`${S}:\\d+\\s*\\n?`), "").trimEnd();
  return { out, code };
}

// ─── Parse tsc errors ────────────────────────────────────────────────────────

function parseTscErrors(output: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const line of output.split("\n")) {
    const m = line.match(/^(src\/[^\s(]+\.tsx?)\(\d+,\d+\):\s+error\s+TS\d+:/);
    if (m) {
      if (!map.has(m[1])) map.set(m[1], []);
      map.get(m[1])!.push(line.trim());
    }
  }
  return map;
}

// ─── Claude fix one file ─────────────────────────────────────────────────────

async function fixFile(path: string, content: string, errors: string[], iter: number): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-6",
      max_tokens: 16000,
      system: AGENT2_PROMPT,
      messages: [{ role: "user", content: `Attempt #${iter}\nFile: ${path}\n\nErrors:\n${errors.join("\n")}\n\nContent:\n${content}` }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const data = await res.json() as { content: { type: string; text?: string }[] };
  const text = data.content.find(b => b.type === "text")?.text ?? content;
  return text.replace(/^```(?:tsx?|ts|jsx?)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
}

// ─── tsc fix loop ────────────────────────────────────────────────────────────

async function tscLoop(sbx: Sandbox, sse: SSE, workdir: string): Promise<void> {
  let iter = 0;
  let noProgressCount = 0;

  while (true) {
    iter++;
    sse.log(`tsc check — iterazione ${iter}`, "agent");

    const { out, code } = await runSafe(
      sbx,
      `cd ${workdir} && npx tsc --noEmit --pretty false`,
      { timeout: 120_000, interactive: false }
    );

    // GREEN BUILD
    if (code === 0 && !out.includes("error TS")) {
      sse.log(`✓ GREEN BUILD — ${iter} iterazion${iter === 1 ? "e" : "i"}`, "success");
      return;
    }

    // Log output
    out.split("\n").filter(l => l.trim()).slice(0, 25).forEach(l => sse.log(l, "error"));

    const byFile = parseTscErrors(out);

    if (byFile.size === 0) {
      noProgressCount++;
      sse.log(`Nessun errore TS parsabile (tentativo ${noProgressCount}/5):\n${out.slice(0, 400)}`, "error");
      if (noProgressCount >= 5) {
        throw new Error(`tsc non produce errori parsabili — verifica che il progetto sia compilabile. Ultimo output: ${out.slice(0, 300)}`);
      }
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }

    noProgressCount = 0;
    sse.log(`${byFile.size} file con errori — fix con Claude...`, "error");

    for (const [filePath, errors] of byFile) {
      sse.log(`  Fixing ${filePath} (${errors.length} errori)...`, "info");
      try {
        const content = await sbx.files.read(`${workdir}/${filePath}`);
        if (!content.trim()) { sse.log(`  ✗ ${filePath}: vuoto`, "error"); continue; }
        const fixed = await fixFile(filePath, content, errors, iter);
        await sbx.files.write(`${workdir}/${filePath}`, fixed);
        sse.log(`  ✓ ${filePath}`, "success");
      } catch (e) {
        sse.log(`  ✗ ${filePath}: ${(e as Error).message}`, "error");
      }
    }
  }
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!E2B_API_KEY)       return NextResponse.json({ error: "E2B_API_KEY missing" }, { status: 500 });
  if (!ANTHROPIC_API_KEY) return NextResponse.json({ error: "ANTHROPIC_API_KEY missing" }, { status: 500 });

  const { script, tenantName } = (await req.json()) as { script: string; tenantName: string };
  const name = (tenantName || "tenant").replace(/[^a-z0-9-]/gi, "-").toLowerCase();

  const encoder = new TextEncoder();
  const stream  = new ReadableStream({
    async start(controller) {
      const sse = makeSSE(controller);
      let sbx: Sandbox | null = null;

      try {
        // 1. Create sandbox
        sse.log("Creazione sandbox E2B...", "agent");
        sbx = await Sandbox.create(E2B_TEMPLATE, { apiKey: E2B_API_KEY, timeoutMs: 540_000 });
        sse.log(`Sandbox [${sbx.sandboxId}] pronta`, "success");

        const BASE = "/home/user";
        const TENANT_DIR = `${BASE}/${name}`;

        // 2. npx @olonjs/cli new tenant $name — creates project + installs deps
        sse.log(`npx @olonjs/cli new tenant ${name}...`, "agent");
        const { out: cliOut, code: cliCode } = await runSafe(
  sbx,
  `cd ${BASE} && olonjs new tenant ${name}`,
  { timeout: 300_000, onLine: l => sse.log(l, "info"), interactive: false }
);

        if (cliCode !== 0) {
          sse.log(`CLI output:\n${cliOut.slice(-500)}`, "error");
          throw new Error(`@olonjs/cli new tenant fallito con exit ${cliCode}`);
        }
        sse.log(`Progetto ${name} pronto`, "success");

        // 3. Write src_tenant.sh and run it with yes | to auto-answer prompts
        sse.log("Copia ed esecuzione src_tenant.sh...", "agent");
        await sbx.files.write(`${TENANT_DIR}/src_tenant.sh`, script);

        const { out: scriptOut, code: scriptCode } = await runSafe(
          sbx,
          `cd ${TENANT_DIR} && bash src_tenant.sh`,
          { timeout: 300_000, onLine: l => sse.log(l, "info") }
          // yes | already added by runSafe by default
        );

        if (scriptCode !== 0) {
          sse.log(`Script uscito con codice ${scriptCode}`, "error");
          scriptOut.split("\n").slice(-20).forEach(l => sse.log(l, "error"));
          sse.log("Continuo con npm run build...", "info");
        } else {
          sse.log("src_tenant.sh completato", "success");
        }

        // 4. npm run build
        sse.log("npm run build...", "agent");
        const { out: buildOut, code: buildCode } = await runSafe(
          sbx,
          `cd ${TENANT_DIR} && npm run build`,
          { timeout: 180_000, onLine: l => sse.log(l, "info"), interactive: false }
        );

        if (buildCode !== 0) {
          sse.log("Build fallito — avvio tsc fix loop...", "error");
          buildOut.split("\n").slice(-20).forEach(l => sse.log(l, "error"));
          await tscLoop(sbx, sse, TENANT_DIR);
        } else {
          sse.log("✓ GREEN BUILD al primo tentativo", "success");
        }

        // 5. Copy src2Code.sh and run it
        sse.log("Copia src2Code.sh...", "info");
        const src2CodeContent = readFileSync(
          resolve(process.cwd(), "public/lib/src2Code.sh"), "utf-8"
        );
        await sbx.files.write(`${TENANT_DIR}/src2Code.sh`, src2CodeContent);

        sse.log("Esecuzione src2Code.sh src...", "agent");
        const { out: src2Out, code: src2Code } = await runSafe(
          sbx,
          `cd ${TENANT_DIR} && bash src2Code.sh src`,
          { timeout: 120_000, onLine: l => sse.log(l, "info"), interactive: false }
        );

        if (src2Code !== 0) {
          throw new Error(`src2Code.sh fallito:\n${src2Out.slice(-300)}`);
        }
        sse.log("src2Code.sh completato", "success");

        // 6. Read install_npm.jpcore.sh
        sse.log("Lettura install_npm.jpcore.sh...", "info");
        const finalScript = await sbx.files.read(`${TENANT_DIR}/install_npm.jpcore.sh`);
        if (!finalScript.trim()) throw new Error("install_npm.jpcore.sh vuoto");

        sse.log(`✓ Script finale: ${(finalScript.length / 1024).toFixed(1)} KB`, "success");
        sse.done(finalScript);

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        sse.log(`Errore fatale: ${msg}`, "error");
        sse.fatal(msg);
      } finally {
        if (sbx) { try { await sbx.kill(); } catch { /**/ } }
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
