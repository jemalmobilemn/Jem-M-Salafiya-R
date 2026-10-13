
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("GROQ_API_KEY is missing.");

    return res.status(500).json({
      error:
        "GROQ_API_KEY is missing. Add it in Vercel Environment Variables."
    });
  }

  try {
    const body = req.body || {};
    const question = String(body.question || "").trim();

    const requestedLanguage = String(
      body.language || "English"
    );

    const languages = [
      "English",
      "Arabic",
      "Amharic",
      "Afaan Oromoo"
    ];

    const language = languages.includes(requestedLanguage)
      ? requestedLanguage
      : "English";

    if (!question) {
      return res.status(400).json({
        error: "Please enter your Islamic question."
      });
    }

    if (question.length > 6000) {
      return res.status(400).json({
        error: "Your question is too long. Please shorten it."
      });
    }

    const systemPrompt = `
You are Jem M Salafiya R AI, an Islamic educational assistant.

LANGUAGE:
Answer in ${language}.
Support English, Arabic, Amharic, and Afaan Oromoo.
When relevant, include Quran verses in Arabic and explain
their meanings in the requested language.

SCOPE:
Focus on Islam, the Quran, tafsir, Hadith, worship,
Islamic history, Islamic manners, and the Hijri calendar.
Politely explain your Islamic focus if asked unrelated questions.

ACCURACY:
- Never invent Quran verses, verse numbers, Hadith,
  references, or authenticity grades.
- Give sources only when reasonably confident they are correct.
- Distinguish Quran, Hadith, and scholarly interpretation.
- If uncertain, clearly say so.
- Do not present paraphrases as exact quotations.
- Explain recognized differences among scholars fairly.
- For complex personal religious rulings, recommend
  consulting a qualified scholar.
- Do not claim to have checked live sources unless a tool
  actually checked them.

STYLE:
Be respectful, clear, and helpful.
Use headings and short paragraphs when appropriate.
Do not claim to be a human scholar.
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
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
        "Groq API error:",
        response.status,
        result?.error?.message || "Unknown error"
      );

      let message =
        result?.error?.message ||
        "Groq API request failed. Check your API settings.";

      if (response.status === 401) {
        message =
          "Groq rejected the API key. Check GROQ_API_KEY.";
      } else if (response.status === 429) {
        message =
          "Groq rate limit or usage quota reached. Please wait and check your Groq limits.";
      }

      return res.status(502).json({
        error: message
      });
    }

    const answer =
      result?.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      return res.status(502).json({
        error: "Groq returned an empty answer. Please try again."
      });
    }

    return res.status(200).json({
      answer: answer
    });

  } catch (error) {
    console.error(
      "Jem AI server error:",
      error?.message || error
    );

    return res.status(500).json({
      error:
        "Server error. Please try again and check Vercel Runtime Logs."
    });
  }
};
