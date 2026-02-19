const API_URL = "http://localhost:3000";
const NOVA_URL = "https://n8n.comware.com.co/webhook/chat-portalgestionderegistroderequerimientos";
const STORAGE_KEY_REQ = "requerimientos";
const TIEMPO_EXPIRACION = 10 * 60 * 1000;

function generarThreadId() {
    return "thread_" + Date.now();
}

function scrollToBottom(force = false) {
    const chat = document.getElementById("chatMessages");
    if (!chat) return;

    const isNearBottom = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 80;

    if (force || isNearBottom) {
        requestAnimationFrame(() => {
            chat.scrollTop = chat.scrollHeight;
        });
    }
}

function formatMessage(text) {
    if (!text) return "";

    let formatted = text
        .replace(/hola/gi, "👋 Hola")
        .replace(/gracias/gi, "🙏 Gracias")
        .replace(/incidente/gi, "⚠️ Incidente")
        .replace(/requerimiento/gi, "📝 Requerimiento");

    return formatted.replace(/\n/g, "<br>");
}

function removeFile() {
    const fileInput = document.getElementById("fileInput");
    const filePreview = document.getElementById("filePreview");

    if (fileInput) fileInput.value = "";
    if (filePreview) filePreview.innerHTML = "";
}

/* =========================
   LOGIN / LOGOUT
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario, password })
        });

        const data = await response.json();
        console.log("Backend:", data);

        if (data.success) {
            localStorage.setItem("usuarioLogueado", data.usuario);
            localStorage.setItem("rol", data.rol);
            localStorage.setItem("ultimaActividad", Date.now());
            localStorage.setItem("threadId", generarThreadId());

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
    localStorage.removeItem("rol");
    localStorage.removeItem("ultimaActividad");
    localStorage.removeItem("threadId");

    window.location.href = "index.html";
}

/* =========================
   NAVEGACIÓN
========================= */
function irNuevo() {
    localStorage.removeItem("reqTemporal");
    window.location.href = "nuevo.html";
}

function irMisRequerimientos() {
    localStorage.removeItem("reqTemporal");
    window.location.href = "misRequerimientos.html";
}

function irValidacion() {
    localStorage.removeItem("reqTemporal");
    window.location.href = "validacion.html";
}

/* =========================
   CONTROL DE INACTIVIDAD
========================= */
function actualizarActividad() {
    localStorage.setItem("ultimaActividad", Date.now());
}

function verificarInactividad() {
    const ultimaActividad = localStorage.getItem("ultimaActividad");
    const usuario = localStorage.getItem("usuarioLogueado");
    if (!usuario || !ultimaActividad) return;

    const tiempoInactivo = Date.now() - parseInt(ultimaActividad);
    if (tiempoInactivo > TIEMPO_EXPIRACION) cerrarSesionPorInactividad();
}

function cerrarSesionPorInactividad() {
    localStorage.removeItem("usuarioLogueado");
    localStorage.removeItem("rol");
    localStorage.removeItem("ultimaActividad");
    localStorage.removeItem("threadId");

    alert("Sesión cerrada por inactividad⏳");
    window.location.href = "index.html";
}

["click", "mousemove", "keydown", "scroll", "touchstart"]
    .forEach(evento => document.addEventListener(evento, actualizarActividad));

/* =========================
   CHATBOT NOVA
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

    // Mensaje usuario
    const userMessage = document.createElement("div");
    userMessage.classList.add("message", "user");
    userMessage.innerHTML = `
        <div class="message-content">
            ${userText || ""}${file ? `<br><small>📎 ${file.name}</small>` : ""}
        </div>
        <div class="message-icon">
            <img src="img/avatar.png" alt="Usuario">
        </div>
    `;
    chat.appendChild(userMessage);
    scrollToBottom(true);

    // Limpiar input y preview
    input.value = "";
    if (fileInput) fileInput.value = "";
    const filePreview = document.getElementById("filePreview");
    if (filePreview) filePreview.innerHTML = "";
    input.focus();

    // Mensaje bot "escribiendo"
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

        // Guardar Plantilla Final
        let respuestaFinal = (data.reply || "").trim();
        if (respuestaFinal.toLowerCase().includes("plantilla final generada")) {
            const usuario = localStorage.getItem("usuarioLogueado");
            const idReq = "REQ_" + Date.now();
            const fecha = new Date().toLocaleString();

            const htmlGenerado = convertirPlantillaAHTML(respuestaFinal);

            // Guardar en Historial Personal
            const historial = JSON.parse(localStorage.getItem("misRequerimientos")) || [];
            historial.push({
                id: idReq,
                autor: usuario,
                fecha: fecha,
                contenido: htmlGenerado,
                estado: "Pendiente"
            });
            localStorage.setItem("misRequerimientos", JSON.stringify(historial));

            // Guardar en Bandeja de Validación (Admin)
            const validacion = JSON.parse(localStorage.getItem("requerimientos")) || [];
            validacion.push({
                id: idReq,
                titulo: "Requerimiento generado por chatbot",
                autor: usuario,
                fecha: fecha,
                contenido: htmlGenerado,
                estado: "Pendiente"
            });
            localStorage.setItem("requerimientos", JSON.stringify(validacion));

            localStorage.setItem("reqTemporal", htmlGenerado);

        }
        typingMessage.remove();

        // Mensaje bot final
        const botMessage = document.createElement("div");
        botMessage.classList.add("message", "bot");
        botMessage.innerHTML = `
            <div class="message-icon">
                <img src="img/bot.png" alt="NOVA">
            </div>
            <div class="message-content">${formatMessage(data.reply)}</div>
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
            <div class="message-content">Error al conectar con NOVA.</div>
        `;
        chat.appendChild(errorMessage);
        scrollToBottom(true);
        console.error("Error NOVA:", error);
    }
}

function convertirPlantillaAHTML(texto) {
    if (!texto) return "";

    let limpio = texto.replace(/^plantilla final generada:?/i, "").trim();
    const lineas = limpio.split("\n");

    let html = `<div class="doc-container">`;
    html += `<div class="doc-header">REQUERIMIENTO TÉCNICO - COMWARE</div>`;

    const camposResaltados = [
        "Nombre del Servicio o Aplicación", "Tipo de Requerimiento", "Objetivo del requerimiento",
        "Justificación", "Beneficio esperado", "Implicación si no se atiende", "Criterios de Aceptación",
        "Alcance Estimado", "Requerimientos Técnicos", "Aprobadores o Stakeholders Clave", "Adjuntos Relevantes",
        "Área técnica responsable del desarrollo", "Autor del requerimiento", "Centro de Costos"
    ];

    lineas.forEach(linea => {
        let l = linea.trim().replace(/\*\*/g, "");
        if (l === "") return;

        const esCampoClave = camposResaltados.some(campo =>
            l.toUpperCase().startsWith(campo)
        );

        if (esCampoClave || l.includes(":")) {
            let partes = l.split(":");
            let label = partes[0].trim();
            let valor = partes.slice(1).join(":").trim();

            html += `
                <div class="doc-field">
                    <span class="doc-label">${label}${label.endsWith(':') ? '' : ':'}</span>
                    <span class="doc-value">${valor}</span>
                </div>`;
        }
        else if (l.toUpperCase() === l && l.length > 10) {
            html += `<h2 class="doc-title">${l}</h2>`;
        }
        else {
            html += `<p class="doc-paragraph">${l}</p>`;
        }
    });

    html += `<div class="doc-footer-watermark">Generado automáticamente por NOVA AI</div>`;
    html += `</div>`;
    return html;
}

/* =========================
   MIS REQUERIMIENTOS
========================= */
function obtenerRequerimientos() {
    let reqs = JSON.parse(localStorage.getItem(STORAGE_KEY_REQ)) || [];
    localStorage.setItem(STORAGE_KEY_REQ, JSON.stringify(reqs));
    return reqs;
}

function cargarEventosReq() {
    const buscador = document.getElementById("buscadorReq");
    const filtro = document.getElementById("filtroEstado");

    if (buscador) buscador.addEventListener("input", aplicarFiltrosReq);
    if (filtro) filtro.addEventListener("change", aplicarFiltrosReq);
}

function aplicarFiltrosReq() {
    const texto = document.getElementById("buscadorReq")?.value.toLowerCase() || "";
    const estadoFiltro = document.getElementById("filtroEstado")?.value || "";

    const reqs = obtenerRequerimientos();
    const filtrados = reqs.filter(req => {
        const coincideTexto = req.titulo.toLowerCase().includes(texto) || req.id.toLowerCase().includes(texto);
        const coincideEstado = !estadoFiltro || req.estado === estadoFiltro;
        return coincideTexto && coincideEstado;
    });

    renderizarRequerimientos(filtrados);
    actualizarContadorReq(filtrados.length);
}

function renderizarRequerimientos(lista) {
    const contenedor = document.getElementById("listaRequerimientos");
    if (!contenedor) return;

    contenedor.innerHTML = "";
    if (lista.length === 0) {
        contenedor.innerHTML = `<div class="empty-state">📭 No se encontraron requerimientos</div>`;
        return;
    }

    lista.forEach(req => {
        const fila = document.createElement("div");
        fila.className = "req-row";
        fila.innerHTML = `
            <div class="req-info">
                <span class="req-title">${req.titulo}</span>
                <span class="req-meta">${req.fecha}</span>
            </div>
            <div class="req-id">${req.id}</div>
            <div class="req-status-badge ${obtenerClaseEstado(req.estado)}">${req.estado}</div>
        `;
        fila.addEventListener("click", () => verDetalleReq(req));
        contenedor.appendChild(fila);
    });
}

function actualizarContadorReq(total) {
    const contador = document.getElementById("contadorReq");
    if (contador) contador.textContent = total;
}

function obtenerClaseEstado(estado) {
    switch (estado) {
        case "Pendiente": return "pendiente";
        case "En validación": return "validacion";
        case "Aprobado": return "aprobado";
        case "Rechazado": return "rechazado";
        default: return "";
    }
}

function verDetalleReq(req) {
    localStorage.setItem("reqDetalle", JSON.stringify(req));
    window.location.href = "resultado.html";
}

/* =========================
   VALIDACIÓN
========================= */
function cargarBandejaValidacion() {
    const contenedor = document.getElementById("listaRequerimientos");
    if (!contenedor) return;

    const requerimientos = JSON.parse(localStorage.getItem("requerimientos")) || [];
    if (requerimientos.length === 0) {
        contenedor.innerHTML = "📭 No hay requerimientos pendientes.";
        return;
    }

    contenedor.innerHTML = "";
    requerimientos.forEach(req => {
        const div = document.createElement("div");
        div.className = "req-row";
        div.innerHTML = `
            <div class="req-title">${req.titulo || "Requerimiento sin título"}</div>
            <div class="req-meta">📅 ${req.fecha || "Sin fecha"}</div>
            <div class="req-meta">🆔 ${req.id}</div>
            <div class="req-status">Estado: ${req.estado || "Pendiente"}</div>
        `;
        div.addEventListener("click", () => abrirRequerimiento(req));
        contenedor.appendChild(div);
    });
}

function abrirRequerimiento(req) {

    const rol = localStorage.getItem("rol");

    localStorage.setItem("reqTemporal", req.contenido);

    if (rol === "admin") {
        window.location.href = "validacionRequerimiento.html";
    } else {
        window.location.href = "resultado.html";
    }
}

function cargarRequerimientoValidacion() {
    const contenedor = document.getElementById("resultadoContenido");
    const estado = document.getElementById("estadoValidacion");

    if (!contenedor) return;

    const reqHTML = localStorage.getItem("reqTemporal");

    if (!reqHTML) {
        contenedor.innerHTML = "⚠️ No hay requerimiento para validar.";
        if (estado) {
            estado.className = "status-badge error";
            estado.textContent = "Sin documento";
        }
        return;
    }

    contenedor.innerHTML = reqHTML;

}


function controlarValidaciones() {
    const checkPO = document.getElementById("checkPO");
    const checkQA = document.getElementById("checkQA");
    const btnEnviar = document.getElementById("btnEnviarJira");
    const estado = document.getElementById("estadoValidacion");

    if (!checkPO || !checkQA || !btnEnviar) return;

    const aprobadoPO = checkPO.checked;
    const aprobadoQA = checkQA.checked;

    if (aprobadoPO && aprobadoQA) {
        btnEnviar.disabled = false;
        estado.className = "status-badge success";
        estado.textContent = "Aprobado para envío";
    } else if (!aprobadoPO && !aprobadoQA) {
        btnEnviar.disabled = true;
        estado.className = "status-badge warning";
        estado.textContent = "Pendiente de validación";
    } else {
        btnEnviar.disabled = true;
        estado.className = "status-badge error";
        estado.textContent = "Validación incompleta";
    }
}
// Botones
function verPDF() {
    window.location.href = "resultado.html";
}

function editarPDF() {
    window.location.href = "nuevo.html";
}

/* =========================
   INIT GENERAL
========================= */
document.addEventListener("DOMContentLoaded", () => {

    const usuario = localStorage.getItem("usuarioLogueado");
    const rol = localStorage.getItem("rol");
    const paginaActual = window.location.pathname.split("/").pop();
    const enLogin = paginaActual === "index.html";

    if (!usuario && !enLogin) window.location.href = "index.html";

    if (usuario) {
        localStorage.setItem("ultimaActividad", Date.now());
        setInterval(verificarInactividad, 30000);
    }

    if (rol === "user") {
        const cardValidar = document.getElementById("cardValidar");
        if (cardValidar) cardValidar.style.display = "none";

        const navValidar = document.getElementById("navValidar");
        if (navValidar) navValidar.style.display = "none";

        const btnEnviarJira = document.getElementById("btnEnviarJira");
        if (btnEnviarJira) btnEnviarJira.style.display = "none";
    }

    // Enter login
    const passwordInput = document.getElementById("password");
    if (passwordInput) passwordInput.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); login(); }
    });

    // Enter chat
    const userInput = document.getElementById("userInput");
    if (userInput) userInput.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    // Previsualizar adjunto
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

    // Cargar mis requerimientos
    if (document.getElementById("listaRequerimientos")) {
        cargarEventosReq();
        const contenedor = document.getElementById("listaRequerimientos");

        if (usuario) {
            const requerimientos = JSON.parse(localStorage.getItem("misRequerimientos")) || [];
            const filtrados = requerimientos.filter(r => r.autor === usuario);

            if (filtrados.length === 0) contenedor.innerHTML = "No hay requerimientos registrados todavía...";
            else {
                contenedor.innerHTML = "";
                filtrados.reverse().forEach(req => {
                    const bloque = document.createElement("div");
                    bloque.classList.add("req-card");
                    bloque.innerHTML = `
                        <div class="req-header">
                            <strong>📌 ${req.id}</strong>
                            <span>${req.fecha}</span>
                        </div>
                        <div class="req-body">${req.contenido}</div>
                    `;
                    contenedor.appendChild(bloque);
                });
            }
        } else {
            contenedor.innerHTML = "Debes iniciar sesión.";
        }
    }

    scrollToBottom(true);

    // Cargar validación si aplica
    cargarBandejaValidacion();
    cargarRequerimientoValidacion();
    controlarValidaciones();

    document.addEventListener("change", (e) => {
        if (e.target.id === "checkPO" || e.target.id === "checkQA") {
            controlarValidaciones();
        }
    });


    // Botón enviar a JIRA
    const btnEnviar = document.getElementById("btnEnviarJira");
    if (btnEnviar) {
        btnEnviar.addEventListener("click", () => {
            const aprobadoPO = document.getElementById("checkPO")?.checked;
            const aprobadoQA = document.getElementById("checkQA")?.checked;

            if (!aprobadoPO || !aprobadoQA) {
                alert("El requerimiento debe ser aprobado por PO y QA.");
                return;
            }

            alert("Requerimiento enviado al flujo de JIRA");
            console.log("Enviar a JIRA...");
        });
    }
});
