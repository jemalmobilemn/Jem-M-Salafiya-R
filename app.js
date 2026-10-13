const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatHistory = document.getElementById('chat-history');
const themeToggle = document.getElementById('theme-toggle');

// Theme Toggle logic
if (themeToggle) {
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    themeToggle.addEventListener('click', () => {
        let theme = document.documentElement.getAttribute('data-theme');
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }
    });
}

// System Instruction for Islamic Scope
const ISLAMIC_SYSTEM_PROMPT = `
You are an Islamic AI Assistant named "Jem Salafiya AI".
Your ONLY purpose is to answer questions strictly related to Islam, Quran Tafseer, Hadith, Islamic jurisprudence (Fiqh), Islamic history, and Arabic/Amharic/Afaan Oromoo Islamic language context.

Rules:
1. You support queries in English, Arabic, Amharic (አማርኛ), and Afaan Oromoo.
2. Provide accurate references to Quranic Verses (Ayah) and authentic Tafseer (e.g., Ibn Kathir, Sa'di) when asked about Tafseer.
3. If a user asks non-Islamic questions (like coding, politics, general science, entertainment, sports), politely decline in the same language they asked.
   - Amharic decline: "ይቅርታ! እኔ የተዘጋጀሁት ስለ እስልምና፣ ቁርአን ተፍሲር እና ሐዲስ ብቻ ለመመለስ ነው፡፡"
   - Afaan Oromoo decline: "Dhiifama! An kan qophaa'e dhimmoota Islaamaa, Tafsiira Qur'aanaafi Hadiisa qofa deebisuuf."
   - Arabic decline: "عذراً، أنا مخصص فقط للإجابة على الأسئلة المتعلقة بالإسلام وتفسير القرآن الأحاديث."
   - English decline: "Sorry, I am specifically programmed to answer questions related to Islam, Quran Tafseer, and Hadith only."
`;

// Form submission handler
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;

    // Display user message
    appendMessage(text, 'user-message');
    userInput.value = '';
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Show loading state
    const loadingDiv = appendMessage('እየፈለገ ነው...', 'ai-message loading');

    try {
        // Here you call your Vercel Backend API (e.g. /api/chat)
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemPrompt: ISLAMIC_SYSTEM_PROMPT,
                userQuery: text
            })
        });

        const data = await response.json();
        loadingDiv.remove();

        if (data && data.reply) {
            appendMessage(data.reply, 'ai-message');
        } else {
            // Fallback rule if API is not yet connected
            const localReply = handleLocalIslamicFilter(text);
            appendMessage(localReply, 'ai-message');
        }
    } catch (error) {
        loadingDiv.remove();
        // Temporary offline/demo logic
        const localReply = handleLocalIslamicFilter(text);
        appendMessage(localReply, 'ai-message');
    }

    chatHistory.scrollTop = chatHistory.scrollHeight;
});

function appendMessage(text, className) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    messageDiv.textContent = text;
    chatHistory.appendChild(messageDiv);
    return messageDiv;
}

// Client-side rule check for preview/demo
function handleLocalIslamicFilter(query) {
    const q = query.toLowerCase();
    
    // Islamic keywords detector
    const islamicKeywords = [
        'ቁርአን', 'ቁርኣን', 'ተፍሲር', 'ሐዲስ', 'ሀዲስ', 'ሱራ', 'አያት', 'ሶላት', 'ሰላት', 'ዘካ', 'ሀጅ', 'ኢስላም', 'ነቢ', 'አላህ', 'መልእክተኛ',
        'quran', 'tafseer', 'tafsir', 'hadith', 'surah', 'ayah', 'namaz', 'solat', 'zakat', 'hajj', 'islam', 'prophet', 'allah',
        'qur\'aana', 'tafsiira', 'hadiisa', 'suuraa', 'keeyyata', 'sallaata', 'zakaa', 'hajji', 'islaama', 'ergamaa',
        'قرآن', 'تفسير', 'حديث', 'سورة', 'آية', 'صلاة', 'زكاة', 'حج', 'إسلام', 'الله', 'رسول'
    ];

    const isIslamic = islamicKeywords.some(keyword => q.includes(keyword));

    if (!isIslamic) {
        if (/[\u1200-\u137F]/.test(query)) {
            return "ይቅርታ! እኔ የተዘጋጀሁት ስለ እስልምና፣ ቁርአን ተፍሲር እና ሐዲስ ብቻ ለመመለስ ነው፡፡ እባክዎን ከእስልምና ጋር የተያያዘ ጥያቄ ይጠይቁ።";
        } else if (q.includes('dhiifama') || q.includes('fayyaa') || q.includes('akkam')) {
            return "Dhiifama! An kan qophaa'e dhimmoota Islaamaa, Tafsiira Qur'aanaafi Hadiisa qofa deebisuuf.";
        } else {
            return "Sorry, I am programmed to answer questions strictly related to Islam, Quran Tafseer, and Hadith only.";
        }
    }

    return `የቀረበው ጥያቄ፦ "${query}"\n\n(ማስታወሻ፦ ከ API/Gemini key ጋር ሲያገናኙት የቁርአን ተፍሲር እና አያቶችን በ4ቱ ቋንቋዎች በዝርዝር ያመጣልዎታል!)`;
}
