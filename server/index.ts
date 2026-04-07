import express from "express";
import cors from "cors";
import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, "../.env.local");
const envPathAlt = resolve(__dir, "../.env");
for (const p of [envPath, envPathAlt]) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const [key, ...rest] = t.split("=");
    if (key && rest.length)
      process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
}

const API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const PORT = Number(process.env.PORT ?? 3001);

if (!API_KEY) {
  console.error("❌  ANTHROPIC_API_KEY not set in .env.local");
  process.exit(1);
}

const app = express();
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173"] }));
app.use(express.json({ limit: "16mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: "claude-sonnet-4-6" });
});

app.post("/api/claude", async (req, res) => {
  req.socket.setTimeout(0);
  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ ...req.body, stream: true }),
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      res.status(upstream.status).json({ error: text });
      return;
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });
    const reader = upstream.body!.getReader();
    const dec = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(dec.decode(value, { stream: true }));
    }
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!res.headersSent) res.status(500).json({ error: msg });
    else res.end();
  }
});

createServer(app).listen(PORT, () => {
  console.log(`✅  OlonAgent proxy → http://localhost:${PORT}`);
  console.log(`    Model: claude-sonnet-4-6  |  Key: ...${API_KEY.slice(-6)}`);
});
