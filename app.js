
const $ = (id) => document.getElementById(id);

const history = [];
const MAX_HISTORY = 8;

function showStatus(id, message) {
  $(id).textContent = message;
}

function addBubble(text, type) {
  const el = document.createElement("div");
  el.className = `bubble ${type}`;
  el.textContent = text;
  $("messages").appendChild(el);
  $("messages").scrollTop = $("messages").scrollHeight;
}

document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b =>
      b.classList.toggle("active", b === button)
    );

    document.querySelectorAll(".page").forEach(page =>
      page.classList.toggle("active", page.id === button.dataset.page)
    );
  });
});

// Islamic-only AI chat
$("chatForm").addEventListener("submit", async event => {
  event.preventDefault();

  const question = $("question").value.trim();
  if (!question) return;

  const language = $("language").value;
  $("question").value = "";
  addBubble(question, "user");

  const sendBtn = $("sendBtn");
  sendBtn.disabled = true;
  showStatus("chatStatus", "Preparing an answer...");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        language,
        history: history.slice(-MAX_HISTORY)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    if (!data.answer) throw new Error("No answer was returned.");

    history.push(
      { role: "user", content: question },
      { role: "assistant", content: data.answer }
    );

    if (history.length > MAX_HISTORY) {
      history.splice(0, history.length - MAX_HISTORY);
    }

    addBubble(data.answer, "bot");
    showStatus("chatStatus", "");
  } catch (error) {
    addBubble("Unable to get an answer: " + error.message, "bot");
    showStatus("chatStatus", "Check your internet connection and API settings.");
  } finally {
    sendBtn.disabled = false;
    $("question").focus();
  }
});

// Quran chapter list
async function loadSurahList() {
  try {
    const response = await fetch("https://api.alquran.cloud/v1/surah");
    if (!response.ok) throw new Error("Surah list unavailable.");

    const data = await response.json();
    if (data.code !== 200 || !Array.isArray(data.data)) {
      throw new Error("Invalid surah list.");
    }

    $("surah").replaceChildren();

    data.data.forEach(surah => {
      const option = document.createElement("option");
      option.value = String(surah.number);
      option.textContent =
        `${surah.number}. ${surah.englishName} — ${surah.name}`;
      $("surah").appendChild(option);
    });

    await loadSurah();
  } catch (error) {
    showStatus("quranStatus", error.message);
  }
}

async function loadSurah() {
  const number = $("surah").value;
  const edition = $("edition").value;

  if (!number) return;

  $("verses").replaceChildren();
  showStatus("quranStatus", "Loading Quran text...");

  try {
    const endpoint =
      `https://api.alquran.cloud/v1/surah/${encodeURIComponent(number)}/` +
      encodeURIComponent(edition);

    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("Could not load this surah.");

    const result = await response.json();
    if (result.code !== 200 || !result.data?.ayahs) {
      throw new Error("Quran data was not returned.");
    }

    const surah = result.data;
    const fragment = document.createDocumentFragment();

    surah.ayahs.forEach(ayah => {
      const card = document.createElement("article");
      card.className = "verse";

      const numberEl = document.createElement("div");
      numberEl.className = "verse-number";
      numberEl.textContent = `Ayah ${ayah.numberInSurah}`;
      card.appendChild(numberEl);

      const textEl = document.createElement("div");
      textEl.textContent = ayah.text;

      if (edition === "quran-uthmani") {
        textEl.className = "arabic";
        textEl.lang = "ar";
        textEl.dir = "rtl";
      } else {
        textEl.className = "translation";
      }

      card.appendChild(textEl);
      fragment.appendChild(card);
    });

    $("verses").appendChild(fragment);
    showStatus(
      "quranStatus",
      `${surah.englishName} — ${surah.ayahs.length} verses`
    );
  } catch (error) {
    showStatus("quranStatus", error.message);
  }
}

$("loadQuran").addEventListener("click", loadSurah);
$("surah").addEventListener("change", loadSurah);
$("edition").addEventListener("change", loadSurah);

// Hijri date from AlAdhan
async function loadHijriDate() {
  showStatus("hijriResult", "Loading Hijri date...");

  try {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const date = `${day}-${month}-${year}`;

    const response = await fetch(
      `https://api.aladhan.com/v1/gToH/${date}`
    );

    if (!response.ok) throw new Error("Calendar service unavailable.");

    const result = await response.json();
    if (result.code !== 200 || !result.data?.hijri) {
      throw new Error("Hijri date was not returned.");
    }

    const h = result.data.hijri;
    const g = result.data.gregorian;

    $("hijriResult").replaceChildren();

    const hijri = document.createElement("div");
    hijri.textContent =
      `${h.day} ${h.month.en} ${h.year} AH`;

    const arabic = document.createElement("div");
    arabic.lang = "ar";
    arabic.dir = "rtl";
    arabic.textContent =
      `${h.day} ${h.month.ar} ${h.year} هـ`;

    const gregorian = document.createElement("p");
    gregorian.textContent = `${g.date} (${g.weekday.en})`;

    $("hijriResult").append(hijri, arabic, gregorian);
  } catch (error) {
    showStatus("hijriResult", error.message);
  }
}

$("loadDate").addEventListener("click", loadHijriDate);

// Register service worker for basic offline app shell
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(error => {
      console.error("Service worker registration failed:", error);
    });
  });
}

loadSurahList();
loadHijriDate();
