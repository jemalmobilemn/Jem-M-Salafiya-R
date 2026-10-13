
const $ = (id) => document.getElementById(id);

const form = $("chatForm");
const input = $("messageInput");
const chat = $("chat");
const sendButton = $("sendButton");
const statusBox = $("status");
const languageSelect = $("language");

let history = [];
let busy = false;

const translations = {
  am: {
    subtitle: "የእስልምና ትምህርት ረዳት",
    title: "አሰላሙ ዐለይኩም!",
    welcome: "ስለ ቁርአን፣ ተፍሲር፣ ሐዲስ እና እስላማዊ ትምህርት ይጠይቁ።",
    first: "እንኳን ደህና መጡ። ጥያቄዎን ከታች ይጻፉ።",
    placeholder: "ጥያቄዎን እዚህ ይጻፉ...",
    clear: "ውይይቱን አጽዳ",
    footer: "የAI መልሶችን ከታማኝ የእስልምና ምንጮች ጋር ያረጋግጡ።",
    user: "እርስዎ",
    thinking: "መልስ እያዘጋጀ ነው...",
    empty: "እባክዎ ጥያቄ ይጻፉ።",
    failed: "መልስ ማግኘት አልተቻለም።"
  },
  om: {
    subtitle: "Gargaaraa barnoota Islaamaa",
    title: "Assalaamu alaykum!",
    welcome: "Waa'ee Qur'aanaa, tafsiiraa, hadiisaa fi barnoota Islaamaa gaafadhu.",
    first: "Baga nagaan dhuftan. Gaaffii keessan asitti barreessaa.",
    placeholder: "Gaaffii keessan barreessaa...",
    clear: "Mari'icha qulqulleessi",
    footer: "Deebii AI madda Islaamaa amanamaa irraa mirkaneeffadhaa.",
    user: "Ati",
    thinking: "Deebii qopheessaa jira...",
    empty: "Maaloo gaaffii barreessaa.",
    failed: "Deebii argachuun hin danda'amne."
  },
  ar: {
    subtitle: "مساعد للتعلم الإسلامي",
    title: "السلام عليكم!",
    welcome: "اسأل عن القرآن والتفسير والحديث والتعليم الإسلامي.",
    first: "أهلاً وسهلاً. اكتب سؤالك هنا.",
    placeholder: "اكتب سؤالك هنا...",
    clear: "مسح المحادثة",
    footer: "تحقق من إجابات الذكاء الاصطناعي من مصادر إسلامية موثوقة.",
    user: "أنت",
    thinking: "جارٍ إعداد الإجابة...",
    empty: "يرجى كتابة سؤال.",
    failed: "تعذر الحصول على إجابة."
  },
  en: {
    subtitle: "Islamic Learning Assistant",
    title: "Assalamu Alaikum!",
    welcome: "Ask about the Quran, Tafsir, Hadith, and Islamic learning.",
    first: "Welcome. Write your question below.",
    placeholder: "Write your question here...",
    clear: "Clear chat",
    footer: "Verify AI answers against reliable Islamic sources.",
    user: "You",
    thinking: "Preparing an answer...",
    empty: "Please write a question.",
    failed: "Could not get an answer."
  }
};

function lang() {
  return translations[languageSelect.value] || translations.am;
}

function setStatus(text, error = false) {
  statusBox.textContent = text || "";
  statusBox.classList.toggle("error", error);
}

function addMessage(role, text) {
  const row = document.createElement("div");
  row.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "●" : "☪";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const name = document.createElement("strong");
  name.textContent = role === "user" ? lang().user : "Jem Salafiya AI";

  const p = document.createElement("p");
  p.textContent = text;

  bubble.append(name, p);
  row.append(avatar, bubble);
  chat.appendChild(row);
  row.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function updateLanguage() {
  const t = lang();
  document.documentElement.lang = languageSelect.value;
  $("subtitle").textContent = t.subtitle;
  $("welcomeTitle").textContent = t.title;
  $("welcomeText").textContent = t.welcome;
  $("firstMessage").textContent = t.first;
  input.placeholder = t.placeholder;
  $("clearButton").textContent = t.clear;
  $("footerText").textContent = t.footer;
}

languageSelect.addEventListener("change", updateLanguage);

document.querySelectorAll(".suggestion").forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.dataset.question || "";
    input.focus();
  });
});

$("clearButton").addEventListener("click", () => {
  if (busy) return;
  history = [];
  chat.replaceChildren();
  addMessage("assistant", lang().first);
  setStatus("");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;

  const question = input.value.trim();
  if (!question) {
    setStatus(lang().empty, true);
    return;
  }

  busy = true;
  sendButton.disabled = true;
  input.disabled = true;
  setStatus(lang().thinking);
  addMessage("user", question);
  input.value = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: question,
        history: history.slice(-12),
        language: languageSelect.value
      })
    });

    const raw = await response.text();
    let data;

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(`Server returned an invalid response (HTTP ${response.status}).`);
    }

    if (!response.ok) {
      const details = data.details || data.error || `HTTP ${response.status}`;
      throw new Error(`${details} (HTTP ${response.status})`);
    }

    const answer = data.reply || data.answer || data.response || data.text;
    if (typeof answer !== "string" || !answer.trim()) {
      throw new Error("No answer returned by the API.");
    }

    addMessage("assistant", answer);
    history.push(
      { role: "user", content: question },
      { role: "assistant", content: answer }
    );
    history = history.slice(-12);
    setStatus("");
  } catch (error) {
    console.error("Jem Salafiya AI error:", error);
    const message = error?.message || "Check your connection and try again.";
    addMessage("assistant", `${lang().failed}\n${message}`);
    setStatus(message, true);
  } finally {
    busy = false;
    sendButton.disabled = false;
    input.disabled = false;
    input.focus();
  }
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

updateLanguage();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
