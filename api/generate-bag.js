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
          filename: info.filename,
          mimeType: info.mimeType,
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const { fields, files } = await readMultipart(req);

    const apiKey = process.env.GEMINI_API_KEY;
    // Nano Banana Pro (Gemini 3 Pro Image preview)
    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";

    if (!apiKey) return res.status(500).json({ error: "Missing GEMINI_API_KEY in env" });
    if (!files.bag || !files.fabric) return res.status(400).json({ error: "Missing bag or fabric image" });

    const prompt = fields.prompt || "wrap the bag of image 1 in the texture of image 2";

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(500).json({
        error: data?.error?.message || "Gemini API error",
        details: data,
      });
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find((p) => p.inline_data?.data);

    if (!imgPart) return res.status(500).json({ error: "No image returned", raw: data });

    const mime = imgPart.inline_data.mime_type || "image/png";
    const base64 = imgPart.inline_data.data;

    return res.status(200).json({ image: `data:${mime};base64,${base64}` });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
