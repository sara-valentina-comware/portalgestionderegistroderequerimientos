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
    window.location.href = "nuevo.html";
}

function irMisRequerimientos() {
    window.location.href = "misRequerimientos.html";
}

function irValidacion() {
    window.location.href = "validacion.html";
}
function irPerfil() {
    window.location.href = "perfil.html";
}

function irAtrasSegunRol() {
    const rol = localStorage.getItem("rol");
    const origen = localStorage.getItem("origenNavegacion");

    if (origen === "misRequerimientos") {
        localStorage.removeItem("origenNavegacion");
        window.location.href = "misRequerimientos.html";
        return;
    }

    if (rol === "admin") {
        window.location.href = "validacionRequerimiento.html";
    } else {
        window.location.href = "misRequerimientos.html";
    }
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
    userMsg.innerHTML = `
        <div class="message-content">
            ${userText}
            ${file ? `<br><small>📎 ${file.name}</small>` : ""}
        </div>
        <div class="message-icon">
            <img src="img/avatar.png">
        </div>
    `;
    chat.appendChild(userMsg);
    scrollToBottom(true);

    input.value = "";
    removeFile();

    const typingMsg = document.createElement("div");
    typingMsg.className = "message bot typing";
    typingMsg.innerHTML = `
        <div class="message-icon">
            <img src="img/bot.png">
        </div>
        <div class="message-content">
            NOVA está escribiendo...
        </div>
    `;

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
        botMsg.innerHTML = `
            <div class="message-icon">
                <img src="img/bot.png">
            </div>
            <div class="message-content">
                ${formatMessage(respuestaFinal)}
            </div>
        `;
        chat.appendChild(botMsg);
        scrollToBottom(true);

    } catch (error) {
        typingMsg.remove();
        console.error("Error NOVA:", error);
    }
}

function extraerTitulo(texto) {
    if (!texto) return null;

    const lineas = texto.replace(/<br\s*\/?>/gi, "\n").split("\n");

    for (let i = 0; i < lineas.length; i++) {
        const l = lineas[i].trim();

        if (/nombre del servicio|nombre del requerimiento|título|titulo/i.test(l)) {
            const partes = l.split(":");

            if (partes[1]?.trim()) {
                return partes[1].trim();
            }

            if (lineas[i + 1]?.trim()) {
                return lineas[i + 1].trim();
            }
        }
    }

    return null;
}

function convertirPlantillaAHTML(texto) {
    if (!texto) return "";

    let limpio = texto
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/\r/g, "\n")
        .replace(/\*/g, "")
        .trim();

    const lineas = limpio.split("\n");
    let html = `<div class="doc-clean-view">`;

    lineas.forEach((linea) => {

        let l = linea.trim();
        if (!l) return;

        // Ignorar encabezado NOVA
        if (/plantilla final generada/i.test(l)) return;
        if (/Un requerimiento de servicio según ITIL/i.test(l)) return;

        // Título principal
        if (/plantilla para/i.test(l.toLowerCase())) {
            html += `<h1 class="doc-main-title">${l}</h1>`;
            return;
        }

        // Campo tipo "Label:"
        if (l.endsWith(":")) {
            html += `<p class="doc-field-label"><strong>${l}</strong></p>`;
            return;
        }

        // Campo tipo "Label: valor"
        if (l.includes(":")) {
            const partes = l.split(":");
            const label = partes[0].trim();
            const valor = partes.slice(1).join(":").trim();

            html += `<p class="doc-field-label"><strong>${label}:</strong></p>`;
            html += `<p class="doc-field-value">${valor}</p>`;
            return;
        }

        // Texto normal
        html += `<p class="doc-field-value">${l}</p>`;
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
        case "Editado": return "editado";
        default: return "";
    }
}

function verDetalleReq(req) {
    localStorage.setItem("reqDetalle", JSON.stringify(req));
    localStorage.setItem("origenNavegacion", "misRequerimientos");
    window.location.href = "resultado.html";
}

/* =========================
   GENERACIÓN DE PDF
========================= */
async function descargarPDF() {

    const element = document.getElementById("resultadoContenido");

    if (!element || element.innerText.includes("Cargando")) {
        alert("Espera a que el documento termine de cargar.");
        return;
    }

    const reqId = localStorage.getItem("reqValidandoId") || "Requerimiento";

    try {
        const { jsPDF } = window.jspdf;

        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const margin = 15;
        const usableWidth = pageWidth - margin * 2;
        const startY = 20;
        const lineHeight = 4;

        let y = startY;
        let pageCount = 1;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Documento de Requerimiento", pageWidth / 2, 10, { align: "center" });

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`ID: ${reqId}`, pageWidth - margin, 10, { align: "right" });

        doc.line(margin, 12, pageWidth - margin, 12);

        const texto = element.innerText.trim();
        const lineasOriginales = texto.split("\n");

        lineasOriginales.forEach(linea => {

            const l = linea.trim();
            if (!l) return;

            const esTitulo =
                l.toUpperCase() === l && l.length < 60;

            const esSubtitulo =
                l.endsWith(":");

            let fontSize = 12;      
            let fontStyle = "normal";

            if (esTitulo) {
                fontSize = 11;
                fontStyle = "bold";
            }
            else if (esSubtitulo) {
                fontSize = 7;      
                fontStyle = "bold";
            }

            doc.setFont("helvetica", fontStyle);
            doc.setFontSize(fontSize);

            const lineas = doc.splitTextToSize(l, usableWidth);

            lineas.forEach(subLinea => {

                if (y > pageHeight - 15) {

                    if (pageCount === 2) return;

                    doc.addPage();
                    pageCount++;
                    y = startY;
                }

                doc.text(subLinea, margin, y);
                y += lineHeight;
            });

            y += 1;
        });

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(
            "Generado por Portal de Requerimientos",
            pageWidth / 2,
            pageHeight - 5,
            { align: "center" }
        );

        doc.save(`Requerimiento_${reqId}.pdf`);

    } catch (error) {
        console.error("Error PDF:", error);
        alert("Error al generar PDF.");
    }
}

/* =========================
   VALIDACIÓN
========================= */
function cargarBandejaValidacion() {
    const contenedor = document.getElementById("listaRequerimientos");
    if (!contenedor) return;

    const rol = localStorage.getItem("rol");
    const requerimientos = obtenerRequerimientos();

    requerimientos.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (requerimientos.length === 0) {
        contenedor.innerHTML = `<div class="empty-state">📭 No hay requerimientos.</div>`;
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
                <span style="font-size: 12px; color: #2282bf; font-weight: 500;">
                    ${rol === "manager" ? "👁️ Ver →" : "Revisar →"}
                </span>
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
    localStorage.setItem("origenNavegacion", "validacion");

    if (rol === "admin") {
        window.location.href = "validacionRequerimiento.html";
    } else {
        window.location.href = "resultado.html";
    }
}

function cargarRequerimientoValidacion() {
    const contenedor = document.getElementById("resultadoContenido");
    if (!contenedor) return;

    const reqId = localStorage.getItem("reqValidandoId");
    const db = obtenerRequerimientos();
    const reqActual = db.find(r => r.id === reqId);

    const reqHTML = localStorage.getItem("reqTemporal") || reqActual?.contenido;

    if (!reqHTML) {
        contenedor.innerHTML = "⚠️ No hay requerimiento para validar.";
        return;
    }

    // 3. Si está rechazado, preparamos un banner de alerta para el usuario/admin
    let alertaMotivo = "";
    if (reqActual?.estado === "Rechazado" && reqActual?.comentario) {
        alertaMotivo = `
            <div class="reject-alert" style="background: #fdf2f2; border-left: 5px solid #e74c3c; padding: 15px; margin-bottom: 20px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <h4 style="color: #e74c3c; margin: 0; font-size: 16px;">❌ Requerimiento Rechazado</h4>
                <p style="margin: 8px 0 0; color: #555; font-size: 14px; line-height: 1.4;">
                    <strong>Motivo del rechazo:</strong> ${reqActual.comentario}
                </p>
            </div>`;
    }

    contenedor.innerHTML = alertaMotivo + reqHTML;

    const txtMotivo = document.getElementById("motivoRechazo");
    if (txtMotivo) {
        txtMotivo.value = reqActual?.comentario || "";
    }

    const validaciones = JSON.parse(localStorage.getItem("validaciones")) || {};
    const estadoChecksGuardado = validaciones[reqId];

    const checkPO = document.getElementById("checkPO");
    const checkQA = document.getElementById("checkQA");

    if (estadoChecksGuardado && checkPO && checkQA) {
        checkPO.checked = estadoChecksGuardado.po || false;
        checkQA.checked = estadoChecksGuardado.qa || false;
    }

    controlarValidaciones();
}

function rechazarRequerimiento() {
    const reqId = localStorage.getItem("reqValidandoId");
    const txtMotivo = document.getElementById("motivoRechazo");
    const motivo = txtMotivo ? txtMotivo.value.trim() : "";

    const rol = localStorage.getItem("rol");
    if (rol !== "admin") {
        alert("🚫 Solo ADMIN puede rechazar.");
        return;
    }

    if (!motivo) {
        alert("⚠️ Por favor, ingresa un motivo para rechazar el requerimiento.");
        txtMotivo?.focus();
        return;
    }

    if (confirm(`¿Estás seguro de rechazar el requerimiento ${reqId}?`)) {
        const requerimientos = obtenerRequerimientos();
        const index = requerimientos.findIndex(r => r.id === reqId);

        if (index !== -1) {
            requerimientos[index].estado = "Rechazado";
            requerimientos[index].comentario = motivo;

            // También reseteamos los checks de aprobación al rechazar
            const validaciones = JSON.parse(localStorage.getItem("validaciones")) || {};
            validaciones[reqId] = { po: false, qa: false };

            localStorage.setItem(STORAGE_KEY_REQ, JSON.stringify(requerimientos));
            localStorage.setItem("validaciones", JSON.stringify(validaciones));

            alert(`❌ Requerimiento ${reqId} se rechazo correctamente!`);
            window.location.href = "validacion.html";
        }
    }
}


function controlarValidaciones() {
    const checkPO = document.getElementById("checkPO");
    const checkQA = document.getElementById("checkQA");
    const btnEnviar = document.getElementById("btnEnviarJira");
    const estadoBadge = document.getElementById("estadoValidacion");

    if (!checkPO || !checkQA || !btnEnviar) return;

    btnEnviar.disabled = false;

    if (checkPO.checked && checkQA.checked) {
        if (estadoBadge) {
            estadoBadge.className = "status-badge success";
            estadoBadge.textContent = "Listo para enviar";
        }
    } else if (checkPO.checked || checkQA.checked) {
        if (estadoBadge) {
            estadoBadge.className = "status-badge warning";
            estadoBadge.textContent = "En validación";
        }
    } else {
        if (estadoBadge) {
            estadoBadge.className = "status-badge warning";
            estadoBadge.textContent = "Pendiente de validaciones";
        }
    }
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
    const rol = localStorage.getItem("rol");
    if (rol !== "admin") return;

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

    let requerimientos = obtenerRequerimientos();
    const index = requerimientos.findIndex(r => r.id === reqId);

    if (index !== -1) {
        const estadoActual = requerimientos[index].estado;

        if (checkPO.checked || checkQA.checked) {
            if (estadoActual !== "Aprobado") {
                requerimientos[index].estado = "En validación";
            }
        } else {
            requerimientos[index].estado = "Pendiente";
        }

        localStorage.setItem(STORAGE_KEY_REQ, JSON.stringify(requerimientos));
    }

    controlarValidaciones();
}

// Botones
function verPDF() {
    window.location.href = "resultado.html";
}

function editarPDF() {
    window.location.href = "editar.html";
}

function guardarEdicion() {
    const rol = localStorage.getItem("rol");

    if (rol !== "admin") {
        alert("🚫 No tienes permisos para editar.");
        return;
    }

    const editor = document.getElementById("editorContenido");
    const nuevoHTML = editor.innerHTML;
    const reqId = localStorage.getItem("reqValidandoId");

    let requerimientos = JSON.parse(localStorage.getItem("requerimientos")) || [];
    const index = requerimientos.findIndex(r => r.id === reqId);

    if (index !== -1) {
        requerimientos[index].contenido = nuevoHTML;
        requerimientos[index].estado = "Editado";

        localStorage.setItem("requerimientos", JSON.stringify(requerimientos));
        localStorage.setItem("reqTemporal", nuevoHTML);

        alert(`✅ Requerimiento ${reqId} guardado exitosamente`);
        window.location.href = "validacion.html";
    }
}

/* =========================
   PERFIL
========================= */

document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.includes("perfil.html")) {
        cargarPerfil();
    }
});

async function cargarPerfil() {
    const usuario = localStorage.getItem("usuarioLogueado");

    if (!usuario) {
        alert("Sesión expirada");
        window.location.href = "index.html";
        return;
    }

    try {
        const resp = await fetch(`${API_URL}/perfil/${usuario}`);
        const data = await resp.json();

        if (!data.success) {
            alert("No se pudo cargar el perfil");
            return;
        }

        const u = data.usuario;

        document.getElementById("perfilNombre").textContent = u.nombre_usuario;
        document.getElementById("perfilCorreo").textContent = u.correo;
        document.getElementById("perfilUsuario").textContent = u.nombre_usuario;
        document.getElementById("perfilCentroCosto").textContent = u.centro_costo;

    } catch (error) {
        console.error("Error cargando perfil:", error);
        alert("Error de conexión con el servidor");
    }
}

// CAMBIAR CONTRASEÑA
async function cambiarPassword() {

    const usuario = localStorage.getItem("usuarioLogueado");
    const actual = document.getElementById("passwordActual").value;
    const nueva = document.getElementById("passwordNueva").value;

    if (!actual || !nueva) {
        alert("Completa todos los campos");
        return;
    }

    try {

        const resp = await fetch(`${API_URL}/cambiar-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario, actual, nueva })
        });

        const data = await resp.json();

        if (!data.success) {
            alert(data.message || "No se pudo cambiar la contraseña");
            return;
        }

        alert("✅ Contraseña actualizada. Debes iniciar sesión nuevamente.");

        localStorage.removeItem("usuarioLogueado");
        localStorage.removeItem("rol");

        window.location.href = "index.html";

    } catch (error) {

        console.error("Error:", error);
        alert("Error de conexión con el servidor");

    }
}

/* =========================
   INIT GENERAL & SEGURIDAD
========================= */
document.addEventListener("DOMContentLoaded", () => {

    const usuario = localStorage.getItem("usuarioLogueado");
    const rol = localStorage.getItem("rol");
    const paginaActual = window.location.pathname.split("/").pop();
    const enLogin = paginaActual === "index.html" || paginaActual === "";

    // PROTECCIÓN DE ACCESO: USUARIO NO LOGUEADO
    if (!usuario && !enLogin) {
        window.location.href = "index.html";
        return;
    }

    // PROTECCIÓN DE ACCESO: SEGÚN ROL (USER NO ENTRA A ADMIN)
    const paginasSoloAdmin = [
        "validacionRequerimiento.html",
        "editar.html"
    ];

    // SOLO USER bloqueado
    if (rol === "user" && paginasSoloAdmin.includes(paginaActual)) {
        console.warn(`Intento de acceso no autorizado por: ${usuario}`);
        alert("🚫 No tienes permisos para acceder a esta sección de administración.");
        window.location.href = "inicio.html";
        return;
    }


    // USUARIO MANAGER
    if (localStorage.getItem("rol") === "manager") {
        document.body.classList.add("manager");
    }
    if (rol === "manager" && paginaActual === "validacion.html") {

        const elementosOcultar = [
            "btnEnviarJira",
            "btnRechazar",
            "btnEditar",
            "btnAprobar",
            "seccionChecks"
        ];

        elementosOcultar.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = "none";
                el.disabled = true; // por seguridad
            }
        });

        // Asegurar que SOLO estos queden visibles
        const btnDescargar = document.getElementById("btnDescargar");
        const btnVolver = document.getElementById("btnVolver");

        if (btnDescargar) btnDescargar.style.display = "inline-block";
        if (btnVolver) btnVolver.style.display = "inline-block";
    }

    if (rol === "manager") {
        const titulo = document.getElementById("tituloSeccion");
        if (titulo) {
            titulo.textContent = "📋 Seguimiento de Requerimientos";
        }

        const checkPO = document.getElementById("checkPO");
        const checkQA = document.getElementById("checkQA");

        if (checkPO) checkPO.disabled = true;
        if (checkQA) checkQA.disabled = true;
    }

    // CONTROL DE INACTIVIDAD
    if (usuario) {
        localStorage.setItem("ultimaActividad", Date.now());
        setInterval(verificarInactividad, 30000);
    }

    if (rol === "user") {
        const elementosPrivados = [
            "cardValidar",
            "navValidar",
            "btnEnviarJira",
            "btnEditar",
            "seccionChecks"
        ];

        elementosPrivados.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
        });

        const editor = document.getElementById("editorContenido");
        if (editor) {
            editor.contentEditable = "false";
            editor.style.userSelect = "text";
        }
    }

    if (rol === "admin" && paginaActual === "resultado.html") {
        const botonesTecnicos = [
            "btnEnviarJira",
            "btnRechazar",
            "seccionChecks"
        ];

        botonesTecnicos.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
        });

        const panelValidacion = document.querySelector(".validation-panel");
        if (panelValidacion) panelValidacion.style.display = "none";
    }

    // CARGA DE DATOS SEGÚN PÁGINA
    const passwordInput = document.getElementById("password");
    if (passwordInput) passwordInput.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); login(); }
    });

    const userInput = document.getElementById("userInput");
    if (userInput) userInput.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    // Carga de lista de requerimientos (Solo en misRequerimientos.html)
    const contenedorLista = document.getElementById("listaRequerimientos");
    if (contenedorLista && paginaActual === "misRequerimientos.html") {
        aplicarFiltrosReq();
        cargarEventosReq();
    }

    // Carga de Bandeja Técnica (Solo en validacion.html)
    if (paginaActual === "validacion.html") {
        cargarBandejaValidacion();
    }

    // Carga de Vista de Validación o Detalle (resultado.html / validacionRequerimiento.html)
    if (paginaActual === "resultado.html" || paginaActual === "validacionRequerimiento.html") {
        cargarRequerimientoValidacion();
        controlarValidaciones();

        document.addEventListener("change", (e) => {
            if (e.target.id === "checkPO" || e.target.id === "checkQA") {
                guardarValidacionEstado();
                controlarValidaciones();
            }
        });
    }

    // Carga de Editor (Solo en editar.html)
    if (paginaActual === "editar.html") {
        const contenidoHTML = localStorage.getItem("reqTemporal");
        const editor = document.getElementById("editorContenido");
        if (contenidoHTML && editor) {
            editor.innerHTML = contenidoHTML;
        }
    }

    // Previsualización de archivos
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

    const btnEnviar = document.getElementById("btnEnviarJira");

    if (btnEnviar) {
        btnEnviar.disabled = false;

        btnEnviar.addEventListener("click", () => {
            const reqId = localStorage.getItem("reqValidandoId");
            const checkPO = document.getElementById("checkPO");
            const checkQA = document.getElementById("checkQA");

            const rol = localStorage.getItem("rol");
            if (!btnEnviar) return;

            if (rol === "manager") {
                btnEnviar.style.display = "none";
                btnEnviar.disabled = true;
            }
            if (rol !== "admin") {
                alert("🚫 Solo ADMIN puede enviar a JIRA.");
                return;
            }

            if (!checkPO || !checkQA) return;

            if (!checkPO.checked && !checkQA.checked) {
                alert("⚠️ Faltan las validaciones de PO y QA.");
                return;
            }
            if (!checkPO.checked) {
                alert("⚠️ Falta la validación del Product Owner (PO).");
                return;
            }
            if (!checkQA.checked) {
                alert("⚠️ Falta la validación de QA.");
                return;
            }

            const confirmar = confirm(`🚀 ¿Enviar requerimiento ${reqId} a JIRA?`);
            if (!confirmar) return;

            const requerimientos = obtenerRequerimientos();
            const index = requerimientos.findIndex(r => r.id === reqId);

            if (index !== -1) {
                requerimientos[index].estado = "Aprobado";
                localStorage.setItem("requerimientos", JSON.stringify(requerimientos));
                alert(`✅ Requerimiento ${reqId} enviado exitosamente.`);
                window.location.href = "validacion.html";
            }
        });
    }

    scrollToBottom(true);
});