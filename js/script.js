const API_URL = "http://127.0.0.1:3000";
const NOVA_URL = "http://127.0.0.1:3000/api/nova";
const JIRA_BASE_URL = "https://comwaredev.atlassian.net";
const JIRA_PROJECT_KEY = "PIA";
const TIEMPO_EXPIRACION = 10 * 60 * 1000;
let archivosTemporalesGlobal = [];

/* =========================
   HELPERS API — REQUERIMIENTOS
========================= */
async function obtenerRequerimientos(vista = "mis") {
    const usuario = localStorage.getItem("usuarioLogueado");
    const rol = localStorage.getItem("rol");

    let queryParams = `rol=${encodeURIComponent(rol)}&vista=${vista}`;

    if (vista === "mis") {
        queryParams += `&usuario=${encodeURIComponent(usuario)}`;
    } else if (rol === "manager") {
        queryParams += `&vista=todos`;
    }

    try {
        const resp = await fetch(`${API_URL}/requerimientos?${queryParams}`);
        const data = await resp.json();
        return data.success ? data.data : [];
    } catch (error) {
        console.error("Error obteniendo requerimientos:", error);
        return [];
    }
}

async function obtenerRequerimientoPorId(id) {
    try {
        const resp = await fetch(`${API_URL}/requerimientos/${id}`);
        const data = await resp.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error("Error obteniendo requerimiento:", error);
        return null;
    }
}

async function actualizarRequerimiento(id, campos) {
    try {
        const resp = await fetch(`${API_URL}/requerimientos/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(campos)
        });
        return (await resp.json()).success;
    } catch (error) {
        console.error("Error actualizando requerimiento:", error);
        return false;
    }
}

async function guardarValidacion(id, po, qa) {
    try {
        const response = await fetch(
            `http://localhost:3000/requerimientos/${id}/validacion`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    rol: "admin",
                    po,
                    qa
                })
            }
        );

        const data = await response.json();

        if (data.success) {
            await cargarRequerimientos();
        }

    } catch (error) {
        console.error(error);
    }
}


/* =========================
   MANEJO DE ADJUNTOS
========================= */
document.addEventListener("DOMContentLoaded", function () {
    const fileInput = document.getElementById("fileInput");
    if (!fileInput) return;
    fileInput.addEventListener("change", function () {
        for (let i = 0; i < this.files.length; i++) {
            archivosTemporalesGlobal.push(this.files[i]);
        }
        renderFilePreview();
        this.value = "";
    });
});

function generarThreadId() {
    return "thread_" + Date.now();
}

function scrollToBottom() {
    const chat = document.getElementById("chatMessages");
    if (!chat) return;

    setTimeout(() => {
        chat.scrollTop = chat.scrollHeight;
    }, 50);
}

function formatMessage(text) {
    if (!text) return "";
    let formatted = text
        .replace(/hola/gi, "👋 Hola")
        .replace(/gracias/gi, "🙏 Gracias");
    return formatted.replace(/\n/g, "<br>");
}

function removeFile(index = null) {
    const fileInput = document.getElementById("fileInput");
    const filePreview = document.getElementById("filePreview");
    if (index === null) {
        archivosTemporalesGlobal = [];
        if (fileInput) fileInput.value = "";
        if (filePreview) filePreview.innerHTML = "";
    } else {
        archivosTemporalesGlobal.splice(index, 1);
        renderFilePreview();
    }
}

function renderFilePreview() {
    const filePreview = document.getElementById("filePreview");
    if (!filePreview) return;
    filePreview.innerHTML = "";
    archivosTemporalesGlobal.forEach((file, index) => {
        const fileItem = document.createElement("div");
        fileItem.className = "file-item";
        fileItem.innerHTML = `📎 ${file.name} <button onclick="removeFile(${index})">❌</button>`;
        filePreview.appendChild(fileItem);
    });
}


/* =========================
   LOGIN / LOGOUT
========================= */
async function login() {
    const usuarioInput = document.getElementById("usuario")?.value.trim().toLowerCase();
    const password = document.getElementById("password")?.value.trim();

    if (!usuarioInput || !password) {
        alert("Por favor completa usuario y contraseña");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario: usuarioInput, password })
        });

        const data = await response.json();
        console.log("Backend:", data);

        if (data.success) {
            localStorage.setItem("usuarioLogueado", data.usuario.toLowerCase());
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
function irNuevo() { window.location.href = "nuevo.html"; }
function irMisRequerimientos() { window.location.href = "misRequerimientos.html"; }
function irValidacion() { window.location.href = "validacion.html"; }
function irPerfil() { window.location.href = "perfil.html"; }

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
    alert("Sesión cerrada por inactividad ⏳");
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

    if (!input || !chat) return;

    const userText = input.value.trim();
    const files = [...archivosTemporalesGlobal];

    if (!userText.trim()) {
        alert("Escribe un mensaje antes de enviar.");
        return;
    }

    actualizarActividad();

    // Mostrar mensaje usuario
    const userMsg = document.createElement("div");
    userMsg.className = "message user";
    userMsg.innerHTML = `
        <div class="message-content">
            ${userText}
            ${files.length > 0 ? `<br><small>📎 ${files.map(f => f.name).join("<br>📎 ")}</small>` : ""}
        </div>
        <div class="message-icon"><img src="img/avatar.png"></div>
    `;
    chat.appendChild(userMsg);
    scrollToBottom();

    input.value = "";

    const typingMsg = document.createElement("div");
    typingMsg.className = "message bot typing";
    typingMsg.innerHTML = `
        <div class="message-icon"><img src="img/bot.png"></div>
        <div class="message-content">NOVA está escribiendo...</div>
    `;
    chat.appendChild(typingMsg);

    try {

        const formData = new FormData();
        formData.append("message", userText);
        formData.append("threadId", localStorage.getItem("threadId"));
        formData.append("channel", "web");

        files.forEach(file => {
            formData.append("files", file);
        });

        const response = await fetch(NOVA_URL, {
            method: "POST",
            body: formData
        });

        if (!response.ok) throw new Error("Error servidor");

        const data = await response.json();
        const respuestaFinal = typeof data.reply === "string"
            ? data.reply.trim()
            : String(data.reply || "");

        if (respuestaFinal.toLowerCase().includes("plantilla final generada")) {

            const usuario = localStorage.getItem("usuarioLogueado");

            const nuevoReq = {
                titulo: extraerTitulo(respuestaFinal) || "Requerimiento sin título",
                autor: usuario,
                fecha: new Date().toLocaleString(),
                timestamp_ms: Date.now(),
                contenido: convertirPlantillaAHTML(respuestaFinal),
                estado: "Pendiente",
                prioridad: normalizarPrioridad(
                    extraerPrioridadTexto(respuestaFinal)
                ),
                tipo_caso: "Requerimiento",
                centro_costo: extraerCentroCostoTexto(respuestaFinal),
                adjuntos: data.adjuntos || [],
                threadId: localStorage.getItem("threadId")
            };

            const guardar = await fetch(`${API_URL}/requerimientos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(nuevoReq)
            });

            const guardado = await guardar.json();

            if (!guardado.success) {
                alert("Error guardando requerimiento en BD");
                return;
            }

            archivosTemporalesGlobal = [];
            removeFile();
        }

        typingMsg.remove();
        scrollToBottom();

        const botMsg = document.createElement("div");
        botMsg.className = "message bot";
        botMsg.innerHTML = `
            <div class="message-icon"><img src="img/bot.png"></div>
            <div class="message-content">${formatMessage(respuestaFinal)}</div>
        `;
        chat.appendChild(botMsg);
        scrollToBottom();

    } catch (error) {
        typingMsg.remove();
        scrollToBottom();
        console.error("ERROR REAL:", error);
        alert("Error real: " + error.message);
    }
}


/* =========================
   EXTRACCIÓN DE CAMPOS
========================= */
function extraerTitulo(texto) {
    if (!texto) return null;
    const limpio = texto.replace(/<br\s*\/?>/gi, "\n");
    const lineas = limpio.split("\n");

    for (let i = 0; i < lineas.length; i++) {
        const l = lineas[i].trim();
        if (/(nombre\s+del\s+(servicio|requerimiento)|t[íi]tulo|servicio)/i.test(l)) {
            if (l.includes(":")) {
                const posible = l.split(":").slice(1).join(":").trim();
                if (posible && posible.length > 3) return posible;
            }
            const siguiente = lineas[i + 1]?.trim();
            if (siguiente && siguiente.length > 3 && !/^-+$/.test(siguiente)) return siguiente;
        }
    }
    return null;
}

function extraerCentroCostoTexto(texto) {
    if (!texto) return null;
    const lineas = texto.replace(/<br\s*\/?>/gi, "\n").split("\n");
    for (let i = 0; i < lineas.length; i++) {
        let l = lineas[i].trim();
        if (/centro de costos?/i.test(l)) {
            const partes = l.split(":");
            if (partes.length > 1 && partes[1].trim()) return partes[1].trim();
            for (let j = i + 1; j < lineas.length; j++) {
                if (lineas[j].trim()) return lineas[j].trim();
            }
        }
    }
    return null;
}

function extraerPrioridadTexto(texto) {
    if (!texto) return null;
    const limpio = texto.replace(/<br\s*\/?>/gi, "\n");
    const lineas = limpio.split("\n");
    for (let i = 0; i < lineas.length; i++) {
        const l = lineas[i].trim();
        if (/prioridad/i.test(l)) {
            if (l.includes(":")) {
                const valor = l.split(":").slice(1).join(":").trim();
                if (valor) return normalizarPrioridad(valor);
            }
            const siguiente = lineas[i + 1]?.trim();
            if (siguiente && !/impacto/i.test(siguiente)) return normalizarPrioridad(siguiente);
        }
    }
    return null;
}

function normalizarPrioridad(valor) {
    if (!valor) return null;
    const v = valor.replace(/\./g, "").trim().toLowerCase();
    if (v.includes("alta")) return "Alta";
    if (v.includes("media")) return "Media";
    if (v.includes("baja")) return "Baja";
    if (v.includes("crit")) return "Crítica";
    return valor.trim();
}

/* =========================
   CONVERTIR PLANTILLA A HTML
========================= */
function convertirPlantillaAHTML(texto) {
    if (!texto) return "";

    const lineas = texto
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/\*/g, "")
        .split("\n")
        .map(l => l.trim())
        .filter(l => l !== "" && !/^Plantilla Final Generada/i.test(l));

    const tituloPrincipal = lineas[0] || "Requerimiento";
    let html = `<div class="doc-pro-view">`;

    let skipNext = false;

    const cerrarLista = () => {
        if (enLista) { html += `</ul>`; enLista = false; }
    };

    const titulosSecundarios = [
        "Descripción breve de la necesidad:",
        "Problema que se busca resolver:",
        "Área o proceso impactado:",
        "Objetivo de la solución:",
        "Descripción del proceso actual (AS-IS):",
        "Descripción general de la solución requerida (TO-BE):",
        "Alcance del requerimiento (incluye):",
        "Exclusiones del alcance (no incluye, salvo definición posterior):",
        "Riesgos identificados (a nivel documental):",
        "Criterios de aceptación (alto nivel):",
        "Área técnica responsable del desarrollo:",
        "Autor del requerimiento:",
        "Centro de Costos asociado:",
        "Adjuntos asociados al requerimiento:"
    ];

    const subtitulos = [
        "Tipo de gestión:",
        "Tipo de solicitud:",
        "Usuarios afectados:",
        "Principales fallas o dolores del proceso actual:",
        "Sistemas y componentes involucrados:",
        "Reglas o políticas que la solución debe cumplir:",
        "Aprobaciones y validaciones requeridas dentro del flujo:",
        "Implicaciones si no se realiza la solución:",
        "Ambiente(s) impactado(s):"
    ];

    lineas.forEach((l, index) => {

    if (skipNext) {
        skipNext = false;
        return;
    }

    // 👇 CASO ESPECIAL: Título del requerimiento:
    if (l === "Título del requerimiento:") {
        cerrarLista();
        const valorTitulo = lineas[index + 1] || "";
        html += `<h2 class="doc-section-title">Título del requerimiento: ${valorTitulo}</h2>`;
        skipNext = true;
        return;
    }

    if (titulosSecundarios.includes(l)) {
        cerrarLista();
        html += `<h2 class="doc-section-title">${l}</h2>`;
    } else if (subtitulos.includes(l)) {
        cerrarLista();
        html += `<h3 class="doc-subtitle">${l}</h3>`;
    } else if (/^[-•]/.test(l)) {
        if (!enLista) { html += `<ul class="doc-list">`; enLista = true; }
        html += `<li>${l.replace(/^[-•]\s*/, "")}</li>`;
    } else {
        cerrarLista();
        html += `<p class="doc-paragraph">${l}</p>`;
    }
});

    cerrarLista();
    html += `</div>`;
    return html;
}


/* =========================
   MIS REQUERIMIENTOS
========================= */
function cargarEventosReq() {
    const buscador = document.getElementById("buscadorReq");
    const filtro = document.getElementById("filtroEstado");
    if (buscador) buscador.addEventListener("input", aplicarFiltrosReq);
    if (filtro) filtro.addEventListener("change", aplicarFiltrosReq);
}

async function aplicarFiltrosReq() {
    const texto = document.getElementById("buscadorReq")?.value.toLowerCase() || "";
    const estadoFiltro = document.getElementById("filtroEstado")?.value || "";

    const reqs = await obtenerRequerimientos();

    const filtrados = reqs.filter(req => {
        const coincideTexto =
            (req.titulo || "").toLowerCase().includes(texto) ||
            (req.id || "").toLowerCase().includes(texto);

        const coincideEstado =
            !estadoFiltro ||
            (req.estado || "").trim().toLowerCase() === estadoFiltro.trim().toLowerCase();

        return coincideTexto && coincideEstado;
    });

    filtrados.sort((a, b) => (b.timestamp_ms || 0) - (a.timestamp_ms || 0));

    renderizarRequerimientos(filtrados);
    await actualizarContadorReq();
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

async function actualizarContadorReq() {
    const contador = document.getElementById("contadorReq");
    const usuario = localStorage.getItem("usuarioLogueado");
    if (!contador || !usuario) return;
    try {
        const reqs = await obtenerRequerimientos();
        contador.textContent = reqs.length;
    } catch (error) {
        console.error("Error actualizando contador:", error);
        contador.textContent = "0";
    }
}

function obtenerClaseEstado(estado) {

    if (!estado) return "";

    const e = estado.toString().trim().toLowerCase();

    if (e.includes("pendiente")) return "pendiente";
    if (e.includes("valid")) return "validacion";
    if (e.includes("listo")) return "validacion";
    if (e.includes("aprobado")) return "aprobado";
    if (e.includes("rechaz")) return "rechazado";
    if (e.includes("edit")) return "editado";

    console.warn("Estado no reconocido:", estado);
    return "";
}

function verDetalleReq(req) {
    localStorage.removeItem("reqValidandoId");
    localStorage.setItem("reqValidandoId", req.id);
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
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

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

        const lineasOriginales = element.innerText.trim().split("\n");

        lineasOriginales.forEach(linea => {
            const l = linea.trim();
            if (!l) return;

            const esTitulo = l.toUpperCase() === l && l.length < 60;
            const esSubtitulo = l.endsWith(":");

            let fontSize = 12;
            let fontStyle = "normal";
            if (esTitulo) { fontSize = 11; fontStyle = "bold"; }
            else if (esSubtitulo) { fontSize = 7; fontStyle = "bold"; }

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
        doc.text("Generado por Portal de Requerimientos", pageWidth / 2, pageHeight - 5, { align: "center" });
        doc.save(`Requerimiento_${reqId}.pdf`);

    } catch (error) {
        console.error("Error PDF:", error);
        alert("Error al generar PDF.");
    }
}


/* =========================
   VALIDACIÓN — BANDEJA
========================= */
async function cargarBandejaValidacion() {
    const contenedor = document.getElementById("listaRequerimientos");
    if (!contenedor) return;

    const rol = localStorage.getItem("rol");
    let vista = "validacion";

    const requerimientos = await obtenerRequerimientos(vista);

    requerimientos.sort((a, b) => (b.timestamp_ms || 0) - (a.timestamp_ms || 0));

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
                <div class="val-info-item">🚨 <span>${req.prioridad || "—"}</span></div>
            </div>
            <div class="val-card-footer">
                <span class="val-badge ${obtenerClaseEstado(req.estado)}">${req.estado}</span>
                <span style="font-size:12px;color:#2282bf;font-weight:500;">
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
    } else if (rol === "manager") {
        window.location.href = "resultado.html";
    } else {
        window.location.href = "resultado.html";
    }
}

/* =========================
   VALIDACIÓN — DETALLE
========================= */
async function cargarRequerimientoValidacion() {
    const contenedor = document.getElementById("resultadoContenido");
    if (!contenedor) return;

    const reqId = localStorage.getItem("reqValidandoId");
    if (!reqId) {
        contenedor.innerHTML = "⚠️ No hay requerimiento para validar.";
        return;
    }

    const reqActual = await obtenerRequerimientoPorId(reqId);

    if (!reqActual) {
        contenedor.innerHTML = "⚠️ No se encontró el requerimiento.";
        return;
    }

    let prioridadHTML = "";
    if (reqActual.prioridad) {
        prioridadHTML = `
            <div class="priority-badge ${reqActual.prioridad.toLowerCase()}">
                🚨 Prioridad: ${reqActual.prioridad}
            </div>`;
    }

    let alertaMotivo = "";
    if (reqActual.estado === "Rechazado" && reqActual.comentario) {
        alertaMotivo = `
            <div class="reject-alert" style="background:#fdf2f2;border-left:5px solid #e74c3c;padding:15px;margin-bottom:20px;border-radius:4px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                <h4 style="color:#e74c3c;margin:0;font-size:16px;">❌ Requerimiento Rechazado</h4>
                <p style="margin:8px 0 0;color:#555;font-size:14px;line-height:1.4;">
                    <strong>Motivo del rechazo:</strong> ${reqActual.comentario}
                </p>
            </div>`;
    }

    contenedor.innerHTML = alertaMotivo + prioridadHTML + (reqActual.contenido || "");

    // Adjuntos
    const adjuntos = Array.isArray(reqActual.adjuntos) ? reqActual.adjuntos : [];
    if (adjuntos.length > 0) {
        const adjDiv = document.createElement("div");
        adjDiv.className = "adjuntos-validacion";
        adjDiv.innerHTML = "<h3>📎 Adjuntos</h3>";
        adjuntos.forEach(adj => {
            const link = document.createElement("a");
            link.href = `data:${adj.tipo};base64,${adj.data}`;
            link.download = adj.nombre;
            link.textContent = adj.nombre;
            link.target = "_blank";
            link.style.display = "block";
            adjDiv.appendChild(link);
        });
        contenedor.appendChild(adjDiv);
    }

    const checkPO = document.getElementById("checkPO");
    const checkQA = document.getElementById("checkQA");
    if (checkPO && checkQA) {
        checkPO.checked = reqActual.check_po || false;
        checkQA.checked = reqActual.check_qa || false;
    }

    controlarValidaciones();
}

// Función para mostrar los adjuntos en resultado.html
function mostrarAdjuntos(adjuntos) {
    const lista = document.getElementById("listaAdjuntos");
    lista.innerHTML = "";

    if (!adjuntos || adjuntos.length === 0) {
        lista.innerHTML = "<p>No hay adjuntos.</p>";
        return;
    }

    adjuntos.forEach((archivo, index) => {
        const item = document.createElement("div");
        item.className = "adjunto-item";

        const link = document.createElement("a");
        link.href = `data:${archivo.tipo};base64,${archivo.data}`;
        link.download = archivo.nombre;
        link.textContent = archivo.nombre;
        link.target = "_blank";

        item.appendChild(link);
        lista.appendChild(item);
    });
}
async function cargarDocumento() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");

    if (!id) return;

    try {
        const res = await fetch(`http://localhost:3000/requerimientos/${id}`);
        const data = await res.json();

        if (data.success) {
            document.getElementById("resultadoContenido").innerHTML = data.data.contenido;

            mostrarAdjuntos(data.data.adjuntos);
        } else {
            document.getElementById("resultadoContenido").innerHTML = "No se encontró el documento.";
        }
    } catch (err) {
        console.error(err);
        document.getElementById("resultadoContenido").innerHTML = "Error cargando el documento.";
    }
}

/* =========================
   RECHAZO
========================= */
async function rechazarRequerimiento() {
    const reqId = localStorage.getItem("reqValidandoId");
    const txtMotivo = document.getElementById("motivoRechazo");
    const motivo = txtMotivo ? txtMotivo.value.trim() : "";
    const rol = localStorage.getItem("rol");

    if (rol !== "admin") {
        alert("🚫 Solo ADMIN puede rechazar.");
        return;
    }

    if (!motivo) {
        alert("⚠️ Ingresa un motivo.");
        txtMotivo?.focus();
        return;
    }

    if (!confirm(`¿Rechazar ${reqId}?`)) return;

    try {
        const ok = await actualizarRequerimiento(reqId, {
            estado: "Rechazado",
            comentario: motivo
        });

        if (!ok) {
            alert("❌ Error al rechazar.");
            return;
        }

        alert(`❌ Requerimiento ${reqId} rechazado`);
        window.location.href = "validacion.html";

    } catch (error) {
        console.error(error);
        alert("❌ Error de conexión.");
    }
}


/* =========================
   ENVIAR A JIRA
========================= */
async function enviarAJira(req) {
    try {
        const timestamp = Number(req.timestamp_ms);

        const fechaObj = !isNaN(timestamp) && timestamp > 0
            ? new Date(timestamp)
            : new Date();

        const fechaISO = fechaObj.toISOString();

        console.log("Fecha enviada a JIRA:", fechaISO);
        
        let centroCostoObjeto = null;

        if (req.centro_costo) {
            const partes = req.centro_costo.split(" - ");

            centroCostoObjeto = {
                id: partes[0].trim(),
                value: partes.slice(1).join(" - ").trim()
            };
        }

        const response = await fetch(`${API_URL}/crear-jira`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tipoCaso: {
                    TituloJira: req.titulo || "REQ",
                    Subject: req.titulo || "Sin asunto",
                    IdByProject: req.id || ""
                },
                textoFinal: req.contenido || "",
                fechaSolucion: req.fecha_solucion || null,
                fechaRegistro: fechaISO,
                encargadoId: req.encargado_id || null,
                customfield_10120: centroCostoObjeto,
                adjuntos: (Array.isArray(req.adjuntos) ? req.adjuntos : []).map(adj => ({
                    nombre: adj.nombre,
                    tipo: adj.tipo,
                    data: adj.data
                }))
            })
        });

        if (!response.ok) throw new Error("Error enviando a JIRA");

        const data = await response.json().catch(() => ({}));
        console.log("Respuesta webhook JIRA:", data);

        const rol = localStorage.getItem("rol");

        const actualizado = await actualizarRequerimiento(req.id, {
            estado: "Aprobado",
            rol: rol
        });

        if (!actualizado) {
            alert("Se envió a JIRA pero no se pudo actualizar el estado.");
            return false;
        }

        return true;

    } catch (error) {
        console.error("Error JIRA:", error);
        alert("❌ Error enviando a JIRA");
        return false;
    }
}


/* =========================
   CONTROLAR VALIDACIONES (UI)
========================= */
function controlarValidaciones() {
    const checkPO = document.getElementById("checkPO");
    const checkQA = document.getElementById("checkQA");
    const btnEnviar = document.getElementById("btnEnviarJira");
    const estadoBadge = document.getElementById("estadoValidacion");

    if (!checkPO || !checkQA || !btnEnviar) return;

    btnEnviar.disabled = false;

    if (checkPO.checked && checkQA.checked) {
        if (estadoBadge) { estadoBadge.className = "status-badge success"; estadoBadge.textContent = "Listo para enviar"; }
    } else if (checkPO.checked || checkQA.checked) {
        if (estadoBadge) { estadoBadge.className = "status-badge warning"; estadoBadge.textContent = "En validación"; }
    } else {
        if (estadoBadge) { estadoBadge.className = "status-badge warning"; estadoBadge.textContent = "Pendiente de validaciones"; }
    }
}


/* =========================
   GUARDAR EDICIÓN
========================= */
async function guardarEdicion() {
    const rol = localStorage.getItem("rol");
    if (rol !== "admin") {
        alert("🚫 No tienes permisos para editar.");
        return;
    }

    const editor = document.getElementById("editorContenido");
    const reqId = localStorage.getItem("reqValidandoId");

    if (!editor || !reqId) {
        alert("⚠️ No se pudo identificar el requerimiento a editar.");
        return;
    }

    const nuevoHTML = editor.innerHTML;
    if (!nuevoHTML.trim()) {
        alert("⚠️ El contenido no puede estar vacío.");
        return;
    }

    try {
        const ok = await actualizarRequerimiento(reqId, {
            contenido: nuevoHTML,
            estado: "Editado"
        });

        if (!ok) {
            alert("❌ Error al guardar los cambios. Intenta nuevamente.");
            return;
        }

        localStorage.setItem("reqTemporal", nuevoHTML);
        alert(`✅ Requerimiento ${reqId} guardado exitosamente`);
        window.location.href = "validacion.html";

    } catch (error) {
        console.error("Error guardando edición:", error);
        alert("❌ Error de conexión al guardar. Intenta nuevamente.");
    }
}


/* =========================
   BOTONES NAVEGACIÓN
========================= */
function verPDF() { window.location.href = "resultado.html"; }
function editarPDF() { window.location.href = "editar.html"; }


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

        const icono = document.getElementById("perfilIcono");
        if (icono && u.genero) {
            icono.src = u.genero === "F" ? "img/mujer.png"
                : u.genero === "M" ? "img/hombre.png"
                    : "img/avatar.png";
        }

    } catch (error) {
        console.error("Error cargando perfil:", error);
        alert("Error de conexión con el servidor");
    }
}


/* =========================
   CAMBIAR CONTRASEÑA
========================= */
async function cambiarPassword() {
    const usuario = localStorage.getItem("usuarioLogueado");
    const actual = document.getElementById("passActual").value;
    const nueva = document.getElementById("passNueva").value;

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

        if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);

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
        console.error("Error cambiar-password:", error);
        alert("Error de conexión al cambiar la contraseña");
    }
}

/* =========================
   GUARDAR CHECKS EN BD AL CAMBIAR
========================= */
document.addEventListener("DOMContentLoaded", () => {
    const checkPO = document.getElementById("checkPO");
    const checkQA = document.getElementById("checkQA");

    if (checkPO) checkPO.addEventListener("change", () => handleCheckChange());
    if (checkQA) checkQA.addEventListener("change", () => handleCheckChange());
});

async function handleCheckChange() {
    const checkPO = document.getElementById("checkPO");
    const checkQA = document.getElementById("checkQA");
    const btnEnviar = document.getElementById("btnEnviarJira");
    const estadoBadge = document.getElementById("estadoValidacion");
    const reqId = localStorage.getItem("reqValidandoId");

    if (!reqId) return;

    if (checkPO.checked && checkQA.checked) {

        btnEnviar.disabled = false;

        if (estadoBadge) {
            estadoBadge.className = "status-badge success";
            estadoBadge.textContent = "Listo para enviar";
        }

    } else if (checkPO.checked || checkQA.checked) {

        btnEnviar.disabled = true;

        if (estadoBadge) {
            estadoBadge.className = "status-badge warning";
            estadoBadge.textContent = "En validación";
        }

    } else {

        btnEnviar.disabled = true;

        if (estadoBadge) {
            estadoBadge.className = "status-badge warning";
            estadoBadge.textContent = "Pendiente";
        }
    }

    try {
        const response = await fetch(`${API_URL}/requerimientos/${reqId}/validacion`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                po: checkPO.checked,
                qa: checkQA.checked
            })
        });

        const data = await response.json();
        console.log("Respuesta validación:", data);

    } catch (error) {
        console.error("❌ Error guardando validación:", error);
    }
}

/* =========================
   INIT GENERAL & SEGURIDAD
========================= */
document.addEventListener("DOMContentLoaded", () => {

    const usuario = localStorage.getItem("usuarioLogueado");
    const rol = localStorage.getItem("rol");
    const paginaActual = window.location.pathname.split("/").pop() || "index.html";
    const enLogin = paginaActual === "index.html";

    // ── Protección de acceso ──
    if (!usuario && !enLogin) {
        window.location.href = "index.html";
        return;
    }

    const paginasSoloAdmin = ["validacionRequerimiento.html", "editar.html"];
    if (rol !== "admin" && paginasSoloAdmin.includes(paginaActual)) {
        window.location.href = "inicio.html";
        return;
    }

    const paginasSoloAdminManager = ["validacion.html"];
    if (paginasSoloAdminManager.includes(paginaActual) && rol !== "admin" && rol !== "manager") {
        window.location.href = "inicio.html";
        return;
    }

    // ── Interfaz según rol ──
    if (rol === "manager") document.body.classList.add("manager");

    if (rol === "user") {
        ["cardValidar", "navValidar", "btnEnviarJira"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
        });
    }

    if (usuario) {
        localStorage.setItem("ultimaActividad", Date.now());
        setInterval(verificarInactividad, 30000);
    }

    if (paginaActual === "nuevo.html") {
        localStorage.setItem("threadId", generarThreadId());
    }

    // ── Teclado ──
    const passwordInput = document.getElementById("password");
    if (passwordInput) {
        passwordInput.addEventListener("keydown", e => {
            if (e.key === "Enter") { e.preventDefault(); login(); }
        });
    }

    const userInput = document.getElementById("userInput");
    if (userInput) {
        userInput.addEventListener("keydown", e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
    }

    // ── Adjuntos ──
    const fileInput = document.getElementById("fileInput");
    const filePreview = document.getElementById("filePreview");
    if (fileInput && filePreview) {
        fileInput.addEventListener("change", function () {
            for (let i = 0; i < this.files.length; i++) {
                archivosTemporalesGlobal.push(this.files[i]);
            }
            renderFilePreview();
            fileInput.value = "";
        });
    }

    // ── MIS REQUERIMIENTOS ──
    if (paginaActual === "misRequerimientos.html") {
        (async () => {
            const contenedorLista = document.getElementById("listaRequerimientos");
            if (!contenedorLista) return;

            contenedorLista.innerHTML = '<div class="empty-state">⏳ Cargando requerimientos...</div>';

            try {
                const requerimientos = await obtenerRequerimientos("mis");
                await actualizarContadorReq();

                if (requerimientos.length === 0) {
                    contenedorLista.innerHTML = '<div class="empty-state">📭 No tienes requerimientos registrados.</div>';
                } else {
                    contenedorLista.innerHTML = "";
                    requerimientos.forEach(req => {
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
                        contenedorLista.appendChild(fila);
                    });
                }

                await aplicarFiltrosReq();
                cargarEventosReq();

            } catch (error) {
                console.error("Error cargando mis requerimientos:", error);
                contenedorLista.innerHTML = '<div class="empty-state">❌ Error al cargar. Intenta recargar la página.</div>';
            }
        })();
    }

    // ── RESULTADO / DETALLE ──
    if (paginaActual === "resultado.html") {
        (async () => {
            const contenedorContenido = document.getElementById("resultadoContenido");
            if (!contenedorContenido) return;

            contenedorContenido.innerHTML = "<p>⏳ Cargando documento...</p>";

            const reqId = localStorage.getItem("reqValidandoId");
            if (!reqId) {
                contenedorContenido.innerHTML = "⚠️ No hay requerimiento para mostrar.";
                return;
            }

            try {
                const reqDetalle = await obtenerRequerimientoPorId(reqId);

                if (!reqDetalle) {
                    contenedorContenido.innerHTML = "⚠️ No se encontró el requerimiento.";
                    return;
                }

                let alertaMotivo = "";
                if (reqDetalle.estado === "Rechazado" && reqDetalle.comentario) {
                    alertaMotivo = `
                        <div class="reject-alert" style="background:#fdf2f2;border-left:5px solid #e74c3c;padding:15px;margin-bottom:20px;border-radius:4px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                            <h4 style="color:#e74c3c;margin:0;font-size:16px;">❌ Requerimiento Rechazado</h4>
                            <p style="margin:8px 0 0;color:#555;font-size:14px;line-height:1.4;">
                                <strong>Motivo del rechazo:</strong> ${reqDetalle.comentario}
                            </p>
                        </div>`;
                }

                contenedorContenido.innerHTML = alertaMotivo + (reqDetalle.contenido || "⚠️ No hay documento para mostrar.");

                const adjuntos = Array.isArray(reqDetalle.adjuntos) ? reqDetalle.adjuntos : [];

                if (adjuntos.length > 0) {

                    const lista = document.getElementById("listaAdjuntos");
                    lista.innerHTML = "";

                    adjuntos.forEach(adj => {

                        const item = document.createElement("div");
                        item.className = "adjunto-item";

                        const link = document.createElement("a");
                        link.href = `data:${adj.tipo};base64,${adj.data}`;
                        link.textContent = adj.nombre;
                        link.target = "_blank";
                        link.download = adj.nombre;

                        item.appendChild(link);
                        lista.appendChild(item);
                    });
                }

            } catch (error) {
                console.error("Error cargando detalle:", error);
                contenedorContenido.innerHTML = "❌ Error al cargar el documento. Intenta recargar la página.";
            }
        })();
    }

    // ── VALIDACIÓN ──
    if (paginaActual === "validacion.html") {
        cargarBandejaValidacion();
    }

    if (paginaActual === "validacionRequerimiento.html") {
        cargarRequerimientoValidacion();
        controlarValidaciones();
    }

    // ── EDITOR ──
    if (paginaActual === "editar.html") {
        const contenidoHTML = localStorage.getItem("reqTemporal");
        const editor = document.getElementById("editorContenido");
        if (contenidoHTML && editor) editor.innerHTML = contenidoHTML;
    }

    // ── Botón enviar a JIRA ──
    const btnEnviar = document.getElementById("btnEnviarJira");
    if (btnEnviar) {
        btnEnviar.addEventListener("click", async () => {
            const reqId = localStorage.getItem("reqValidandoId");
            const checkPO = document.getElementById("checkPO");
            const checkQA = document.getElementById("checkQA");

            if (rol !== "admin") return alert("🚫 Solo ADMIN puede enviar a JIRA.");
            if (!checkPO?.checked) return alert("⚠️ Falta la validación del Product Owner (PO).");
            if (!checkQA?.checked) return alert("⚠️ Falta la validación de QA.");
            if (!confirm(`🚀 ¿Enviar requerimiento ${reqId} a JIRA?`)) return;

            try {
                const req = await obtenerRequerimientoPorId(reqId);
                if (!req) return alert("⚠️ Requerimiento no encontrado");

                const enviado = await enviarAJira(req);
                if (!enviado) return;

                const ok = await actualizarRequerimiento(reqId, {
                    estado: "Aprobado",
                    enviado_jira: true,
                    fecha_envio_jira: new Date().toLocaleString()
                });

                if (!ok) {
                    alert("⚠️ Se envió a JIRA pero no se pudo actualizar el estado. Contacta al administrador.");
                    return;
                }

                alert(`✅ Requerimiento ${reqId} enviado a JIRA 🚀`);
                window.location.href = "validacion.html";

            } catch (error) {
                console.error("Error enviando a JIRA:", error);
                alert("❌ Error de conexión al enviar a JIRA. Intenta nuevamente.");
            }
        });
    }

    if (typeof scrollToBottom === "function") scrollToBottom(true);
});