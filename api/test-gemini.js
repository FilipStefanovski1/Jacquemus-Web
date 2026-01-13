export const config = {
  api: { bodyParser: false },
};

async function readJsonOrText(response) {
  const raw = await response.text();
  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    // ignore
  }
  return { raw, json };
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Use GET or POST" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    // Use a TEXT model here on purpose (this is just a sanity test).
    // Set GEMINI_TEXT_MODEL in Vercel if you want. Otherwise fallback:
    const model = process.env.GEMINI_TEXT_MODEL || "gemini-1.5-flash";

    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: "Say OK in one word. Then list the model you are using." }],
        },
      ],
    };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const { raw, json } = await readJsonOrText(r);

    if (!r.ok) {
      return res.status(r.status).json({
        ok: false,
        status: r.status,
        model,
        error: json?.error?.message || "Gemini API error",
        raw: raw?.slice(0, 1200),
        details: json || null,
      });
    }

    const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") || null;

    return res.status(200).json({
      ok: true,
      model,
      text,
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}
