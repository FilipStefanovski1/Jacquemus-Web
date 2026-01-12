export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = "gemini-1.5-pro"; // TEXT MODEL — SAFE

  if (!apiKey) {
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: "Say hello in one sentence." }],
      },
    ],
  };

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await r.text();

  if (!r.ok) {
    return res.status(r.status).json({
      status: r.status,
      raw,
    });
  }

  return res.status(200).json({
    ok: true,
    raw: JSON.parse(raw),
  });
}
