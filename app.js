const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatHistory = document.getElementById('chat-history');

// 🔑 ነፃ Gemini API Key እዚህ ያስገቡ (ከ https://aistudio.google.com/ ያግኙ)
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";

// ስለ እስልምና ብቻ እንዲመልስ የተደረገ መመሪያ
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

    // የተጠቃሚውን ጥያቄ አሳይ
    appendMessage(query, 'user-message');
    userInput.value = '';
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Loading አሳይ
    const loadingDiv = appendMessage('እየፈለገ ነው... እባክዎ ትንሽ ይጠብቁ', 'ai-message loading');

    try {
        // 1. የቁርአን ወይም ተፍሲር ጥያቄ ከሆነ ከ Quran API መፈለግ
        let extraContext = "";
        if (isQuranQuery(query)) {
            const quranData = await fetchQuranData(query);
            if (quranData) {
                extraContext = `\n[Fetched Quran Data: ${quranData}]`;
            }
        }

        // 2. API Key መኖሩን ማረጋገጥ
        if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
            loadingDiv.remove();
            appendMessage("⚠️ እባክዎን በ app.js ላይ ትክክለኛ Gemini API Key ያስገቡ!", 'ai-message');
            return;
        }

        // 3. ወደ Gemini AI ጥያቄ መላክ
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{ text: `${SYSTEM_PROMPT}\n${extraContext}\nUser Question: ${query}` }]
                }]
            })
        });

        const data = await response.json();
        loadingDiv.remove();

        if (data && data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            const reply = data.candidates[0].content.parts[0].text;
            appendMessage(reply, 'ai-message');
        } else {
            appendMessage("ይቅርታ፣ ከ AI መልስ ማግኘት አልተቻለም። እባክዎ API Keyዎን እና የኔትወርክ ግንኙነትዎን ያረጋግጡ።", 'ai-message');
        }

    } catch (err) {
        console.error(err);
        loadingDiv.remove();
        appendMessage("የኔትወርክ ችግር አጋጥሟል ወይም API Key ስህተት ነው።", 'ai-message');
    }

    chatHistory.scrollTop = chatHistory.scrollHeight;
});

// መልዕክት በገጹ ላይ ማሳያ
function appendMessage(text, className) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${className}`;
    msgDiv.innerHTML = text.replace(/\n/g, '<br>');
    chatHistory.appendChild(msgDiv);
    return msgDiv;
}

// የቁርአን ጥያቄ መሆኑን መለያ
function isQuranQuery(q) {
    const text = q.toLowerCase();
    return text.includes('ቁርአን') || text.includes('ቁርኣን') || text.includes('ተፍሲር') || 
           text.includes('ሱራ') || text.includes('አያት') || text.includes('quran') || 
           text.includes('tafseer') || text.includes('surah') || text.includes('aya');
}

// ነፃ የቁርአን API መፈለጊያ (Cloud/Public API)
async function fetchQuranData(query) {
    try {
        // ምሳሌ፡ ሱራ አል-ፋቲሃ ወይም የሱራ ቁጥር ከቀረበ
        const match = query.match(/\d+/);
        if (match) {
            const surahNum = match[0];
            const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/editions/quran-uthmani,en.sahih`);
            const data = await res.json();
            if (data && data.data) {
                return `Surah ${data.data[0].name} (${data.data[0].englishName})`;
            }
        }
    } catch (e) {
        console.log("Quran fetch error:", e);
    }
    return null;
}
