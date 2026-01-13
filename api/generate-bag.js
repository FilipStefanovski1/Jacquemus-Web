export const config = {
  api: { bodyParser: false },
};

import Busboy from "busboy";

function readMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const fields = {};
    const files = {};

    busboy.on("file", (name, file, info) => {
      const chunks = [];
      file.on("data", (d) => chunks.push(d));
      file.on("end", () => {
        files[name] = {
          filename: info?.filename || "upload",
          mimeType: info?.mimeType || "application/octet-stream",
          buffer: Buffer.concat(chunks),
        };
      });
    });

    busboy.on("field", (name, val) => {
      fields[name] = val;
    });

    busboy.on("finish", () => resolve({ fields, files }));
    busboy.on("error", reject);

    req.pipe(busboy);
  });
}

function toInlineData(file) {
  return {
    inline_data: {
      mime_type: file.mimeType || "image/png",
      data: file.buffer.toString("base64"),
    },
  };
}

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

function extractFirstInlineImage(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.find((p) => p?.inline_data?.data);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const { fields, files } = await readMultipart(req);

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";

    if (!apiKey) return res.status(500).json({ error: "Missing GEMINI_API_KEY in env" });
    if (!files.bag || !files.fabric) return res.status(400).json({ error: "Missing bag or fabric image" });

    const prompt =
      fields.prompt ||
      "wrap the bag of image 1 in the texture of image 2, keep shape, seams, lighting, shadows, and realism";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            toInlineData(files.bag),
            toInlineData(files.fabric),
          ],
        },
      ],
      // Some image models support this, some ignore it.
      // Keep it, but don’t depend on it.
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
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
        raw: raw?.slice(0, 1600),
        details: json || null,
      });
    }

    const imgPart = extractFirstInlineImage(json);

    if (!imgPart) {
      // If model returns only text, surface it
      const text =
        json?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") || null;

      return res.status(500).json({
        ok: false,
        model,
        error: "No image returned by model.",
        text,
        raw: json,
      });
    }

    const mime = imgPart.inline_data.mime_type || "image/png";
    const base64 = imgPart.inline_data.data;

    return res.status(200).json({
      ok: true,
      model,
      image: `data:${mime};base64,${base64}`,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
