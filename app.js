const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatHistory = document.getElementById('chat-history');

// 🔑 እባክዎን የራስዎን ትክክለኛ የ Gemini API Key ከ https://aistudio.google.com/ አምጥተው እዚህ ጋር ያስገቡ
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";

const SYSTEM_PROMPT = `
You are "Jem Salafiya AI", a specialized Islamic Knowledge Assistant.
Your ONLY purpose is to answer questions strictly related to Islam, Quran Tafseer, Hadith, Fiqh, Islamic History, and Islamic terms in Amharic (አማርኛ), Afaan Oromoo, Arabic (العربية), and English.

Strict Rules:
1. If the query is about Islam, Quran, Hadith, or Tafseer, answer accurately with references.
2. If the user asks non-Islamic questions (like coding, sports, general politics), politely decline in the query's language:
   - Amharic: "ይቅርታ! እኔ የተዘጋጀሁት ስለ እስልምና፣ ቁርአን ተፍሲር እና ሐዲስ ብቻ ለመመለስ ነው፡፡"
   - Afaan Oromoo: "Dhiifama! An kan qophaa'e dhimmoota Islaamaa, Tafsiira Qur'aanaafi Hadiisa qofa deebisuuf."
   - Arabic: "عذراً، أنا مخصص فقط للإجابة على الأسئلة المتعلقة بالإسلام وتفسير القرآن والأحاديث."
   - English: "Sorry, I am programmed to answer questions strictly related to Islam, Quran Tafseer, and Hadith only."
`;

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = userInput.value.trim();
    if (!query) return;

    // የተጠቃሚውን ጥያቄ በቻቱ ላይ አሳይ
    appendMessage(query, 'user-message');
    userInput.value = '';
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // የመጫን (Loading) ሁኔታን አሳይ
    const loadingDiv = appendMessage('እየፈለገ ነው... እባክዎ ትንሽ ይጠብቁ', 'ai-message');

    try {
        if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
            loadingDiv.textContent = "⚠️ እባክዎን በ app.js ፋይል ውስጥ ትክክለኛ የ Gemini API Key ያስገቡ!";
            return;
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{ text: `${SYSTEM_PROMPT}\n\nUser Question: ${query}` }]
                }]
            })
        });

        const data = await response.json();
        loadingDiv.remove();

        if (data && data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            const reply = data.candidates[0].content.parts[0].text;
            appendMessage(reply, 'ai-message');
        } else {
            appendMessage("ይቅርታ፣ ከ AI መልስ ማግኘት አልተቻለም። እባክዎ API Keyዎን ያረጋግጡ።", 'ai-message');
        }

    } catch (err) {
        console.error(err);
        loadingDiv.remove();
        appendMessage("የኔትወርክ ችግር አጋጥሟል ወይም API Key ስህተት ነው።", 'ai-message');
    }

    chatHistory.scrollTop = chatHistory.scrollHeight;
});

function appendMessage(text, className) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${className}`;
    // Markdown bold ምልክቶችን እና መስመር መቀየሪያዎችን አስተካክሎ እንዲያሳይ
    msgDiv.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
    chatHistory.appendChild(msgDiv);
    return msgDiv;
}
