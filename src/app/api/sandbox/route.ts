import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "e2b";
import { readFileSync } from "fs";
import { resolve } from "path";
import { generateText } from "@/lib/llm";
import type { LlmProvider } from "@/lib/llm/types";

export const runtime = "nodejs";
export const maxDuration = 600;

const E2B_API_KEY = process.env.E2B_API_KEY ?? "";
const E2B_TEMPLATE = process.env.E2B_TEMPLATE_ID ?? "base";
const E2B_SANDBOX_TIMEOUT_MS = Number(process.env.E2B_SANDBOX_TIMEOUT_MS ?? 1_800_000);

const AGENT2_PROMPT = (() => {
  try {
    return readFileSync(resolve(process.cwd(), "public/lib/agent2.prompt.txt"), "utf-8");
  } catch {
    return "You are a TypeScript expert. Fix ALL TypeScript errors. Return ONLY the complete fixed file. No fences.";
  }
})();

type LogType = "info" | "agent" | "success" | "error";

function getEnvApiKey(provider: LlmProvider): string {
  if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY ?? "";
  if (provider === "openai") return process.env.OPENAI_API_KEY ?? "";
  return process.env.GEMINI_API_KEY ?? "";
}

function sanitizeTenantName(value: string): string {
  const slug = (value || "tenant")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 48)
    .replace(/-+$/g, "");

  return slug || "tenant";
}

function makeSSE(ctrl: ReadableStreamDefaultController<Uint8Array>) {
  const encoder = new TextEncoder();
  const push = (payload: Record<string, unknown>) => {
    try {
      ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
    } catch {
      // Stream may already be closed.
    }
  };

  return {
    log: (msg: string, logType: LogType = "info") => push({ type: "log", msg, logType }),
    done: (script: string) => push({ type: "done", script }),
    fatal: (msg: string) => push({ type: "fatal", msg }),
  };
}

type SSE = ReturnType<typeof makeSSE>;

async function extendSandboxTimeout(sbx: Sandbox, sse: SSE, reason: string) {
  try {
    await sbx.setTimeout(E2B_SANDBOX_TIMEOUT_MS);
    sse.log(`Sandbox timeout esteso prima di ${reason} (${Math.round(E2B_SANDBOX_TIMEOUT_MS / 60000)} min)`, "info");
  } catch (error) {
    sse.log(`Impossibile estendere il timeout sandbox prima di ${reason}: ${(error as Error).message}`, "error");
  }
}

async function runSafe(
  sbx: Sandbox,
  cmd: string,
  opts: { timeout?: number; onLine?: (line: string) => void; interactive?: boolean } = {}
): Promise<{ out: string; code: number }> {
  const sentinel = "__EC__";
  let out = "";

  const wrapped = opts.interactive === true
    ? `bash -c 'yes | ${cmd.replace(/'/g, "'\\''")} 2>&1; echo ${sentinel}:$?'`
    : `bash -c '${cmd.replace(/'/g, "'\\''")} 2>&1; echo ${sentinel}:$?'`;

  try {
    await sbx.commands.run(wrapped, {
      timeoutMs: opts.timeout ?? 120_000,
      onStdout: (line: string) => {
        out += `${line}\n`;
        if (opts.onLine && !line.includes(sentinel)) opts.onLine(line.trimEnd());
      },
    });
  } catch {
    // We capture non-zero exit codes through the sentinel output.
  }

  const match = out.match(new RegExp(`${sentinel}:(\\d+)`));
  const code = match ? parseInt(match[1], 10) : 0;
  out = out.replace(new RegExp(`${sentinel}:\\d+\\s*\\n?`), "").trimEnd();
  return { out, code };
}

function parseTscErrors(output: string): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const line of output.split("\n")) {
    const match = line.match(/^(src\/[^\s(]+\.tsx?)\(\d+,\d+\):\s+error\s+TS\d+:/);
    if (!match) continue;

    if (!map.has(match[1])) map.set(match[1], []);
    map.get(match[1])!.push(line.trim());
  }

  return map;
}

function isSystemOwnedFixPath(filePath: string): boolean {
  return filePath === "src/App.tsx"
    || /^vite\.config\./.test(filePath)
    || /^tsconfig/i.test(filePath)
    || filePath === "package.json";
}

async function fixFile(
  path: string,
  content: string,
  errors: string[],
  iter: number,
  llm: { provider: LlmProvider; model: string; apiKey: string }
): Promise<string> {
  return generateText({
    provider: llm.provider,
    model: llm.model,
    apiKey: llm.apiKey,
    maxTokens: 16000,
    system: AGENT2_PROMPT,
    messages: [
      {
        role: "user",
        content: `Attempt #${iter}\nFile: ${path}\n\nErrors:\n${errors.join("\n")}\n\nContent:\n${content}`,
      },
    ],
  });
}

async function tscLoop(
  sbx: Sandbox,
  sse: SSE,
  workdir: string,
  llm: { provider: LlmProvider; model: string; apiKey: string }
): Promise<void> {
  let iter = 0;
  let noProgressCount = 0;

  while (true) {
    iter++;
    sse.log(`tsc check - iterazione ${iter}`, "agent");

    const { out, code } = await runSafe(
      sbx,
      `cd ${workdir} && npx tsc --noEmit --pretty false`,
      { timeout: 120_000, interactive: false }
    );

    if (code === 0 && !out.includes("error TS")) {
      sse.log(`Green build dopo ${iter} iterazion${iter === 1 ? "e" : "i"}`, "success");
      return;
    }

    out
      .split("\n")
      .filter((line) => line.trim())
      .slice(0, 25)
      .forEach((line) => sse.log(line, "error"));

    const byFile = parseTscErrors(out);

    if (byFile.size === 0) {
      noProgressCount++;
      sse.log(`Nessun errore TS parsabile (tentativo ${noProgressCount}/5):\n${out.slice(0, 400)}`, "error");
      if (noProgressCount >= 5) {
        throw new Error(`tsc non produce errori parsabili. Ultimo output: ${out.slice(0, 300)}`);
      }
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 3000));
      continue;
    }

    noProgressCount = 0;
    sse.log(`${byFile.size} file con errori - fix con ${llm.provider}/${llm.model}...`, "error");

    for (const [filePath, errors] of byFile) {
      if (isSystemOwnedFixPath(filePath)) {
        sse.log(`Skip system-owned file: ${filePath}`, "error");
        continue;
      }

      sse.log(`Fixing ${filePath} (${errors.length} errori)...`, "info");

      try {
        const content = await sbx.files.read(`${workdir}/${filePath}`);
        if (!content.trim()) {
          sse.log(`${filePath}: file vuoto`, "error");
          continue;
        }

        const fixed = await fixFile(filePath, content, errors, iter, llm);
        await sbx.files.write(`${workdir}/${filePath}`, fixed);
        sse.log(`Aggiornato ${filePath}`, "success");
      } catch (error) {
        sse.log(`${filePath}: ${(error as Error).message}`, "error");
      }
    }
  }
}

export async function POST(req: NextRequest) {
  if (!E2B_API_KEY) {
    return NextResponse.json({ error: "E2B_API_KEY missing" }, { status: 500 });
  }

  const { script, tenantName, llm } = (await req.json()) as {
    script: string;
    tenantName: string;
    llm?: { provider: LlmProvider; model: string };
  };

  const name = sanitizeTenantName(tenantName);
  const resolvedLlm = llm ?? { provider: "anthropic", model: "claude-sonnet-4-20250514" };
  const resolvedApiKey = getEnvApiKey(resolvedLlm.provider);

  if (!resolvedApiKey) {
    return NextResponse.json(
      { error: `Missing API key for sandbox fixer provider ${resolvedLlm.provider}` },
      { status: 400 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const sse = makeSSE(controller);
      let sbx: Sandbox | null = null;

      try {
        sse.log("Creazione sandbox E2B...", "agent");
        sbx = await Sandbox.create(E2B_TEMPLATE, {
          apiKey: E2B_API_KEY,
          timeoutMs: E2B_SANDBOX_TIMEOUT_MS,
        });
        sse.log(`Sandbox [${sbx.sandboxId}] pronta`, "success");

        const baseDir = "/home/user";
        const tenantDir = `${baseDir}/${name}`;

        await extendSandboxTimeout(sbx, sse, "olonjs new tenant");
        sse.log(`npx --yes @olonjs/cli@latest new tenant ${name}...`, "agent");
        const { out: cliOut, code: cliCode } = await runSafe(
          sbx,
          `cd ${baseDir} && npx --yes @olonjs/cli@latest --version && npx --yes @olonjs/cli@latest new tenant ${name}`,
          { timeout: 300_000, onLine: (line) => sse.log(line, "info"), interactive: false }
        );

        if (cliCode !== 0) {
          sse.log(`CLI output:\n${cliOut.slice(-500)}`, "error");
          throw new Error(`@olonjs/cli new tenant fallito con exit ${cliCode}`);
        }

        sse.log(`Progetto ${name} pronto`, "success");

        sse.log("Verifica scaffold base...", "info");
        const { out: scaffoldCheckOut, code: scaffoldCheckCode } = await runSafe(
          sbx,
          `cd ${tenantDir} && (test -f src/App_.tsx && echo "__HAS_APP_UNDERSCORE__" || true) && find src -maxdepth 1 -type f | sort`,
          { timeout: 30_000, onLine: (line) => sse.log(line, "info"), interactive: false }
        );

        if (scaffoldCheckCode !== 0) {
          sse.log(`Verifica scaffold incompleta:\n${scaffoldCheckOut.slice(-500)}`, "error");
        }

        if (scaffoldCheckOut.includes("__HAS_APP_UNDERSCORE__")) {
          throw new Error("Scaffold base non conforme: la CLI ha generato src/App_.tsx");
        }

        sse.log("Copia ed esecuzione src_tenant.sh...", "agent");
        await sbx.files.write(`${tenantDir}/src_tenant.sh`, script);

        await extendSandboxTimeout(sbx, sse, "src_tenant.sh");
        const { out: scriptOut, code: scriptCode } = await runSafe(
          sbx,
          `cd ${tenantDir} && bash src_tenant.sh`,
          { timeout: 300_000, onLine: (line) => sse.log(line, "info") }
        );

        if (scriptCode !== 0) {
          sse.log(`Script uscito con codice ${scriptCode}`, "error");
          scriptOut.split("\n").slice(-20).forEach((line) => sse.log(line, "error"));
          sse.log("Continuo con npm run build...", "info");
        } else {
          sse.log("src_tenant.sh completato", "success");
        }

        await extendSandboxTimeout(sbx, sse, "npm run build");
        sse.log("npm run build...", "agent");
        const { out: buildOut, code: buildCode } = await runSafe(
          sbx,
          `cd ${tenantDir} && npm run build`,
          { timeout: 180_000, onLine: (line) => sse.log(line, "info"), interactive: false }
        );

        if (buildCode !== 0) {
          sse.log("Build fallito - avvio tsc fix loop...", "error");
          buildOut.split("\n").slice(-20).forEach((line) => sse.log(line, "error"));
          await extendSandboxTimeout(sbx, sse, "tsc fix loop");
          await tscLoop(sbx, sse, tenantDir, {
            provider: resolvedLlm.provider,
            model: resolvedLlm.model,
            apiKey: resolvedApiKey,
          });
        } else {
          sse.log("Green build al primo tentativo", "success");
        }

        sse.log("Copia src2Code.sh...", "info");
        const src2CodeContent = readFileSync(resolve(process.cwd(), "public/lib/src2Code.sh"), "utf-8");
        await sbx.files.write(`${tenantDir}/src2Code.sh`, src2CodeContent);

        await extendSandboxTimeout(sbx, sse, "src2Code.sh");
        sse.log("Esecuzione src2Code.sh src...", "agent");
        const { out: src2Out, code: src2Code } = await runSafe(
          sbx,
          `cd ${tenantDir} && bash src2Code.sh src`,
          { timeout: 120_000, onLine: (line) => sse.log(line, "info"), interactive: false }
        );

        if (src2Code !== 0) {
          throw new Error(`src2Code.sh fallito:\n${src2Out.slice(-300)}`);
        }

        sse.log("src2Code.sh completato", "success");

        sse.log("Lettura install_npm.jpcore.sh...", "info");
        const finalScript = await sbx.files.read(`${tenantDir}/install_npm.jpcore.sh`);
        if (!finalScript.trim()) throw new Error("install_npm.jpcore.sh vuoto");

        sse.log(`Script finale: ${(finalScript.length / 1024).toFixed(1)} KB`, "success");
        sse.done(finalScript);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        sse.log(`Errore fatale: ${message}`, "error");
        sse.fatal(message);
      } finally {
        if (sbx) {
          try {
            await sbx.kill();
          } catch {
            // Best effort cleanup.
          }
        }
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
