
const MODEL = "gemini-2.5-flash";

const SYSTEM_INSTRUCTION = `
You are Jem Salafiya AI, an Islamic educational assistant.
Answer in the language requested by the user: Amharic, Afaan Oromo,
Arabic, or English. Be respectful, clear, and helpful.

For Quran questions, distinguish the Arabic verse from its translation
and explain the meaning carefully. Never invent Quran verses, hadith,
references, or authenticity grades. If you cannot verify a source,
say so clearly. Explain differences of scholarly opinion fairly.
Do not claim to be a mufti. For complex religious rulings, advise the
user to consult a qualified scholar. Do not fabricate citations.
`;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed. Send a POST request."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY environment variable");
    return res.status(500).json({
      error: "Server setup error",
      details: "GEMINI_API_KEY is missing in Vercel Environment Variables."
    });
  }

  try {
    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          error: "Invalid JSON request body."
        });
      }
    }

    if (!body || typeof body !== "object") {
      return res.status(400).json({
        error: "Request body must be a JSON object."
      });
    }

    const question = String(
      body.message || body.prompt || body.question || ""
    ).trim();

    if (!question) {
      return res.status(400).json({
        error: "Please enter a question."
      });
    }

    if (question.length > 6000) {
      return res.status(413).json({
        error: "Question is too long. Please shorten it."
      });
    }

    const languageNames = {
      am: "Amharic",
      om: "Afaan Oromo",
      ar: "Arabic",
      en: "English"
    };

    const language = languageNames[body.language] || "the user's language";

    const history = Array.isArray(body.history) ? body.history : [];
    const contents = [];

    for (const item of history.slice(-12)) {
      if (!item || typeof item !== "object") continue;

      const role = item.role === "assistant" || item.role === "model"
        ? "model"
        : item.role === "user"
          ? "user"
          : null;

      const text = String(item.content || item.text || "").trim();

      if (role && text) {
        contents.push({
          role,
          parts: [{ text: text.slice(0, 6000) }]
        });
      }
    }

    contents.push({
      role: "user",
      parts: [{
        text: `Answer in ${language}.\n\nUser question:\n${question}`
      }]
    });

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1800
        }
      })
    });

    const raw = await upstream.text();
    let result = {};

    try {
      result = raw ? JSON.parse(raw) : {};
    } catch {
      result = {};
    }

    if (!upstream.ok) {
      const providerMessage =
        result?.error?.message || `Gemini returned HTTP ${upstream.status}`;

      // Never log or return the API key.
      console.error("Gemini API request failed:", {
        status: upstream.status,
        message: providerMessage
      });

      const status = [400, 401, 403, 404, 429].includes(upstream.status)
        ? upstream.status
        : 502;

      return res.status(status).json({
        error: "Gemini API request failed.",
        details: providerMessage
      });
    }

    const answer = (result?.candidates?.[0]?.content?.parts || [])
      .map((part) => typeof part.text === "string" ? part.text : "")
      .join("")
      .trim();

    if (!answer) {
      console.error("Gemini returned no text:", {
        finishReason: result?.candidates?.[0]?.finishReason || "unknown"
      });

      return res.status(502).json({
        error: "Gemini returned no answer.",
        details: "Try again with a shorter question."
      });
    }

    return res.status(200).json({
      success: true,
      reply: answer,
      answer
    });
  } catch (error) {
    console.error("Chat handler exception:", error?.message || error);

    return res.status(500).json({
      error: "The chat server encountered an error.",
      details: "Check Vercel Runtime Logs for the server error."
    });
  }
}
