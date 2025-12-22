const API_URL = "https://apisac.truze.com.br";

const form = document.getElementById("sacForm");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");

const photoInput = document.getElementById("photo");
const preview = document.getElementById("preview");
const previewImg = document.getElementById("previewImg");
const removePhotoBtn = document.getElementById("removePhoto");

const titleEl = document.getElementById("title");
const messageEl = document.getElementById("message");

document.getElementById("year").textContent = new Date().getFullYear();

function setStatus(message, type = "") {
  statusEl.className = "status" + (type ? " " + type : "");
  statusEl.textContent = message || "";
}

function disableForm(disabled) {
  submitBtn.disabled = disabled;
  Array.from(form.elements).forEach((el) => {
    if (el.tagName === "BUTTON" && el.type === "reset") return;
    el.disabled = disabled;
  });
}

function resetPreview() {
  preview.hidden = true;
  previewImg.removeAttribute("src");
}

function getSelectedFile() {
  return photoInput?.files?.[0] || null;
}

function validateInputs(title, message, file) {
  
  if (!API_URL) {
    return "Configure a API_URL";
  }

  if (!title || !message) return "Preencha título e mensagem.";

  if (title.length > 120) return "Título muito grande (máx. 120).";
  
  if (message.length > 2000) return "Mensagem muito grande (máx. 2000).";

  if (file) {
    if (!file.type.startsWith("image/")) return "A foto precisa ser um arquivo de imagem.";
    const max = 8 * 1024 * 1024; // 8MB
    if (file.size > max) return "A imagem está muito grande. Envie uma menor (até ~8MB).";
  }

  return null;
}

photoInput?.addEventListener("change", () => {
  const file = getSelectedFile();
  setStatus("");

  if (!file) {
    resetPreview();
    return;
  }

  const err = validateInputs("ok", "ok", file);
  if (err && err.includes("foto")) {
    setStatus(err, "err");
    photoInput.value = "";
    resetPreview();
    return;
  }

  previewImg.src = URL.createObjectURL(file);
  preview.hidden = false;
});

removePhotoBtn?.addEventListener("click", () => {
  photoInput.value = "";
  resetPreview();
  setStatus("");
});

form?.addEventListener("reset", () => {
  resetPreview();
  setStatus("");
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("");

  const title = titleEl.value.trim();
  const message = messageEl.value.trim();
  const file = getSelectedFile();

  const err = validateInputs(title, message, file);
  if (err) {
    setStatus(err, "err");
    return;
  }

  disableForm(true);
  setStatus("Enviando…");

  try {
    if (file) {
      await sendWithPhoto(title, message, file);
    } else {
      await sendWithoutPhoto(title, message);
    }

    setStatus("Chamado enviado com sucesso! ✅", "ok");
    form.reset();
  } catch (error) {
    console.error(error);
    setStatus("Falha ao enviar. Verifique a API e tente novamente.", "err");
  } finally {
    disableForm(false);
  }
});

async function sendWithoutPhoto(title, message) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, message }),
  });

  if (!res.ok) throw new Error(await res.text());
}

async function sendWithPhoto(title, message, photoFile) {
  const iso = new Date().toISOString();

  const payload = {
    username: "truze SAC",
    embeds: [
      {
        title: `SAC: ${title}`.slice(0, 256),
        description: String(message).slice(0, 2000),
        color: 0xD4A12A,
        timestamp: iso,
        footer: { text: "truze • SAC" },
      },
    ],
  };

  const safeName = (photoFile.name || "foto.png").replace(/[^\w.\-]+/g, "_");
  payload.embeds[0].image = { url: `attachment://${safeName}` };

  const fd = new FormData();
  fd.append("payload_json", JSON.stringify(payload));
  fd.append("files[0]", photoFile, safeName);

  const res = await fetch(API_URL, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
}