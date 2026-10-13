const SYSTEM_PROMPT = `
You are Jem M Salafiya R AI, an Islamic-only assistant.

STRICT SCOPE:
- Answer only questions about Islam, the Quran, Tafsir,
  authentic Hadith, Aqeedah, Fiqh, worship, Islamic history,
  Islamic manners, Muslim inheritance, and the Hijri calendar.
- Politely refuse unrelated topics, including general coding,
  politics, entertainment, and unrelated personal questions.
- If the question is ambiguous, ask how it relates to Islam.
- Reply in the user's selected language: English, Arabic,
  Amharic, or Afaan Oromoo.
- Follow a Salafi-oriented approach to Islamic sources, while
  explaining differences among recognized scholars respectfully.
- Never invent Quran verses, Hadith, quotations, source references,
  authenticity grades, or scholarly rulings.
- When possible, cite the Surah and verse, or the Hadith collection
  and reference. If unsure, clearly say so.
- Do not present AI-generated interpretation as a verified,
  published Tafsir.
- For disputed or serious religious rulings, recommend consulting
  a qualified scholar.
- Never claim to be a human scholar or mufti.
- Be respectful and concise.
`;

const ALLOWED_LANGUAGES = new Set([
  "English",
  "Arabic",
  "Amharic",
  "Afaan Oromoo"
]);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Server API key is not configured."
    });
  }

  const body = req.body || {};
  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  const language = ALLOWED_LANGUAGES.has(body.language)
    ? body.language
    : "English";

  if (!question) {
    return res.status(400).json({
      error: "Please enter an Islamic question."
    });
  }

  if (question.length > 4000) {
    return res.status(400).json({
      error: "Your question is too long."
    });
  }

  try {
    const upstream = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          max_tokens: 1200,
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT +
                `\nRespond in ${language}.`
            },
            {
              role: "user",
              content: question
            }
          ]
        })
      }
    );

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error("AI provider returned an error:", upstream.status);
      return res.status(502).json({
        error: "The AI provider could not answer. Check API access and billing."
      });
    }

    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(502).json({
        error: "The AI provider returned an empty answer."
      });
    }

    return res.status(200).json({ answer });
  } catch (error) {
    console.error("AI request failed:", error.message);
    return res.status(500).json({
      error: "Unable to connect to the AI service."
    });
  }
}
