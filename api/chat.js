
const SYSTEM_PROMPT = `
You are Jem M Salafiya R AI, an Islamic-only assistant.
Answer only questions directly related to Islam, Quran,
Tafsir, Hadith, Aqeedah, Fiqh, worship, Islamic history,
Islamic manners and the Hijri calendar.

Politely refuse unrelated questions.
Reply in the language selected by the user.
Never invent Quran verses, Hadith, references or scholarly rulings.
Distinguish established sources from your own explanations.
When a reliable reference is unavailable, say so.
Respectfully explain recognized scholarly differences.
For serious religious rulings, recommend a qualified scholar.
`;

const LANGUAGES = [
  "English",
  "Arabic",
  "Amharic",
  "Afaan Oromoo"
];

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Use POST for Islamic questions."
    });
  }

  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is missing. Add it in Vercel Environment Variables."
    });
  }

  const question =
    typeof req.body?.question === "string"
      ? req.body.question.trim()
      : "";

  const language = LANGUAGES.includes(req.body?.language)
    ? req.body.language
    : "English";

  if (!question) {
    return res.status(400).json({
      error: "Please enter a question."
    });
  }

  if (question.length > 4000) {
    return res.status(400).json({
      error: "Question is too long."
    });
  }

  try {
    const upstream = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          max_tokens: 1200,
          messages: [
            {
              role: "system",
              content:
                SYSTEM_PROMPT +
                "\nThe user's selected language is " +
                language +
                ". Answer in that language."
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
      console.error("AI provider error:", {
        status: upstream.status,
        code: data.error?.code,
        type: data.error?.type,
        message: data.error?.message
      });

      if (upstream.status === 401) {
        return res.status(502).json({
          error: "API key is invalid or unauthorized. Check your Vercel OPENAI_API_KEY."
        });
      }

      if (upstream.status === 429) {
        return res.status(502).json({
          error: "API quota, credits, billing, or rate limit problem. Check your provider account."
        });
      }

      return res.status(502).json({
        error: "AI provider error (" + upstream.status + "). Check Vercel Runtime Logs for details."
      });
    }

    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(502).json({
        error: "The AI provider returned no answer."
      });
    }

    return res.status(200).json({ answer });
  } catch (error) {
    console.error("AI connection error:", error.message);

    return res.status(500).json({
      error: "Could not connect to the AI provider. Check server logs."
    });
  }
}
