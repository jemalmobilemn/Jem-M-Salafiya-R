
module.exports = async function handler(req, res) {
  // Only accept POST requests.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  // Read the OpenAI key from Vercel Environment Variables.
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
    const requestedLanguage = String(body.language || "English");

    const supportedLanguages = [
      "English",
      "Arabic",
      "Amharic",
      "Afaan Oromoo"
    ];

    const language = supportedLanguages.includes(requestedLanguage)
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
Answer in ${language}. Support English, Arabic, Amharic, and Afaan Oromoo.
Use Arabic text for Quran verses when relevant, then explain their meaning
in the requested language.

SCOPE:
Focus on Islam, the Quran, tafsir, Hadith, Islamic worship, Islamic history,
Islamic manners, and the Hijri calendar. Politely explain that this assistant
focuses on Islamic topics if a question is unrelated.

ACCURACY:
- Never invent Quran verses, surah names, verse numbers, Hadith wording,
  references, authenticity grades, or quotations from scholars.
- Provide references only when reasonably confident they are correct.
- Distinguish Quran, Hadith, and scholarly interpretation.
- If uncertain, say so instead of guessing.
- For tafsir, identify the source when known and do not pretend a paraphrase
  is an exact quotation.
- Explain recognized differences among scholars fairly.
- Do not claim that every answer is a unanimous scholarly ruling.
- For complex personal fatwas, recommend consulting a qualified scholar.
- Do not claim to have checked a live database or external source unless
  a tool actually performed that check.

STYLE:
Be respectful, clear, and helpful. Use headings and short paragraphs
where appropriate. Do not claim to be a human scholar or religious authority.
`;

    const openAIResponse = await fetch(
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

    const result = await openAIResponse.json();

    if (!openAIResponse.ok) {
      console.error(
        "OpenAI request failed:",
        openAIResponse.status,
        result?.error?.message || "Unknown API error"
      );

      let errorMessage =
        result?.error?.message ||
        "The OpenAI request failed. Check your API settings.";

      if (openAIResponse.status === 401) {
        errorMessage =
          "OpenAI rejected the API key. Check that OPENAI_API_KEY is correct.";
      } else if (openAIResponse.status === 429) {
        errorMessage =
          "OpenAI API quota or rate limit reached. Check your API billing and usage.";
      } else if (openAIResponse.status === 400) {
        errorMessage =
          result?.error?.message ||
          "The request was rejected. Check the model and request settings.";
      }

      return res.status(502).json({
        error: errorMessage
      });
    }

    const answer =
      result?.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      console.error("OpenAI returned no message content.");

      return res.status(502).json({
        error: "The AI returned an empty answer. Please try again."
      });
    }

    return res.status(200).json({
      answer: answer
    });

  } catch (error) {
    console.error("Jem AI server error:", error?.message || error);

    return res.status(500).json({
      error:
        "A server error occurred. Please try again and check Vercel Runtime Logs if it continues."
    });
  }
};
