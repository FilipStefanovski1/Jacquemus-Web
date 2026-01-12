export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = "gemini-1.5-pro";

    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "Describe in detail how to wrap a luxury leather handbag " +
                "with a denim texture while preserving seams, lighting, and realism.",
            },
          ],
        },
      ],
    };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const raw = await r.text();
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      json = null;
    }

    if (!r.ok) {
      return res.status(r.status).json({
        error: "Gemini error",
        status: r.status,
        raw: raw.slice(0, 800),
      });
    }

    const text =
      json?.candidates?.[0]?.content?.parts?.[0]?.text || null;

    return res.status(200).json({
      ok: true,
      model,
      text,
      raw: json,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
