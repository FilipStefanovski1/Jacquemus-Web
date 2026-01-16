function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function extractFirstInlineImage(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.find((p) => p?.inlineData?.data || p?.inline_data?.data) || null;
}

async function readJsonOrText(r) {
  const raw = await r.text();
  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {}
  return { raw, json };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const rawBody = await readBody(req);
    const body = rawBody ? JSON.parse(rawBody) : null;

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
    if (!apiKey) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

    const prompt =
      body?.prompt ||
      "make the woman hold the bag naturally; correct scale/perspective; realistic lighting and shadows; do not distort face/body";

    const person = body?.person; // { mimeType, data }
    const bag = body?.bag;       // { mimeType, data }

    if (!person?.data || !bag?.data) {
      return res.status(400).json({ error: "Missing person or bag (base64) in JSON body" });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: person.mimeType || "image/jpeg", data: person.data } },
              { inlineData: { mimeType: bag.mimeType || "image/png", data: bag.data } },
            ],
          },
        ],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });

    const { raw, json } = await readJsonOrText(r);

    if (!r.ok) {
      return res.status(r.status).json({
        ok: false,
        status: r.status,
        error: json?.error?.message || "Gemini API error",
        raw: raw?.slice(0, 1500),
      });
    }

    const imgPart = extractFirstInlineImage(json);
    const inline = imgPart?.inlineData || imgPart?.inline_data;

    if (!inline?.data) {
      return res.status(500).json({ ok: false, error: "No image returned", raw: json });
    }

    const mime = inline.mimeType || inline.mime_type || "image/png";
    return res.status(200).json({
      ok: true,
      model,
      image: `data:${mime};base64,${inline.data}`,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
