/* =========================
   CONFIGURACIÓN
   ========================= */
const API_URL = "http://localhost:3000";
const NOVA_URL = "https://n8n.comware.com.co/webhook/chat-portalgestionderegistroderequerimientos";


/* =========================
   SCROLL CHAT
   ========================= */
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


/* LOGIN */
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


/* LOGOUT */
function logout() {
    localStorage.removeItem("usuarioLogueado");
    localStorage.removeItem("ultimaActividad");
    window.location.replace("index.html");
}


/* NAVEGACIÓN */
function irNuevo() {
    window.location.href = "nuevo.html";
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


/* CONTROL DE INACTIVIDAD */
const TIEMPO_EXPIRACION = 10 * 60 * 1000; // 10 minutos

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

    alert("Sesión cerrada por inactividad⏳");

    window.location.replace("index.html");
}

// Detectores de actividad
["click", "mousemove", "keydown", "scroll", "touchstart"]
    .forEach(evento => {
        document.addEventListener(evento, actualizarActividad);
    });


/* CHATBOT NOVA */
async function sendMessage() {

    const input = document.getElementById("userInput");
    const chat = document.getElementById("chatMessages");
    const fileInput = document.getElementById("fileInput");

    if (!input || !chat) return;

    const userText = input.value.trim();
    const file = fileInput?.files[0];

    if (!userText && !file) return;

    actualizarActividad();

    /***** MENSAJE USUARIO *****/
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

    /***** "NOVA escribiendo..." *****/
    const typingMessage = document.createElement("div");
    typingMessage.classList.add("message", "bot", "typing");

    typingMessage.innerHTML = `
        <div class="message-icon">
            <img src="img/bot.png" alt="NOVA">
        </div>
        <div class="message-content">
            NOVA está escribiendo...
        </div>
    `;

    chat.appendChild(typingMessage);
    scrollToBottom(true);

    try {

        const formData = new FormData();
        formData.append("message", userText);
        formData.append(
            "threadId",
            localStorage.getItem("usuarioLogueado") || "anonimo"
        );

        if (file) formData.append("file", file);

        const response = await fetch(NOVA_URL, {
            method: "POST",
            body: formData
        });

        let data;

        try {
            data = await response.json();
        } catch {
            data = { reply: "Respuesta inválida de NOVA." };
        }

        typingMessage.remove();

        const botMessage = document.createElement("div");
        botMessage.classList.add("message", "bot");

        botMessage.innerHTML = `
            <div class="message-icon">
                <img src="img/bot.png" alt="NOVA">
            </div>
            <div class="message-content">
                ${data.reply || "NOVA no respondió."}
            </div>
        `;

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
            <div class="message-content">
                Error al conectar con NOVA.
            </div>
        `;

        chat.appendChild(errorMessage);
        scrollToBottom(true);

        console.error("Error NOVA:", error);
    }
}


/* DOM READY */
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

    localStorage.setItem("ultimaActividad", Date.now());

    // Verificar inactividad cada 30s
    setInterval(verificarInactividad, 30000);

    /* ENTER para enviar mensaje */
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

                chip.innerHTML = `
                    📎 ${file.name}
                    <button onclick="removeFile()">✖</button>
                `;

                filePreview.appendChild(chip);
            }
        });
    }

    scrollToBottom(true);
});


/* REMOVE FILE */
function removeFile() {
    const fileInput = document.getElementById("fileInput");
    const filePreview = document.getElementById("filePreview");

    if (fileInput) fileInput.value = "";
    if (filePreview) filePreview.innerHTML = "";
}


/* SEGURIDAD BÁSICA*/
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
