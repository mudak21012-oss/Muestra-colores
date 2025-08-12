import express from "express";
import cors from "cors";
import "dotenv/config";
import OpenAI from "openai";

const app = express();

// Ajusta orígenes permitidos si tu front está en GitHub Pages o dominio propio
app.use(cors({ origin: true }));
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Endpoint /api/chat con streaming SSE
app.post("/api/chat", async (req, res) => {
  const { message, context } = req.body || {};

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await client.responses.stream({
      model: "gpt-4.1-mini", // rápido y económico
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

    // Emitir tokens a medida que llegan
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

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`API lista en http://localhost:${PORT}`));
