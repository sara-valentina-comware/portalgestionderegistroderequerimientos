
function login() {
    const usuario = document.getElementById("usuario").value.trim();
    const password = document.getElementById("password").value.trim();

    if (usuario === "admin" && password === "12345") {
        localStorage.setItem("usuarioLogueado", usuario);
        window.location.href = "inicio.html";
    } else {
        alert("Usuario o contraseña incorrectos");
    }
}

function logout() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "login.html";
}

function irNuevo() {
    window.location.href = "nuevo.html";
}

function irPreview() {
    const data = {
        titulo: document.getElementById("titulo").value.trim(),
        prioridad: document.getElementById("prioridad").value,
        servicio: document.getElementById("servicio").value,
        problema: document.getElementById("problema").value.trim(),
        descripcion: document.getElementById("descripcion").value.trim(),
        alcance: document.getElementById("alcance").value.trim(),
        centro_costos: document.getElementById("centro_costos").value,
        criterios: document.getElementById("criterios").value.trim(),
        impacto: document.getElementById("impacto").value.trim(),
        beneficio: document.getElementById("beneficio").value.trim()
    };

    if (!data.titulo || !data.problema || !data.descripcion) {
        alert("Por favor complete los campos obligatorios (*)");
        return;
    }

    localStorage.setItem("reqTemporal", JSON.stringify(data));

    window.location.href = "preview.html";
}


function irResultado() {
    window.location.href = "resultado.html";
}

function editar() {
    window.location.href = "nuevo.html";
}

function cargarFormulario() {
    const data = JSON.parse(localStorage.getItem("reqTemporal"));

    // Si hay datos, los carga; si no, mantiene los campos vacíos
    if (data) {
        document.getElementById("titulo").value = data.titulo || "";
        document.getElementById("prioridad").value = data.prioridad || "";
        document.getElementById("servicio").value = data.servicio || "";
        document.getElementById("problema").value = data.problema || "";
        document.getElementById("descripcion").value = data.descripcion || "";
        document.getElementById("alcance").value = data.alcance || "";
        document.getElementById("centro_costos").value = data.centro_costos || "";
        document.getElementById("criterios").value = data.criterios || "";
        document.getElementById("impacto").value = data.impacto || "";
        document.getElementById("beneficio").value = data.beneficio || "";
    } else {
        // Limpiar todos los campos por si hay datos previos
        document.getElementById("titulo").value = "";
        document.getElementById("prioridad").value = "";
        document.getElementById("servicio").value = "";
        document.getElementById("problema").value = "";
        document.getElementById("descripcion").value = "";
        document.getElementById("alcance").value = "";
        document.getElementById("centro_costos").value = "";
        document.getElementById("criterios").value = "";
        document.getElementById("impacto").value = "";
        document.getElementById("beneficio").value = "";
    }
}

function nuevoRequerimiento() {
    localStorage.removeItem("reqTemporal");
    window.location.href = "nuevo.html";
}

// Al cargar la página
if (window.location.pathname.includes("nuevo.html")) {
    cargarFormulario();
}

function cargarResultado() {

    const data = JSON.parse(localStorage.getItem("reqTemporal"));

    if (!data) {
        document.getElementById("resultadoContenido").innerHTML =
            "No se encontró información del requerimiento.";
        return;
    }

    const documento = `
        <h2>${data.titulo}</h2>

        <hr>

        <h3>1. Información General</h3>
        <p><strong>Aplicativo:</strong> ${data.servicio}</p>
        <p><strong>Prioridad:</strong> ${data.prioridad}</p>
        <p><strong>Centro de Costos:</strong> ${data.centro_costos}</p>

        <hr>

        <h3>2. Problema Actual</h3>
        <p>${data.problema}</p>

        <h3>3. Descripción del Requerimiento</h3>
        <p>${data.descripcion}</p>

        <hr>

        <h3>4. Alcance</h3>
        <p>${data.alcance}</p>

        <h3>5. Criterios de Aceptación</h3>
        <p>${data.criterios}</p>

        <hr>

        <h3>6. Impacto si no se realiza</h3>
        <p>${data.impacto}</p>

        <h3>7. Beneficio Esperado</h3>
        <p>${data.beneficio}</p>

        <hr>

        <p><strong>Conclusión:</strong> 
        El requerimiento se encuentra listo para aprobación y envío a JIRA.
        </p>
    `;

    document.getElementById("resultadoContenido").innerHTML = documento;
}

if (window.location.pathname.includes("resultado.html")) {
    cargarResultado();
}

/* SEGURIDAD BÁSICA */

window.onload = function () {

    if (!localStorage.getItem("usuarioLogueado") &&
        !window.location.pathname.includes("login")) {
        window.location.href = "login.html";
    }
};
