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

    // Mostrar mensaje usuario
    const userMsg = document.createElement("div");
    userMsg.className = "message user";
    userMsg.innerHTML = `<div class="message-content">${userText}${file ? `<br><small>📎 ${file.name}</small>` : ""}</div><div class="message-icon"><img src="img/avatar.png"></div>`;
    chat.appendChild(userMsg);
    scrollToBottom(true);

    input.value = "";
    removeFile();

    const typingMsg = document.createElement("div");
    typingMsg.className = "message bot typing";
    typingMsg.innerHTML = `<div class="message-icon"><img src="img/bot.png"></div><div class="message-content">NOVA está escribiendo...</div>`;
    chat.appendChild(typingMsg);
    scrollToBottom(true);

    try {
        const formData = new FormData();
        formData.append("message", userText);
        formData.append("threadId", localStorage.getItem("threadId"));
        if (file) formData.append("file", file);

        const response = await fetch(NOVA_URL, { method: "POST", body: formData });
        const data = await response.json();
        const respuestaFinal = (data.reply || "").trim();

        if (respuestaFinal.toLowerCase().includes("plantilla final generada")) {
            const usuario = localStorage.getItem("usuarioLogueado");
            const idReq = "REQ_" + Date.now();
            const htmlGenerado = convertirPlantillaAHTML(respuestaFinal);
            const tituloDetectado = extraerTitulo(respuestaFinal) || "Requerimiento sin título";

            const db = JSON.parse(localStorage.getItem(STORAGE_KEY_REQ)) || [];
            db.push({
                id: idReq,
                titulo: tituloDetectado,
                autor: usuario, // Esencial para filtrar
                fecha: new Date().toLocaleString(),
                timestamp: Date.now(),
                contenido: htmlGenerado,
                estado: "Pendiente"
            });
            localStorage.setItem(STORAGE_KEY_REQ, JSON.stringify(db));
            localStorage.setItem("reqTemporal", htmlGenerado);
        }

        typingMsg.remove();
        const botMsg = document.createElement("div");
        botMsg.className = "message bot";
        botMsg.innerHTML = `<div class="message-icon"><img src="img/bot.png"></div><div class="message-content">${formatMessage(respuestaFinal)}</div>`;
        chat.appendChild(botMsg);
        scrollToBottom(true);

    } catch (error) {
        typingMsg.remove();
        console.error("Error NOVA:", error);
    }
}

function extraerTitulo(texto) {
    if (!texto) return null;

    const patrones = [
        /Nombre del servicio:\s*(.+)/i,
        /Nombre del Servicio:\s*(.+)/i,
        /Servicio:\s*(.+)/i
    ];

    for (let patron of patrones) {
        const match = texto.match(patron);
        if (match) return match[1].trim();
    }

    return null;
}

function convertirPlantillaAHTML(texto) {
    if (!texto) return "";

    let textoLimpio = texto.replace(/<br\s*\/?>/gi, "\n").replace(/\*/g, "");

    const lineas = textoLimpio.split("\n");
    let html = `<div class="doc-clean-view">`;

    lineas.forEach((linea) => {
        let l = linea.trim();

        if (!l || /plantilla final generada/i.test(l)) {
            return;
        }
        if (l.toLowerCase().includes("plantilla para escalamiento")) {
            html += `<h1 class="doc-main-title">${l}</h1>`;
        }
        else if (l.endsWith(":") ||
            /nombre del servicio|tipo de requerimiento|objetivo|justificacion|beneficio|implicacion|descripcion funcional|criterios|alcance|requerimientos tecnicos|aprobadores|adjuntos|area tecnica|autor|centro de costos/i.test(l)) {

            if (l.includes(":") && l.split(":")[1].trim().length > 1) {
                let partes = l.split(":");
                let label = partes[0].trim();
                let valor = partes.slice(1).join(":").trim();
                html += `<p class="doc-field-label"><strong>${label}:</strong></p>`;
                html += `<p class="doc-field-value">${valor}</p>`;
            } else {
                html += `<p class="doc-field-label"><strong>${l}</strong></p>`;
            }
        }
        else {
            html += `<p class="doc-field-value">${l}</p>`;
        }
    });

    html += `</div>`;
    return html;
}

/* =========================
   MIS REQUERIMIENTOS
========================= */
function obtenerRequerimientos() {
    // Todos leen de la misma llave
    return JSON.parse(localStorage.getItem("requerimientos")) || [];
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
    const usuarioActual = localStorage.getItem("usuarioLogueado");

    if (!usuarioActual) return; // Si no hay usuario, no mostramos nada

    const reqs = obtenerRequerimientos();

    const filtrados = reqs.filter(req => {
        const esMio = req.autor &&
            req.autor.trim().toLowerCase() === usuarioActual.trim().toLowerCase();

        const coincideTexto =
            (req.titulo || "").toLowerCase().includes(texto) ||
            (req.id || "").toLowerCase().includes(texto);

        const coincideEstado =
            !estadoFiltro ||
            (req.estado || "").trim().toLowerCase() === estadoFiltro.trim().toLowerCase();

        return esMio && coincideTexto && coincideEstado;
    });

    filtrados.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    renderizarRequerimientos(filtrados);
    actualizarContadorReq();
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
                <span class="req-title"><strong>${req.titulo || "Sin título"}</strong></span>
                <span class="req-meta">📅 ${req.fecha}</span>
            </div>
            <div class="req-id">🆔 ${req.id}</div>
            <div class="req-status-badge ${obtenerClaseEstado(req.estado)}">${req.estado}</div>
        `;
        fila.addEventListener("click", () => verDetalleReq(req));
        contenedor.appendChild(fila);
    });
}

function actualizarContadorReq() {
    const contador = document.getElementById("contadorReq");
    const usuario = localStorage.getItem("usuarioLogueado");
    if (!contador || !usuario) return;

    const todos = obtenerRequerimientos();
    const misRequerimientosCount = todos.filter(r =>
        r.autor?.trim().toLowerCase() === usuario.trim().toLowerCase()
    ).length;


    contador.textContent = misRequerimientosCount;
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

    const requerimientos = obtenerRequerimientos();

    if (requerimientos.length === 0) {
        contenedor.innerHTML = `<div class="empty-state">📭 No hay requerimientos para validar.</div>`;
        contenedor.style.display = "block";
        return;
    }

    contenedor.innerHTML = "";
    contenedor.className = "validacion-grid";

    requerimientos.forEach(req => {
        const card = document.createElement("div");
        card.className = "val-card";

        card.innerHTML = `
            <div class="val-card-header">
                <span class="val-card-id"># ${req.id}</span>
                <div class="val-card-title">${req.titulo || "Sin título"}</div>
            </div>
            <div class="val-card-body">
                <div class="val-info-item">📅 <span>${req.fecha}</span></div>
                <div class="val-info-item">👤 <span>${req.autor || "Sistema"}</span></div>
            </div>
            <div class="val-card-footer">
                <span class="val-badge ${obtenerClaseEstado(req.estado)}">${req.estado}</span>
                <span style="font-size: 12px; color: #2282bf; font-weight: 500;">Revisar →</span>
            </div>
        `;

        card.addEventListener("click", () => abrirRequerimiento(req));
        contenedor.appendChild(card);
    });
}

function abrirRequerimiento(req) {

    const rol = localStorage.getItem("rol");

    localStorage.setItem("reqTemporal", req.contenido);
    localStorage.setItem("reqValidandoId", req.id);

    if (rol === "admin") {
        window.location.href = "validacionRequerimiento.html";
    } else {
        window.location.href = "resultado.html";
    }
}

function cargarRequerimientoValidacion() {
    const contenedor = document.getElementById("resultadoContenido");
    if (!contenedor) return;

    const reqHTML = localStorage.getItem("reqTemporal");
    const reqId = localStorage.getItem("reqValidandoId");

    if (!reqHTML) {
        contenedor.innerHTML = "⚠️ No hay requerimiento para validar.";
        return;
    }

    contenedor.innerHTML = reqHTML;

    // Checks
    const validaciones = JSON.parse(localStorage.getItem("validaciones")) || {};
    const estadoGuardado = validaciones[reqId];

    const checkPO = document.getElementById("checkPO");
    const checkQA = document.getElementById("checkQA");

    if (estadoGuardado && checkPO && checkQA) {
        checkPO.checked = estadoGuardado.po;
        checkQA.checked = estadoGuardado.qa;
    }

    controlarValidaciones();
}


function controlarValidaciones() {
    const checkPO = document.getElementById("checkPO");
    const checkQA = document.getElementById("checkQA");
    const btnEnviar = document.getElementById("btnEnviarJira");
    const estadoBadge = document.getElementById("estadoValidacion");

    if (!checkPO || !checkQA || !btnEnviar) return;

    const aprobadoPO = checkPO.checked;
    const aprobadoQA = checkQA.checked;

    let nuevoEstado = "Pendiente";

    if (aprobadoPO && aprobadoQA) {
        nuevoEstado = "Aprobado";
        btnEnviar.disabled = false;

        estadoBadge.className = "status-badge success";
        estadoBadge.textContent = "Aprobado para envío";
    }
    else if (aprobadoPO || aprobadoQA) {
        nuevoEstado = "En validación";
        btnEnviar.disabled = true;

        estadoBadge.className = "status-badge warning";
        estadoBadge.textContent = "En proceso de validación";
    }
    else {
        nuevoEstado = "Pendiente";
        btnEnviar.disabled = true;

        estadoBadge.className = "status-badge error";
        estadoBadge.textContent = "Pendiente de validación";
    }

    actualizarEstadoRequerimiento(nuevoEstado);
}

function actualizarEstadoRequerimiento(nuevoEstado) {
    const reqId = localStorage.getItem("reqValidandoId");
    if (!reqId) return;

    const requerimientos = JSON.parse(localStorage.getItem(STORAGE_KEY_REQ)) || [];

    const index = requerimientos.findIndex(r => r.id === reqId);
    if (index === -1) return;

    requerimientos[index].estado = nuevoEstado;

    localStorage.setItem(STORAGE_KEY_REQ, JSON.stringify(requerimientos));
}

function guardarValidacionEstado() {
    const reqId = localStorage.getItem("reqValidandoId");
    if (!reqId) return;

    const checkPO = document.getElementById("checkPO");
    const checkQA = document.getElementById("checkQA");

    if (!checkPO || !checkQA) return;

    const estadoChecks = {
        po: checkPO.checked,
        qa: checkQA.checked
    };

    const validaciones = JSON.parse(localStorage.getItem("validaciones")) || {};
    validaciones[reqId] = estadoChecks;

    localStorage.setItem("validaciones", JSON.stringify(validaciones));

    controlarValidaciones();
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

    cargarEventosReq();
    // Cargar mis requerimientos
    const contenedor = document.getElementById("listaRequerimientos");
    if (contenedor) {
        if (usuario) {
            const requerimientos = obtenerRequerimientos();
            // Filtramos solo los del usuario actual
            const propios = requerimientos.filter(r =>
                r.autor?.trim().toLowerCase() === usuario.trim().toLowerCase()
            );

            actualizarContadorReq();

            if (propios.length === 0) {
                contenedor.innerHTML = '<div class="empty-state">📭 No tienes requerimientos registrados.</div>';
            } else {
                contenedor.innerHTML = "";

                propios.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

                propios.forEach(req => {
                    const fila = document.createElement("div");

                    fila.className = "req-item";
                    fila.innerHTML = `
                        <div class="req-info">
                            <span class="req-title"><strong>${req.titulo || "Sin título"}</strong></span>
                            <span class="req-meta">📅 ${req.fecha}</span>
                        </div>
                        <div class="req-id">🆔 ${req.id}</div>
                        <div class="req-status-badge ${obtenerClaseEstado(req.estado)}">${req.estado}</div>
                    `;
                    fila.addEventListener("click", () => verDetalleReq(req));
                    contenedor.appendChild(fila);
                });
            }
        } else {
            contenedor.innerHTML = "Debes iniciar sesión.";
        }
    }

    scrollToBottom(true);

    if (paginaActual === "validacion.html") {
        cargarBandejaValidacion();
    }
    if (paginaActual === "misRequerimientos.html") {
        aplicarFiltrosReq();
    }

    cargarRequerimientoValidacion();
    controlarValidaciones();

    document.addEventListener("change", (e) => {
        if (e.target.id === "checkPO" || e.target.id === "checkQA") {
            guardarValidacionEstado();
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
