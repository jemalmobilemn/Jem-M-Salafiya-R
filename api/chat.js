export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { systemPrompt, userQuery } = req.body;

    const apiKey = process.env.GEMINI_API_KEY; // በ Vercel Environment Variable ውስጥ የሚቀመጥ

    if (!apiKey) {
        return res.status(500).json({ error: 'API key is missing' });
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: `${systemPrompt}\n\nUser Question: ${userQuery}` }
                        ]
                    }
                ]
            })
        });

        const data = await response.json();
        const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "ይቅርታ፣ መልስ ማግኘት አልተቻለም።";

        return res.status(200).json({ reply: aiReply });
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
