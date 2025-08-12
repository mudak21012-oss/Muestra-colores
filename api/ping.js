// /api/ping.js
export default function handler(req, res){
  const k = (process.env.OPENAI_API_KEY || "").trim();
  const p = (process.env.OPENAI_PROJECT || "").trim();
  res.status(200).json({
    ok: true,
    apiKeyPrefix: k ? k.slice(0,7) : null, // "sk-proj" o "sk-..."
    hasProject: !!p
  });
}
