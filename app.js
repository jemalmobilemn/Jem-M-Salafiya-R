const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatHistory = document.getElementById('chat-history');
const themeToggle = document.getElementById('theme-toggle');

// Theme Management
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

// Chat Handling
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;

    // Append User Message
    appendMessage(text, 'user-message');
    userInput.value = '';
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Simulate AI Response (ወይም ወደ api/ ፎልደርዎ ማገናኘት ከፈለጉ እዚህ ማስተካከል ይቻላል)
    setTimeout(() => {
        const aiResponse = generateAIResponse(text);
        appendMessage(aiResponse, 'ai-message');
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }, 600);
});

function appendMessage(text, className) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    messageDiv.textContent = text;
    chatHistory.appendChild(messageDiv);
}

function generateAIResponse(query) {
    const q = query.toLowerCase();
    if (q.includes('ሰላም') || q.includes('hi') || q.includes('hello')) {
        nameMsg = "ሰላም!እንዴት ልረዳዎ?";
        return nameMsg;
    } else if (q.includes('ማን ነህ') || q.includes('who are you')) {
        return "እኔ Jem Salafiya AI ስሆን በ Jemal Abdur የተዘጋጀሁ ረዳት ነኝ።";
    } else {
        return `የሰጡትን መልዕክት ተቀብያለሁ: "${query}"። Vercel ላይ በደንብ እየሰራ ይገኛል!`;
    }
}
