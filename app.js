const form = document.getElementById("chatForm");
const questionInput = document.getElementById("question");
const languageSelect = document.getElementById("language");
const sendButton = document.getElementById("sendButton");
const sendText = document.getElementById("sendText");
const message = document.getElementById("message");
const answerSection = document.getElementById("answerSection");
const answerElement = document.getElementById("answer");
const copyButton = document.getElementById("copyButton");

function showMessage(text, type = "") {
  message.textContent = text;
  message.className = "message " + type;
}

function setLoading(isLoading) {
  sendButton.disabled = isLoading;
  sendText.textContent = isLoading ? "Thinking…" : "Ask Jem AI";
}

function showDates() {
  const now = new Date();

  document.getElementById("gregorianDate").textContent =
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(now);

  try {
    document.getElementById("hijriDate").textContent =
      new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(now);
  } catch (error) {
    document.getElementById("hijriDate").textContent =
      "Check a local Hijri calendar";
  }
}

document.querySelectorAll(".suggestion").forEach((button) => {
  button.addEventListener("click", () => {
    questionInput.value = button.dataset.question || "";
    questionInput.focus();
    questionInput.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = questionInput.value.trim();
  const language = languageSelect.value;

  if (!question) {
    showMessage("Please enter a question.", "error");
    return;
  }

  setLoading(true);
  showMessage("Preparing your answer…", "loading");
  answerSection.hidden = true;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question,
        language
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || `Request failed (${response.status}).`
      );
    }

    if (!data.answer) {
      throw new Error("No answer was returned. Please try again.");
    }

    // Use textContent so the answer is displayed safely as plain text.
    answerElement.textContent = data.answer;
    answerSection.hidden = false;
    showMessage("Answer received.", "success");

    answerSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } catch (error) {
    showMessage(
      "Could not get an answer: " +
      error.message +
      " Check your internet connection and Vercel API settings.",
      "error"
    );
  } finally {
    setLoading(false);
  }
});

copyButton.addEventListener("click", async () => {
  const text = answerElement.textContent;

  try {
    await navigator.clipboard.writeText(text);
    copyButton.textContent = "Copied!";
    setTimeout(() => {
      copyButton.textContent = "Copy answer";
    }, 1800);
  } catch (error) {
    showMessage(
      "Copy is unavailable here. Please select and copy the answer manually.",
      "error"
    );
  }
});

showDates();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.log("Service worker registration failed:", error);
    });
  });
}
