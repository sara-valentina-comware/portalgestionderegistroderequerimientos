
const API_URL = "http://localhost:3000";
const NOVA_URL = "https://n8n.comware.com.co/webhook/chat-portalgestionderegistroderequerimientos";

function generarThreadId() {
    return "thread_" + Date.now();
}

function scrollToBottom(force = false) {
    const chat = document.getElementById("chatMessages");
    if (!chat) return;

    const isNearBottom =
        chat.scrollHeight - chat.scrollTop - chat.clientHeight < 80;

    if (force || isNearBottom) {
        requestAnimationFrame(() => {
            chat.scrollTop = chat.scrollHeight;
        });
    }
}


/* =========================
   LOGIN
   ========================= */
async function login() {

    const usuario = document.getElementById("usuario")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    if (!usuario || !password) {
        alert("Por favor completa usuario y contraseña");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ usuario, password })
        });

        const data = await response.json();

        if (data.success) {

            localStorage.setItem("usuarioLogueado", usuario);
            localStorage.setItem("ultimaActividad", Date.now());

            window.location.replace("inicio.html");

        } else {
            alert("Usuario o contraseña incorrectos");
        }

    } catch (error) {
        console.error("Error en login:", error);
        alert("Error al conectar con el servidor");
    }
}


/* =========================
   LOGOUT
   ========================= */
function logout() {
    localStorage.removeItem("usuarioLogueado");
    localStorage.removeItem("ultimaActividad");
    localStorage.removeItem("threadId");

    window.location.replace("index.html");
}


/* =========================
   NAVEGACIÓN
   ========================= */
function irNuevo() {
    window.location.href = "nuevo.html";
}
function irMisRequerimientos() {
    localStorage.removeItem("reqTemporal");
    window.location.href = "misRequerimientos.html";
}
function irResultado() {
    window.location.href = "resultado.html";
}

function editar() {
    window.location.href = "nuevo.html";
}

function nuevoRequerimiento() {
    localStorage.removeItem("reqTemporal");
    window.location.href = "nuevo.html";
}


/* =========================
   CONTROL DE INACTIVIDAD
   ========================= */
const TIEMPO_EXPIRACION = 10 * 60 * 1000;

function actualizarActividad() {
    localStorage.setItem("ultimaActividad", Date.now());
}

function verificarInactividad() {
    const ultimaActividad = localStorage.getItem("ultimaActividad");
    const usuario = localStorage.getItem("usuarioLogueado");

    if (!usuario || !ultimaActividad) return;

    const ahora = Date.now();
    const tiempoInactivo = ahora - parseInt(ultimaActividad);

    if (tiempoInactivo > TIEMPO_EXPIRACION) {
        cerrarSesionPorInactividad();
    }
}

function cerrarSesionPorInactividad() {
    localStorage.removeItem("usuarioLogueado");
    localStorage.removeItem("ultimaActividad");
    localStorage.removeItem("threadId");

    alert("Sesión cerrada por inactividad⏳");

    window.location.replace("index.html");
}

["click", "mousemove", "keydown", "scroll", "touchstart"]
    .forEach(evento => {
        document.addEventListener(evento, actualizarActividad);
    });


/* =========================
   CHATBOT NOVA (modificado)
   ========================= */
async function sendMessage() {
    const input = document.getElementById("userInput");
    const chat = document.getElementById("chatMessages");
    const fileInput = document.getElementById("fileInput");

    if (!input || !chat) return;

    const userText = input.value.trim();
    const file = fileInput?.files[0];

    if (!userText && !file) return;

    actualizarActividad();

    // Mensaje del usuario
    const userMessage = document.createElement("div");
    userMessage.classList.add("message", "user");
    userMessage.innerHTML = `
        <div class="message-content">
            ${userText || ""}
            ${file ? `<br><small>📎 ${file.name}</small>` : ""}
        </div>
        <div class="message-icon">
            <img src="img/avatar.png" alt="Usuario">
        </div>
    `;
    chat.appendChild(userMessage);
    scrollToBottom(true);

    input.value = "";
    if (fileInput) fileInput.value = "";
    const filePreview = document.getElementById("filePreview");
    if (filePreview) filePreview.innerHTML = "";
    input.focus();

    // Mensaje "NOVA está escribiendo..."
    const typingMessage = document.createElement("div");
    typingMessage.classList.add("message", "bot", "typing");
    typingMessage.innerHTML = `
        <div class="message-icon">
            <img src="img/bot.png" alt="NOVA">
        </div>
        <div class="message-content">NOVA está escribiendo...</div>
    `;
    chat.appendChild(typingMessage);
    scrollToBottom(true);

    try {
        const formData = new FormData();
        formData.append("message", userText);
        formData.append("threadId", localStorage.getItem("threadId"));
        if (file) formData.append("file", file);

        const response = await fetch(NOVA_URL, { method: "POST", body: formData });
        let data;
        try {
            data = await response.json();
        } catch {
            data = { reply: "Respuesta inválida de NOVA." };
        }

        typingMessage.remove();

        const botMessage = document.createElement("div");
        botMessage.classList.add("message", "bot");

        const messageIcon = document.createElement("div");
        messageIcon.classList.add("message-icon");
        messageIcon.innerHTML = `<img src="img/bot.png" alt="NOVA">`;

        const messageContent = document.createElement("div");
        messageContent.classList.add("message-content");

        // Aquí aplicamos el formateo
        const replyContent = formatMessage(data.reply);
        messageContent.innerHTML = replyContent;

        botMessage.appendChild(messageIcon);
        botMessage.appendChild(messageContent);
        chat.appendChild(botMessage);
        scrollToBottom(true);

    } catch (error) {
        typingMessage.remove();
        const errorMessage = document.createElement("div");
        errorMessage.classList.add("message", "bot");
        errorMessage.innerHTML = `
            <div class="message-icon">
                <img src="img/bot.png" alt="NOVA">
            </div>
            <div class="message-content">❌ Error al conectar con NOVA.</div>
        `;
        chat.appendChild(errorMessage);
        scrollToBottom(true);
        console.error("Error NOVA:", error);
    }
}


/* =========================
   FORMATEO DE MENSAJES
   ========================= */
function formatMessage(text) {
    if (!text) return "";
    let formatted = text
        .replace(/hola/gi, "👋 Hola")
        .replace(/gracias/gi, "🙏 Gracias")
        .replace(/incidente/gi, "⚠️ Incidente")
        .replace(/requerimiento/gi, "📝 Requerimiento");

    // Convertir saltos de línea en <br>
    formatted = formatted.replace(/\n/g, "<br>");

    return formatted;
}


/* =========================
   REMOVE FILE
   ========================= */
function removeFile() {
    const fileInput = document.getElementById("fileInput");
    const filePreview = document.getElementById("filePreview");

    if (fileInput) fileInput.value = "";
    if (filePreview) filePreview.innerHTML = "";
}


/* =========================
   DOM READY
   ========================= */
document.addEventListener("DOMContentLoaded", () => {

    const usuario = localStorage.getItem("usuarioLogueado");
    const paginaActual = window.location.pathname;

    const enLogin = paginaActual.includes("index.html") || paginaActual.endsWith("/");

    // Si no hay usuario y NO estamos en login -> enviar a login
    if (!usuario && !enLogin) {
        window.location.replace("index.html");
        return;
    }

    // Si hay usuario y estamos en login -> enviar a inicio
    if (usuario && enLogin) {
        window.location.replace("inicio.html");
        return;
    }

    // Inicialización normal
    console.log("✅ Sesión válida:", usuario);

    localStorage.setItem("ultimaActividad", Date.now());
    localStorage.setItem("threadId", generarThreadId());
    setInterval(verificarInactividad, 30000);

    /* ENTER en LOGIN */
    const passwordInput = document.getElementById("password");
    if (passwordInput) {
        passwordInput.addEventListener("keydown", e => {
            if (e.key === "Enter") {
                e.preventDefault();
                login();
            }
        });
    }

    /* ENTER en chat */
    const userInput = document.getElementById("userInput");
    if (userInput) {
        userInput.addEventListener("keydown", e => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        userInput.focus();
    }

    /* Preview archivo */
    const fileInput = document.getElementById("fileInput");
    const filePreview = document.getElementById("filePreview");

    if (fileInput && filePreview) {
        fileInput.addEventListener("change", function () {

            filePreview.innerHTML = "";

            if (this.files.length > 0) {
                const file = this.files[0];

                const chip = document.createElement("div");
                chip.classList.add("file-chip");

                chip.innerHTML = `📎 ${file.name} <button onclick="removeFile()">✖</button>`;

                filePreview.appendChild(chip);
            }
        });
    }

    scrollToBottom(true);
});



/* =========================
   SEGURIDAD BÁSICA
   ========================= */
document.addEventListener("DOMContentLoaded", () => {

    const usuario = localStorage.getItem("usuarioLogueado");
    const paginaActual = window.location.pathname;

    const enLogin =
        paginaActual.includes("index.html") ||
        paginaActual.endsWith("/");

    if (!usuario && !enLogin) {
        window.location.replace("index.html");
        return;
    }
    if (usuario && enLogin) {
        window.location.replace("inicio.html");
        return;
    }

    console.log("✅Sesión válida:", usuario);
});
