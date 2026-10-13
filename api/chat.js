
export default async function handler(req, res) {
  // Allow POST requests only
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed. Please use POST."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY environment variable.");

    return res.status(500).json({
      error: "AI service is not configured. Please contact the administrator."
    });
  }

  try {
    const body = req.body || {};

    // Support common chat request formats
    const messages = Array.isArray(body.messages)
      ? body.messages
      : Array.isArray(body.history)
        ? body.history
        : typeof body.message === "string"
          ? [{ role: "user", content: body.message }]
          : typeof body.prompt === "string"
            ? [{ role: "user", content: body.prompt }]
            : [];

    if (messages.length === 0) {
      return res.status(400).json({
        error: "Please provide a message or messages array."
      });
    }

    // Convert common chat formats into Gemini format
    const contents = messages
      .filter((m) => m && typeof m === "object")
      .map((m) => {
        const role = m.role === "assistant" || m.role === "model"
          ? "model"
          : "user";

        let text = "";

        if (typeof m.content === "string") {
          text = m.content;
        } else if (typeof m.text === "string") {
          text = m.text;
        } else if (Array.isArray(m.parts)) {
          text = m.parts
            .filter((p) => p && typeof p.text === "string")
            .map((p) => p.text)
            .join("\n");
        }

        return {
          role,
          parts: [{ text }]
        };
      })
      .filter((m) => m.parts[0].text.trim().length > 0);

    if (contents.length === 0) {
      return res.status(400).json({
        error: "Your message is empty."
      });
    }

    // Avoid sending an assistant/model message as the first turn
    while (contents.length > 0 && contents[0].role === "model") {
      contents.shift();
    }

    if (contents.length === 0) {
      return res.status(400).json({
        error: "Please send a user message."
      });
    }

    const systemInstruction = {
      parts: [{
        text: `
You are Jem Salafiya AI, an Islamic educational assistant.

PURPOSE:
Help users learn Islam using the Quran, authentic Hadith,
and reliable explanations from recognized Islamic scholarship.

LANGUAGES:
Answer in the language used by the user, including Amharic,
Afaan Oromo, Arabic, and English. If asked, provide Arabic
text together with Amharic or Afaan Oromo translation.

ISLAMIC ACCURACY:
- Never invent Quran verses or Hadith.
- Give the Surah name and verse number when quoting the Quran.
- Give the Hadith collection and reference when known.
- Do not claim a Hadith is authentic unless its grading is known.
- Distinguish a direct quotation from a translation or explanation.
- When scholarly opinions differ, explain the difference fairly.
- If uncertain, say so rather than inventing an answer.
- Do not present yourself as a mufti or a substitute for qualified scholars.

TAFSIR:
When explaining a verse, provide the Arabic verse if known,
its meaning, a clear explanation, and the Surah and verse number.
Do not fabricate Arabic text or religious citations.

STYLE:
Be respectful, clear, helpful, and easy to understand.
Use headings and numbered steps when they help.
        `.trim()
      }]
    };

    // Use a currently supported Gemini model.
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
      // Log diagnostic details, but never log the API key.
      console.error("Gemini API error:", {
        status: response.status,
        message: data?.error?.message || "Unknown Gemini error"
      });

      if (response.status === 429) {
        return res.status(429).json({
          error: "AI usage limit reached. Please try again later or check your Gemini API quota."
        });
      }

      if (response.status === 400 || response.status === 403) {
        return res.status(response.status).json({
          error: "Gemini rejected the request. Check your API key, model availability, and API access settings."
        });
      }

      return res.status(502).json({
        error: "The AI provider could not complete your request. Please try again."
      });
    }

    const answer = (data?.candidates?.[0]?.content?.parts || [])
      .map((part) => part.text || "")
      .join("\n")
      .trim();

    if (!answer) {
      return res.status(502).json({
        error: "The AI returned no text. Please try asking again."
      });
    }

    // Provide common response fields for frontend compatibility.
    return res.status(200).json({
      reply: answer,
      answer: answer,
      response: answer,
      text: answer,
      message: answer
    });
  } catch (error) {
    console.error("Chat handler error:", error?.message || "Unknown error");

    return res.status(500).json({
      error: "An unexpected server error occurred. Please try again."
    });
  }
}
