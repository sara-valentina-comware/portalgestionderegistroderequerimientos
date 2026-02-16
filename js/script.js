
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
function login() {
    const usuario = document.getElementById("usuario")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    if (usuario === "admin" && password === "12345") {
        localStorage.setItem("usuarioLogueado", usuario);
        window.location.href = "inicio.html";
    } else {
        alert("Usuario o contraseña incorrectos");
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

    if (!input || !chat) return;
    if (input.value.trim() === "") return;

    const userText = input.value.trim();

    /***** MENSAJE USUARIO *****/
    const userMessage = document.createElement("div");
    userMessage.classList.add("message", "user");

    userMessage.innerHTML = `
        <div class="message-content">
            ${userText}
        </div>
        <div class="message-icon">
            <img src="img/avatar.png" alt="Usuario">
        </div>
    `;

    chat.appendChild(userMessage);
    scrollToBottom(true);

    input.value = "";
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
        const response = await fetch(NOVA_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: userText,
                threadId: localStorage.getItem("usuarioLogueado") || "anonimo"
            })
        });

        let data;

        try {
            data = await response.json();
        } catch {
            data = { reply: "Respuesta inválida de NOVA." };
        }

        typingMessage.remove();

        /***** RESPUESTA BOT *****/
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

    if (userInput) {
        userInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        userInput.focus();
    }

    scrollToBottom(true);
});



/* SEGURIDAD BÁSICA */
window.onload = function () {
    const usuario = localStorage.getItem("usuarioLogueado");
    const paginaActual = window.location.pathname;

    if (!usuario && !paginaActual.includes("index.html")) {
        window.location.href = "index.html";
    }

    scrollToBottom(true);
};
