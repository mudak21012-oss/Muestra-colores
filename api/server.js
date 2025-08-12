import express from "express";
import cors from "cors";
import "dotenv/config";
import OpenAI from "openai";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ── ⬇️ Valida y toma credenciales (sk-proj + proj_…) ───────────────────────────
const API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const PROJECT = (process.env.OPENAI_PROJECT || "").trim(); // <- AÑADIDO
if (!API_KEY) throw new Error("Falta OPENAI_API_KEY en .env");
if (API_KEY.startsWith("sk-proj") && !PROJECT) {
  throw new Error("Usas sk-proj-… pero falta OPENAI_PROJECT=proj_xxx en .env");
}

const client = new OpenAI({
  apiKey: API_KEY,
  project: PROJECT || undefined, // <- AÑADIDO (necesario para sk-proj-…)
});

// ── GET /: health ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.type("text/plain").send("API Hoho3D OK. Usa POST /api/chat (SSE) o /api/chat-json");
});

// ── POST /api/chat (SSE streaming) ─────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const { message, context } = req.body || {};
  if (!message) {
    res.status(400).json({ error: "Falta 'message' en el cuerpo" });
    return;
  }

  // headers SSE
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await client.responses.stream({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "Eres un experto en impresión 3D y teoría del color. Responde en español, claro y accionable. Usa el color HEX y los filamentos cercanos si están en el contexto."
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                `Consulta: ${message}\n` +
                `Contexto: ${JSON.stringify(context)}\n` +
                `Devuelve ideas (2–3) y combinaciones de colores sugeridas.`
            }
          ]
        }
      ],
      stream: true
    });

    const onClose = () => {
      try { stream.abort(); } catch {}
      res.end();
    };
    req.on("close", onClose);

    stream.on("text.delta", (delta) => res.write(`data: ${delta}\n\n`));
    stream.on("text.done", () => {
      res.write(`data: [DONE]\n\n`);
      res.end();
    });
    stream.on("error", (err) => {
      res.write(`event: error\ndata: ${JSON.stringify(err.message)}\n\n`);
      res.end();
    });
  } catch (e) {
    res.write(`event: error\ndata: ${JSON.stringify(e.message)}\n\n`);
    res.end();
  }
});

// ── POST /api/chat-json (no stream) para pruebas con curl/postman ─────────────
app.post("/api/chat-json", async (req, res) => {
  const { message, context } = req.body || {};
  if (!message) {
    res.status(400).json({ error: "Falta 'message' en el cuerpo" });
    return;
  }
  try {
    const result = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: "Eres un experto en impresión 3D y teoría del color. Responde en español, claro y accionable." },
        { role: "user", content: `Consulta: ${message}\nContexto: ${JSON.stringify(context)}` }
      ]
    });
    res.json({ reply: result.output_text || "Sin respuesta." });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Error en la API" });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`API lista en http://localhost:${PORT}`));
