// /api/chat-json.js – Vercel Serverless Function
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" }); 
      return;
    }

    const apiKey  = (process.env.OPENAI_API_KEY || "").trim();
    const project = (process.env.OPENAI_PROJECT || "").trim(); // requerido si la clave es sk-proj-...
    if (!apiKey) { 
      res.status(500).json({ error: "OPENAI_API_KEY no configurada en Vercel" }); 
      return; 
    }
    if (apiKey.startsWith("sk-proj") && !project) {
      res.status(400).json({ error: "Usas sk-proj-… pero falta OPENAI_PROJECT=proj_xxx en Vercel" });
      return;
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body||"{}") : (req.body||{});
    const { message, context } = body;
    if (!message) { 
      res.status(400).json({ error: "Falta 'message' en el body" }); 
      return; 
    }

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    };
    if (apiKey.startsWith("sk-proj") && project) {
      headers["OpenAI-Project"] = project; // <– necesario con sk-proj
    }

    const payload = {
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: "Eres un experto en impresión 3D y teoría del color. Responde en español, claro y accionable." },
        {
          role: "user",
          content: [
            { type: "input_text",
              text:
                `Consulta: ${message}\n` +
                `Contexto: ${JSON.stringify(context || {})}\n` +
                `Devuelve ideas (2–3) y combinaciones de colores sugeridas.` }
          ]
        }
      ]
    };

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    const j = await r.json();

    if (!r.ok) {
      res.status(r.status).json({ error: j?.error?.message || JSON.stringify(j) });
      return;
    }
    res.status(200).json({ reply: j.output_text || "Sin respuesta." });
  } catch (e) {
    res.status(500).json({ error: e.message || "Error interno" });
  }
}
