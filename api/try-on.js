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

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const textParts = parts
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .filter(Boolean);
  return textParts.join("\n").trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const { fields, files } = await readMultipart(req);

    const apiKey = process.env.GEMINI_API_KEY;

    // TEXT-only model (safe + widely available)
    const model = process.env.GEMINI_TEXT_MODEL || "gemini-1.5-pro";

    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY in env" });
    }
    if (!files.person || !files.bag) {
      return res.status(400).json({ error: "Missing person or bag image" });
    }

    const prompt = fields.prompt || "make the woman hold the bag";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                `${prompt}\n\n` +
                `You are given two images:\n` +
                `- Image 1: full-body person photo\n` +
                `- Image 2: handbag cutout\n\n` +
                `Return ONLY a short, precise editing prompt that an image editor could use to composite the bag naturally into the person's hands, matching perspective, scale, lighting, and shadows. ` +
                `No extra explanation.`,
            },
            toInlineData(files.person),
            toInlineData(files.bag),
          ],
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
        error: json?.error?.message || "Gemini API error",
        status: r.status,
        model,
        raw: raw?.slice(0, 1200),
        details: json || null,
      });
    }

    const text = extractText(json);

    return res.status(501).json({
      error:
        "Image output is not available for your Gemini API setup. This endpoint is running in TEXT-only mode.",
      model,
      promptSuggestion: text || null,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
