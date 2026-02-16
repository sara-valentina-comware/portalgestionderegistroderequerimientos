
const NOVA_URL = "https://n8n.comware.com.co/webhook/chat-portalgestionderegistroderequerimientos";
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


/* LOGIN / LOGOUT */
async function login() {
    const usuario = document.getElementById("usuario")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    if (!usuario || !password) {
        alert("Por favor ingrese usuario y contraseña");
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ usuario, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem("usuarioLogueado", usuario);
            window.location.href = "inicio.html";
        } else {
            alert("Usuario o contraseña incorrectos");
        }

    } catch (error) {
        console.error("Error en login:", error);
        alert("Error al conectar con el servidor");
    }
}


function logout() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}

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


/* CHATBOT */
async function sendMessage() {
    const input = document.getElementById("userInput");
    const chat = document.getElementById("chatMessages");
    const fileInput = document.getElementById("fileInput");

    if (!input || !chat) return;

    const userText = input.value.trim();
    const file = fileInput?.files[0];

    // Permitir enviar si hay texto o archivo
    if (!userText && !file) return;

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

    if (fileInput) {
        fileInput.value = "";
    }

    const filePreview = document.getElementById("filePreview");
    if (filePreview) {
        filePreview.innerHTML = "";
    }

    input.focus();

    /***** MENSAJE "ESCRIBIENDO" *****/
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

        // 🔥 USAMOS FORMDATA
        const formData = new FormData();
        formData.append("message", userText);
        formData.append("threadId", localStorage.getItem("usuarioLogueado") || "anonimo");

        if (file) {
            formData.append("file", file);
        }

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

document.addEventListener("DOMContentLoaded", () => {

    const userInput = document.getElementById("userInput");
    const fileInput = document.getElementById("fileInput");
    const filePreview = document.getElementById("filePreview");

    if (userInput) {
        userInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        userInput.focus();
    }

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

function removeFile() {
    const fileInput = document.getElementById("fileInput");
    const filePreview = document.getElementById("filePreview");

    if (fileInput) fileInput.value = "";
    if (filePreview) filePreview.innerHTML = "";
}

const fileInput = document.getElementById("fileInput");

if (fileInput) {
    fileInput.addEventListener("change", function () {
        if (this.files.length > 0) {
            console.log("Archivo seleccionado:", this.files[0].name);
        }
    });
}

/* SEGURIDAD BÁSICA */
window.onload = function () {
    const usuario = localStorage.getItem("usuarioLogueado");
    const paginaActual = window.location.pathname;

    if (!usuario && !paginaActual.includes("index.html")) {
        window.location.href = "index.html";
    }

    scrollToBottom(true);
};
