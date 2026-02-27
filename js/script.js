const API_URL = "http://localhost:3000";
const JIRA_WEBHOOK_URL = "https://n8n.comware.com.co/webhook-test/portal/jira";
const NOVA_URL = "https://n8n.comware.com.co/webhook/chat-portalgestionderegistroderequerimientos";
const STORAGE_KEY_REQ = "requerimientos";
const TIEMPO_EXPIRACION = 10 * 60 * 1000;
let archivosTemporalesGlobal = [];

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

function removeFile(index = null) {
    const fileInput = document.getElementById("fileInput");
    const filePreview = document.getElementById("filePreview");

    if (index === null) {
        // limpiar todo
        archivosTemporalesGlobal = [];
        if (fileInput) fileInput.value = "";
        if (filePreview) filePreview.innerHTML = "";
    } else {
        // eliminar uno específico
        archivosTemporalesGlobal.splice(index, 1);
        renderFilePreview();
    }
}

/* =========================
   LOGIN / LOGOUT
========================= */
async function login() {
    // Convertimos el usuario a minúsculas
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
            // Guardamos el usuario en minúsculas también para consistencia
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
    const files = [...archivosTemporalesGlobal];

    function convertirABase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve({
                nombre: file.name,
                tipo: file.type,
                data: e.target.result
            });
            reader.onerror = e => reject(`Error leyendo ${file.name}`);
            reader.readAsDataURL(file);
        });
    }

    if (!userText && files.length === 0) return;

    actualizarActividad();

    // Mostrar mensaje usuario
    const userMsg = document.createElement("div");
    userMsg.className = "message user";
    userMsg.innerHTML = `<div class="message-content">${userText}${files.length > 0 ? `<br><small>📎 ${files.map(f => f.name).join("<br>📎 ")}</small>` : ""}</div><div class="message-icon"><img src="img/avatar.png"></div>`;
    chat.appendChild(userMsg);
    scrollToBottom(true);

    input.value = "";
    removeFile();

    // Mensaje "NOVA escribiendo"
    const typingMsg = document.createElement("div");
    typingMsg.className = "message bot typing";
    typingMsg.innerHTML = `<div class="message-icon"><img src="img/bot.png"></div><div class="message-content">NOVA está escribiendo...</div>`;
    chat.appendChild(typingMsg);
    scrollToBottom(true);

    try {
        const formData = new FormData();
        formData.append("message", userText);
        formData.append("threadId", localStorage.getItem("threadId"));
        files.forEach(file => {
            formData.append("files", file);
        });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(NOVA_URL, {
            method: "POST",
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) throw new Error("Respuesta inválida del servidor");

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (error) {
            typingMsg.remove();
            const errorMsg = document.createElement("div");
            errorMsg.className = "message bot";
            errorMsg.innerHTML = `
                <div class="message-icon"><img src="img/bot.png"></div>
                <div class="message-content">
                    ⚠️ NOVA no respondió. Verifica el webhook o intenta nuevamente.
                </div>
            `;
            chat.appendChild(errorMsg);
            return;
        }

        const respuestaFinal = (data.reply || "").trim();

        // Detectar Plantilla Final Generada
        if (respuestaFinal.toLowerCase().includes("plantilla final generada")) {
            const usuario = localStorage.getItem("usuarioLogueado");
            const idReq = "REQ_" + Date.now();
            const htmlGenerado = convertirPlantillaAHTML(respuestaFinal);
            const tituloDetectado = extraerTitulo(respuestaFinal) || "Requerimiento sin título";

            let adjuntosGuardados = [];
            for (const file of files) {
                const archivoBase64 = await convertirABase64(file);
                adjuntosGuardados.push(archivoBase64);
            }

            // Ahora sí limpiar
            removeFile();
            
            archivosTemporalesGlobal = [];

            const db = JSON.parse(localStorage.getItem(STORAGE_KEY_REQ)) || [];
            db.push({
                id: idReq,
                titulo: tituloDetectado,
                autor: usuario,
                fecha: new Date().toLocaleString(),
                timestamp: Date.now(),
                contenido: htmlGenerado,
                estado: "Pendiente",

                prioridad: normalizarPrioridad(
                    data.prioridad || extraerPrioridadTexto(respuestaFinal)
                ),

                // CAMPOS NECESARIOS PARA JIRA
                tipoCaso: "Requerimiento",
                fechaSolucion: data.fechaSolucion || null,
                encargadoId: data.encargadoId || null,
                centro_costo: data.customfield_10120
                    || (data.customFields && data.customFields["10120"])
                    || extraerCentroCostoTexto(respuestaFinal)
                    || null,

                adjuntos: adjuntosGuardados
            });
            localStorage.setItem(STORAGE_KEY_REQ, JSON.stringify(db));
        }

        // Mostrar respuesta NOVA
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

    // Convertir <br> en saltos de línea
    const limpio = texto.replace(/<br\s*\/?>/gi, "\n");

    const lineas = limpio.split("\n");

    for (let i = 0; i < lineas.length; i++) {
        const l = lineas[i].trim();

        // Detectar múltiples formas válidas
        if (/(nombre\s+del\s+(servicio|requerimiento)|t[íi]tulo|servicio)/i.test(l)) {

            // Caso: "Titulo: algo"
            if (l.includes(":")) {
                const partes = l.split(":");
                const posible = partes.slice(1).join(":").trim();
                if (posible && posible.length > 3) {
                    return posible;
                }
            }

            // Caso: título en la siguiente línea
            const siguiente = lineas[i + 1]?.trim();
            if (siguiente && siguiente.length > 3 && !/^-+$/.test(siguiente)) {
                return siguiente;
            }
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
            if (partes.length > 1 && partes[1].trim()) {
                return partes[1].trim();
            }

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
            if (siguiente && !/impacto/i.test(siguiente)) {
                return normalizarPrioridad(siguiente);
            }
        }
    }

    return null;
}
function normalizarPrioridad(valor) {
    if (!valor) return null;

    const v = valor
        .replace(/\./g, "")
        .trim()
        .toLowerCase();

    if (v.includes("alta")) return "Alta";
    if (v.includes("media")) return "Media";
    if (v.includes("baja")) return "Baja";
    if (v.includes("crit")) return "Crítica";

    return valor.trim();
}


function convertirPlantillaAHTML(texto) {
    if (!texto) return "";

    let textoLimpio = texto
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/\*/g, "");

    const lineas = textoLimpio.split("\n");

    let html = `<div class="doc-pro-view">`;
    let enLista = false;

    let tituloPrincipal = null;

    const cerrarLista = () => {
        if (enLista) {
            html += `</ul>`;
            enLista = false;
        }
    };

    lineas.forEach((linea, index) => {
        let l = linea.trim();
        if (!l) return;

        // 🔥 EXTRAER TITULO Y NO MOSTRARLO COMO CONTENIDO
        if (/^t[íi]tulo del requerimiento/i.test(l)) {
            const partes = l.split(":");
            tituloPrincipal = partes.slice(1).join(":").trim();
            return; // ❌ No se renderiza esta línea
        }

        // 🔥 REEMPLAZAR "PLANTILLA FINAL GENERADA" POR EL TITULO REAL
        if (/^Plantilla Final Generada/i.test(l)) {
            cerrarLista();
            html += `<h1 class="doc-main-title">📄 ${tituloPrincipal || "Requerimiento"}</h1>`;
        }

        // FASES
        else if (/^Fase\s+\d+/i.test(l)) {
            cerrarLista();
            html += `<h2 class="doc-phase">${l}</h2>`;
        }

        // TITULOS IMPORTANTES
        else if (
            /^(Tipo de gestión|Análisis de impacto|Impacto actual|Riesgos si NO|Impacto esperado|Prioridad asignada|Definición funcional|Reglas de negocio|Sistemas y componentes involucrados|Ambientes involucrados|Criterios de aceptación|Alcance del requerimiento|Datos formales|Adjuntos asociados|Riesgos identificados|Beneficios esperados|Usuarios afectados|Área o proceso impactado|Objetivo de la solución|Descripción breve de la necesidad|Problema que se busca resolver|Descripción del proceso actual|Descripción general de la solución requerida|Exclusiones del alcance|Implicaciones si no se realiza la solución|Área técnica responsable del desarrollo|Autor del requerimiento|Centro de Costos asociado)/i.test(l)
        ) {
            cerrarLista();
            html += `<h2 class="doc-section-title">${l}</h2>`;
        }

        // AS-IS / TO-BE
        else if (/AS-IS|TO-BE/i.test(l)) {
            cerrarLista();
            html += `<h3 class="doc-subtitle">${l}</h3>`;
        }

        // LABELS
        else if (l.endsWith(":")) {
            cerrarLista();
            html += `<h4 class="doc-label">${l}</h4>`;
        }

        // BULLETS
        else if (/^[-•]/.test(l)) {
            if (!enLista) {
                html += `<ul class="doc-list">`;
                enLista = true;
            }
            html += `<li>${l.replace(/^[-•]\s*/, "")}</li>`;
        }

        // TEXTO NORMAL
        else {
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
                <div class="val-info-item">🚨 <span>${req.prioridad}</span></div>
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

    // HTML del requerimiento
    const reqHTML = localStorage.getItem("reqTemporal") || reqActual?.contenido;

    if (!reqHTML) {
        contenedor.innerHTML = "⚠️ No hay requerimiento para validar.";
        return;
    }

    // Prioridad
    let prioridadHTML = "";

    if (reqActual?.prioridad) {
        prioridadHTML = `
            <div class="priority-badge ${reqActual.prioridad.toLowerCase()}">
                🚨 Prioridad: ${reqActual.prioridad}
            </div>
        `;
    }

    // Banner Rechazado
    let alertaMotivo = "";

    if (reqActual?.estado === "Rechazado" && reqActual?.comentario) {
        alertaMotivo = `
            <div class="reject-alert" style="
                background: #fdf2f2;
                border-left: 5px solid #e74c3c;
                padding: 15px;
                margin-bottom: 20px;
                border-radius: 4px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            ">
                <h4 style="color: #e74c3c; margin: 0; font-size: 16px;">
                    ❌ Requerimiento Rechazado
                </h4>
                <p style="margin: 8px 0 0; color: #555; font-size: 14px; line-height: 1.4;">
                    <strong>Motivo del rechazo:</strong> ${reqActual.comentario}
                </p>
            </div>
        `;
    }

    contenedor.innerHTML = alertaMotivo + prioridadHTML + reqHTML;

    // Adjuntos
    if (reqActual?.adjuntos?.length > 0) {
        const adjDiv = document.createElement("div");
        adjDiv.className = "adjuntos-validacion";
        adjDiv.innerHTML = "<h3>📎 Adjuntos</h3>";

        reqActual.adjuntos.forEach(adj => {
            const link = document.createElement("a");
            link.href = adj.data;
            link.download = adj.nombre;
            link.textContent = adj.nombre;
            link.style.display = "block";
            adjDiv.appendChild(link);
        });

        contenedor.appendChild(adjDiv);
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

            // Resetear los checks de aprobación al rechazar
            const validaciones = JSON.parse(localStorage.getItem("validaciones")) || {};
            validaciones[reqId] = { po: false, qa: false };

            localStorage.setItem(STORAGE_KEY_REQ, JSON.stringify(requerimientos));
            localStorage.setItem("validaciones", JSON.stringify(validaciones));

            alert(`❌ Requerimiento ${reqId} se rechazo correctamente!`);
            window.location.href = "validacion.html";
        }
    }
}

// ENVIAR A JIRA
async function enviarAJira(req) {
    try {
        console.log("Enviando a JIRA:", req);

        const response = await fetch(JIRA_WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({

                tipoCaso: {
                    TituloJira: req.titulo || "REQ",
                    Subject: req.titulo || "Sin asunto",
                    IdByProject: req.id || ""
                },

                textoFinal: req.contenido || "",
                fechaSolucion: req.fechaSolucion || null,
                fechaRegistro: req.timestamp
                    ? new Date(req.timestamp).toISOString()
                    : new Date().toISOString(),

                encargadoId: req.encargadoId || null,

                customfield_10120: req.centro_costo || null,

                adjuntos: (req.adjuntos || []).map(adj => ({
                    nombre: adj.nombre,
                    tipo: adj.tipo,
                    base64: adj.data.split(",")[1]
                }))

            })
        });

        if (!response.ok) {
            throw new Error("Error enviando a JIRA");
        }

        const data = await response.json().catch(() => ({}));
        console.log("Respuesta webhook JIRA:", data);

        return true;

    } catch (error) {
        console.error("Error JIRA:", error);
        alert("❌ Error enviando a JIRA");
        return false;
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

    if (index >= 0) {
        requerimientos[index].estado = nuevoEstado;
        localStorage.setItem(STORAGE_KEY_REQ, JSON.stringify(requerimientos));
    }
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

        const icono = document.getElementById("perfilIcono");

        if (icono && u.genero) {
            if (u.genero === "F") {
                icono.src = "img/mujer.png";
            }
            else if (u.genero === "M") {
                icono.src = "img/hombre.png";
            }
            else {
                icono.src = "img/avatar.png";
            }
        }

        console.log("Perfil recibido:", u);
    } catch (error) {
        console.error("Error cargando perfil:", error);
        alert("Error de conexión con el servidor");
    }
}

// CAMBIAR CONTRASEÑA
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

        if (!resp.ok) {
            throw new Error(`HTTP error! status: ${resp.status}`);
        }

        const data = await resp.json();
        console.log("Respuesta cambiar-password:", data);

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
        alert("Error de conexión o servidor al cambiar la contraseña");
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

    // Protección de acceso y Seguridad
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
    if (paginasSoloAdminManager.includes(paginaActual) && (rol !== "admin" && rol !== "manager")) {
        window.location.href = "inicio.html";
        return;
    }
    // Configuración de Interfaz según Rol
    if (rol === "manager") document.body.classList.add("manager");

    if (rol === "user") {
        const elementosOcultar = ["cardValidar", "navValidar", "btnEnviarJira"];
        elementosOcultar.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
        });
    }

    if (usuario) {
        localStorage.setItem("ultimaActividad", Date.now());
        setInterval(verificarInactividad, 30000);
    }

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

    // Previsualización de Adjuntos (Global)
    function renderFilePreview() {

    const filePreview = document.getElementById("filePreview");
    if (!filePreview) return;

    filePreview.innerHTML = "";

    archivosTemporalesGlobal.forEach((file, index) => {

        const fileItem = document.createElement("div");
        fileItem.className = "file-item";

        fileItem.innerHTML = `
            📎 ${file.name}
            <button onclick="removeFile(${index})">❌</button>
        `;

        filePreview.appendChild(fileItem);
    });
}

    const fileInput = document.getElementById("fileInput");
    const filePreview = document.getElementById("filePreview");

    if (fileInput && filePreview) {
        fileInput.addEventListener("change", function () {

            for (let i = 0; i < this.files.length; i++) {
                archivosTemporalesGlobal.push(this.files[i]);
            }

            renderFilePreview();

            // Permite volver a subir el mismo archivo
            fileInput.value = "";
        });
    }

    // --- MIS REQUERIMIENTOS ---
    const contenedorLista = document.getElementById("listaRequerimientos");
    if (contenedorLista && paginaActual === "misRequerimientos.html") {
        const requerimientos = obtenerRequerimientos();
        const propios = requerimientos.filter(r =>
            r.autor?.trim().toLowerCase() === usuario.trim().toLowerCase()
        );

        actualizarContadorReq();

        if (propios.length === 0) {
            contenedorLista.innerHTML = '<div class="empty-state">📭 No tienes requerimientos registrados.</div>';
        } else {
            contenedorLista.innerHTML = "";
            propios.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .forEach(req => {
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
        aplicarFiltrosReq();
        cargarEventosReq();
    }

    // --- RESULTADO / DETALLE ---
    if (paginaActual === "resultado.html") {
        const contenedorContenido = document.getElementById("resultadoContenido");
        if (!contenedorContenido) return;

        let reqDetalle = null;
        const reqIdValidando = localStorage.getItem("reqValidandoId");
        const db = obtenerRequerimientos();

        if (reqIdValidando && localStorage.getItem("origenNavegacion") === "validacion") {
            reqDetalle = db.find(r => r.id === reqIdValidando) || null;
            // Limpiamos reqDetalle viejo
            localStorage.removeItem("reqDetalle");
        } else if (localStorage.getItem("reqDetalle")) {
            const temp = JSON.parse(localStorage.getItem("reqDetalle"));

            // 🔥 Buscar siempre el requerimiento real desde la base
            reqDetalle = db.find(r => r.id === temp.id) || temp;
        }

        if (!reqDetalle) {
            contenedorContenido.innerHTML = "⚠️ No hay requerimiento para mostrar.";
            return;
        }

        // Banner de rechazo si aplica
        let alertaMotivo = "";
        if (reqDetalle.estado === "Rechazado" && reqDetalle.comentario) {
            alertaMotivo = `
        <div class="reject-alert" style="background: #fdf2f2; border-left: 5px solid #e74c3c; padding: 15px; margin-bottom: 20px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <h4 style="color: #e74c3c; margin: 0; font-size: 16px;">❌ Requerimiento Rechazado</h4>
            <p style="margin: 8px 0 0; color: #555; font-size: 14px; line-height: 1.4;">
                <strong>Motivo del rechazo:</strong> ${reqDetalle.comentario}
            </p>
        </div>`;
        }

        contenedorContenido.innerHTML = alertaMotivo + (reqDetalle.contenido || "⚠️ No hay documento para mostrar.");

        // Mostrar adjuntos si existen
        if (reqDetalle.adjuntos?.length > 0) {
            const adjDiv = document.getElementById("adjuntosContainer") || document.createElement("div");
            adjDiv.id = "adjuntosContainer";
            adjDiv.innerHTML = "<h3>📎 Adjuntos</h3>";
            reqDetalle.adjuntos.forEach(adj => {
                const link = document.createElement("a");
                link.href = adj.data;
                link.download = adj.nombre;
                link.textContent = adj.nombre;
                link.style.display = "block";
                adjDiv.appendChild(link);
            });
            contenedorContenido.appendChild(adjDiv);
        }
    }

    if (paginaActual === "validacion.html") {
        cargarBandejaValidacion();
    }

    if (paginaActual === "validacionRequerimiento.html") {
        cargarRequerimientoValidacion();
        controlarValidaciones();
    }

    // --- EDITOR ---
    if (paginaActual === "editar.html") {
        const contenidoHTML = localStorage.getItem("reqTemporal");
        const editor = document.getElementById("editorContenido");
        if (contenidoHTML && editor) editor.innerHTML = contenidoHTML;
    }

    document.addEventListener("change", (e) => {
        if (e.target.id === "checkPO" || e.target.id === "checkQA") {
            guardarValidacionEstado();
            controlarValidaciones();
        }
    });

    // Boton enviar a JIRA
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

            const requerimientos = obtenerRequerimientos();
            const index = requerimientos.findIndex(r => r.id === reqId);

            if (index === -1) return alert("⚠️ Requerimiento no encontrado");


            const req = requerimientos[index];

            // Enviar al webhook
            const enviado = await enviarAJira(req);

            if (!enviado) return;

            requerimientos[index].estado = "Aprobado";
            requerimientos[index].enviadoAJira = true;
            requerimientos[index].fechaEnvioJira = new Date().toLocaleString();

            localStorage.setItem("requerimientos", JSON.stringify(requerimientos));

            alert(`✅ Requerimiento ${reqId} enviado a JIRA 🚀`);
            window.location.href = "validacion.html";
        });
    }

    // Finalizar scroll
    if (typeof scrollToBottom === "function") scrollToBottom(true);
});