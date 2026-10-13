
module.exports = async function handler(req, res) {
  // Allow POST requests only.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  // Read the OpenAI API key from Vercel.
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("OPENAI_API_KEY is not configured.");

    return res.status(500).json({
      error:
        "OPENAI_API_KEY is missing. Add it in Vercel Settings > Environment Variables."
    });
  }

  try {
    const body = req.body || {};

    const question = String(body.question || "").trim();
    const requestedLanguage = String(
      body.language || "English"
    ).trim();

    const supportedLanguages = [
      "English",
      "Arabic",
      "Amharic",
      "Afaan Oromoo"
    ];

    const language = supportedLanguages.includes(
      requestedLanguage
    )
      ? requestedLanguage
      : "English";

    if (!question) {
      return res.status(400).json({
        error: "Please enter your Islamic question."
      });
    }

    if (question.length > 6000) {
      return res.status(400).json({
        error:
          "Your question is too long. Please shorten it."
      });
    }

    const systemPrompt = `
You are Jem M Salafiya R AI, an Islamic educational assistant.

LANGUAGES:
Answer in ${language}.
Support English, Arabic, Amharic, and Afaan Oromoo.
When relevant, provide the Quran verse in Arabic and
explain its meaning in the requested language.

ISLAMIC SCOPE:
Focus on the Quran, Tafsir, Hadith, Islamic worship,
Islamic history, Islamic manners, Fiqh, and the Hijri calendar.
If asked about unrelated topics, politely explain that
your main purpose is Islamic education.

ACCURACY AND SOURCES:
- Never invent Quran verses, verse numbers, Hadith wording,
  book references, or Hadith authenticity grades.
- Give sources only when reasonably confident they are correct.
- Clearly distinguish Quran, Hadith, and scholarly opinions.
- Do not present a paraphrase as an exact quotation.
- If uncertain, say so instead of guessing.
- Explain recognized scholarly differences fairly.
- Do not claim a ruling is unanimous unless confident.
- For complex personal fatwas, recommend consulting a
  qualified Islamic scholar.
- Do not claim to have searched a live database when you have not.

RESPONSE STYLE:
Be respectful, clear, and helpful.
Use headings and short paragraphs when useful.
For Quran explanations, include the Surah and verse number
when known, Arabic text when relevant, and an explanation
in the requested language.
Do not claim to be a human scholar or religious authority.
`;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: question
            }
          ],
          temperature: 0.3,
          max_tokens: 1800
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error(
        "OpenAI API error:",
        response.status,
        result?.error?.message || "Unknown API error"
      );

      if (response.status === 401) {
        return res.status(502).json({
          error:
            "OpenAI rejected the API key. Check OPENAI_API_KEY in Vercel."
        });
      }

      if (response.status === 429) {
        return res.status(502).json({
          error:
            "OpenAI API quota or rate limit reached. Check your API billing, usage, and rate limits."
        });
      }

      if (response.status === 400) {
        return res.status(502).json({
          error:
            result?.error?.message ||
            "OpenAI rejected the request. Check the model and request settings."
        });
      }

      return res.status(502).json({
        error:
          "OpenAI API request failed. Check Vercel Runtime Logs."
      });
    }

    const answer =
      result?.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      console.error("OpenAI returned an empty answer.");

      return res.status(502).json({
        error:
          "The AI returned an empty answer. Please try again."
      });
    }

    return res.status(200).json({
      answer: answer
    });

  } catch (error) {
    console.error(
      "Jem M Salafiya R AI server error:",
      error?.message || error
    );

    return res.status(500).json({
      error:
        "A server error occurred. Please try again and check Vercel Runtime Logs."
    });
  }
};
