const $ = (id) => document.getElementById(id);

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) =>
      b.classList.remove("active")
    );
    document.querySelectorAll(".page").forEach((p) =>
      p.classList.remove("active")
    );

    button.classList.add("active");
    $(button.dataset.page).classList.add("active");
  });
});

function addMessage(text, type = "bot") {
  const div = document.createElement("div");
  div.className = `bubble ${type}`;
  div.textContent = text;
  $("chatMessages").appendChild(div);
  $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
}

$("chatForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = $("question").value.trim();
  const language = $("language").value;

  if (!question) return;

  addMessage(question, "user");
  $("question").value = "";
  $("sendBtn").disabled = true;
  $("sendBtn").textContent = "Please wait...";

  const loading = document.createElement("div");
  loading.className = "bubble bot";
  loading.textContent = "Preparing your answer...";
  $("chatMessages").appendChild(loading);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, language })
    });

    const data = await response.json();

    loading.remove();

    if (!response.ok) {
      throw new Error(data.error || "The AI service is unavailable.");
    }

    addMessage(data.answer || "No answer was returned.");
  } catch (error) {
    loading.remove();
    addMessage(
      "Sorry, the service could not respond. Check your internet, API key and deployment settings.\n" +
      error.message
    );
  } finally {
    $("sendBtn").disabled = false;
    $("sendBtn").textContent = "Send Question";
  }
});

// Load the available Surahs and Arabic Quran text.
async function loadSurahList() {
  try {
    const response = await fetch("https://api.alquran.cloud/v1/surah");
    if (!response.ok) throw new Error("Could not load Surahs");

    const result = await response.json();
    const select = $("surahSelect");
    select.replaceChildren();

    result.data.forEach((surah) => {
      const option = document.createElement("option");
      option.value = surah.number;
      option.textContent =
        `${surah.number}. ${surah.englishName} — ${surah.name}`;
      select.appendChild(option);
    });

    await loadSurah();
  } catch {
    $("quranContent").textContent =
      "Unable to load Quran data. Please check your internet connection.";
  }
}

async function loadSurah() {
  const number = $("surahSelect").value;
  const content = $("quranContent");
  content.textContent = "Loading Quran...";

  try {
    const response = await fetch(
      `https://api.alquran.cloud/v1/surah/${encodeURIComponent(number)}`
    );
    if (!response.ok) throw new Error("Quran request failed");

    const result = await response.json();
    const fragment = document.createDocumentFragment();

    result.data.ayahs.forEach((ayah) => {
      const card = document.createElement("article");
      card.className = "ayah";

      const arabic = document.createElement("div");
      arabic.className = "arabic";
      arabic.dir = "rtl";
      arabic.textContent = `${ayah.text} ۞ ${ayah.numberInSurah}`;

      card.appendChild(arabic);
      fragment.appendChild(card);
    });

    content.replaceChildren(fragment);
  } catch {
    content.textContent =
      "Could not load this Surah. Please try again.";
  }
}

$("loadSurah").addEventListener("click", loadSurah);
loadSurahList();

// Fetch today's Hijri date using the AlAdhan calendar API.
async function loadHijriDate() {
  const now = new Date();
  $("gregorianDate").textContent = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();

  try {
    const response = await fetch(
      `https://api.aladhan.com/v1/gToH/${day}-${month}-${year}`
    );
    if (!response.ok) throw new Error("Hijri date unavailable");

    const result = await response.json();
    const hijri = result.data.hijri;

    $("hijriDate").textContent =
      `${hijri.day} ${hijri.month.en} ${hijri.year} AH`;

    $("hijriDate").title = hijri.month.ar;
  } catch {
    $("hijriDate").textContent =
      "Unable to load Hijri date. Please try again.";
  }
}

loadHijriDate();

// Register the PWA service worker.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}
