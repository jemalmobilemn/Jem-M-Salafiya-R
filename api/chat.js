
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed. Use POST."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in Vercel Environment Variables.");

    return res.status(500).json({
      error: "GEMINI_API_KEY is missing. Check Vercel Environment Variables."
    });
  }

  try {
    // Accept a parsed JSON body or a JSON string.
    let body = req.body || {};

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          error: "Request body must be valid JSON."
        });
      }
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({
        error: "Request body must be a JSON object."
      });
    }

    // Accept common frontend request formats.
    let messages = [];

    if (Array.isArray(body.messages)) {
      messages = body.messages;
    } else if (Array.isArray(body.history)) {
      messages = body.history;
    } else {
      const possibleMessage =
        body.message ??
        body.prompt ??
        body.question ??
        body.input ??
        body.text ??
        body.content;

      if (typeof possibleMessage === "string") {
        messages = [{
          role: "user",
          content: possibleMessage
        }];
      } else if (
        possibleMessage &&
        typeof possibleMessage === "object"
      ) {
        messages = [possibleMessage];
      }
    }

    // Convert messages to Gemini conversation format.
    const contents = [];

    for (const item of messages) {
      if (!item || typeof item !== "object") continue;

      const role =
        item.role === "assistant" ||
        item.role === "model"
          ? "model"
          : "user";

      let messageText = "";

      if (typeof item.content === "string") {
        messageText = item.content;
      } else if (typeof item.text === "string") {
        messageText = item.text;
      } else if (typeof item.message === "string") {
        messageText = item.message;
      } else if (Array.isArray(item.parts)) {
        messageText = item.parts
          .filter((part) => typeof part?.text === "string")
          .map((part) => part.text)
          .join("\n");
      } else if (Array.isArray(item.content)) {
        messageText = item.content
          .filter((part) => typeof part?.text === "string")
          .map((part) => part.text)
          .join("\n");
      }

      if (messageText.trim()) {
        contents.push({
          role,
          parts: [{ text: messageText.trim() }]
        });
      }
    }

    // A conversation must start with a user message.
    while (contents.length && contents[0].role === "model") {
      contents.shift();
    }

    if (!contents.length) {
      console.error("Empty chat request. Received body keys:", Object.keys(body));

      return res.status(400).json({
        error: "No message found in request.",
        hint: "Send {message: 'your question'}, {prompt: 'your question'}, or {messages: [{role: 'user', content: 'your question'}]}."
      });
    }

    const systemInstruction = {
      parts: [{
        text: `
You are Jem Salafiya AI, an Islamic educational assistant.

LANGUAGES:
Respond in the language the user prefers, including Amharic,
Afaan Oromo, Arabic, and English.

ISLAMIC KNOWLEDGE:
- Explain the Quran, Tafsir, Hadith, worship, and Islamic manners.
- Give Quran Surah names and verse numbers when known.
- Give Hadith collection, reference, and authenticity grading
  only when you can identify them reliably.
- Never invent Quran verses, Arabic quotations, Hadith, or references.
- Distinguish translations from the original Arabic.
- Explain differences between scholarly opinions fairly.
- Admit uncertainty when you cannot verify a religious claim.
- Do not claim to be a qualified Mufti.

STYLE:
Be respectful, helpful, and clear.
Use headings and examples when useful.
        `.trim()
      }]
    };

    const model = "gemini-2.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction,
          contents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const providerMessage =
        data?.error?.message || "Unknown Gemini API error";

      // Never print or return the API key.
      console.error("Gemini API request failed:", {
        status: response.status,
        message: providerMessage
      });

      const status =
        response.status === 429 ? 429 :
        response.status === 400 ? 502 :
        response.status === 401 || response.status === 403 ? 502 :
        502;

      return res.status(status).json({
        error: "Gemini API request failed.",
        details: providerMessage
      });
    }

    const answer = (
      data?.candidates?.[0]?.content?.parts || []
    )
      .map((part) => part.text || "")
      .join("\n")
      .trim();

    if (!answer) {
      console.error("Gemini returned no text:", {
        finishReason: data?.candidates?.[0]?.finishReason,
        feedback: data?.promptFeedback
      });

      return res.status(502).json({
        error: "Gemini returned no text. Try another question."
      });
    }

    // Return multiple common fields for frontend compatibility.
    return res.status(200).json({
      reply: answer,
      answer,
      response: answer,
      text: answer,
      message: answer,
      success: true
    });

  } catch (error) {
    console.error("Chat handler exception:", error?.message || error);

    return res.status(500).json({
      error: "Internal server error.",
      details: error?.message || "Unknown server error."
    });
  }
}
