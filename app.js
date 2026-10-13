const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatHistory = document.getElementById('chat-history');

// 🔑 የ እርስዎን Gemini API Key እዚህ ቦታ ላይ ያስገቡ
const API_KEY = "YOUR_GEMINI_API_KEY";

// ስለ እስልምና ብቻ እንዲመልስ የተደረገ መመሪያ (System Instruction)
const SYSTEM_PROMPT = `
You are an Islamic AI Assistant named "Jem Salafiya AI".
Your ONLY purpose is to answer questions strictly related to Islam, Quran Tafseer, Hadith, Islamic jurisprudence (Fiqh), Islamic history, and Arabic/Amharic/Afaan Oromoo Islamic context.

Rules:
1. Support English, Arabic, Amharic (አማርኛ), and Afaan Oromoo.
2. Provide accurate references to Quranic Verses (Ayah) and authentic Tafseer.
3. If the user asks non-Islamic questions (politics, coding, sports, general topics), politely decline:
   - Amharic: "ይቅርታ! እኔ የተዘጋጀሁት ስለ እስልምና፣ ቁርአን ተፍሲር እና ሐዲስ ብቻ ለመመለስ ነው፡፡"
   - Afaan Oromoo: "Dhiifama! An kan qophaa'e dhimmoota Islaamaa, Tafsiira Qur'aanaafi Hadiisa qofa deebisuuf."
   - Arabic: "عذراً، أنا مخصص فقط للإجابة على الأسئلة المتعلقة بالإسلام وتفسير القرآن والأحاديث."
   - English: "Sorry, I am programmed to answer questions strictly related to Islam, Quran Tafseer, and Hadith only."
`;

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = userInput.value.trim();
    if (!query) return;

    // የተጠቃሚውን መልዕክት አሳይ
    appendMessage(query, 'user-message');
    userInput.value = '';
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Loading አሳይ
    const loadingMessage = appendMessage('እየፈለገ ነው...', 'ai-message loading');

    try {
        if (API_KEY === "YOUR_GEMINI_API_KEY" || !API_KEY) {
            loadingMessage.remove();
            appendMessage("⚠️ እባክዎን በ app.js ላይ ትክክለኛ Gemini API Key ያስገቡ!", 'ai-message');
            return;
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: `${SYSTEM_PROMPT}\n\nUser Question: ${query}` }]
                    }
                ]
            })
        });

        const data = await response.json();
        loadingMessage.remove();

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const aiReply = data.candidates[0].content.parts[0].text;
            appendMessage(aiReply, 'ai-message');
        } else {
            appendMessage("ይቅርታ፣ መልስ ማግኘት አልተቻለም። እባክዎ ድጋሚ ይሞክሩ።", 'ai-message');
        }
    } catch (error) {
        loadingMessage.remove();
        appendMessage("የኔትወርክ ችግር አጋጥሟል ወይም API Key ስህተት ነው።", 'ai-message');
    }

    chatHistory.scrollTop = chatHistory.scrollHeight;
});

function appendMessage(text, className) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    messageDiv.innerText = text;
    chatHistory.appendChild(messageDiv);
    return messageDiv;
}
