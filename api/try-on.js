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
        const mime =
          info?.mimeType || info?.mime_type || info?.mimetype || "application/octet-stream";

        files[name] = {
          filename: info?.filename || "upload",
          mimeType: mime,
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
    inlineData: {
      mimeType: file.mimeType || "image/png",
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
  return parts.find((p) => p?.inlineData?.data || p?.inline_data?.data) || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const { fields, files } = await readMultipart(req);

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

    if (!apiKey) return res.status(500).json({ error: "Missing GEMINI_API_KEY in env" });
    if (!files.person || !files.bag)
      return res.status(400).json({ error: "Missing person or bag image" });

    const prompt =
      fields.prompt ||
      "make the person hold the bag naturally; match scale, perspective, lighting and shadows; realistic composite";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }, toInlineData(files.person), toInlineData(files.bag)],
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
      const text =
        json?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") ||
        null;

      return res.status(500).json({
        ok: false,
        model,
        error: "No image returned by model.",
        text,
        raw: json,
      });
    }

    const inline = imgPart.inlineData || imgPart.inline_data;
    const mime = inline?.mimeType || inline?.mime_type || "image/png";
    const base64 = inline?.data;

    if (!base64) {
      return res.status(500).json({
        ok: false,
        model,
        error: "Image part missing base64 data.",
        raw: json,
      });
    }

    return res.status(200).json({
      ok: true,
      model,
      image: `data:${mime};base64,${base64}`,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
