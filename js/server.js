require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const app = express();

app.use(cors());
app.use(express.json());


/* POSTGRES CONNECTION */
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "false"
        ? { rejectUnauthorized: false }
        : false
});

pool.query("SELECT NOW()")
    .then(res => console.log("DB conectada:", res.rows[0]))
    .catch(err => console.error("Error DB:", err));


/* LOGIN */
app.post("/login", async (req, res) => {

    const { usuario, password } = req.body;

    console.log("Intento login:", usuario);

    try {

        const result = await pool.query(
            `SELECT * FROM usuarios_pgrr WHERE nombre_usuario = $1`,
            [usuario]
        );

        console.log("Usuarios encontrados:", result.rows.length);

        if (result.rows.length === 0) {
            console.log("Usuario no existe");
            return res.json({ success: false });
        }

        const user = result.rows[0];

        console.log("Hash BD:", user.contrasena);

        const passwordValida = await bcrypt.compare(password, user.contrasena);

        console.log("Password válida:", passwordValida);

        if (!passwordValida) {
            return res.json({ success: false });
        }

        res.json({
            success: true,
            usuario: user.nombre_usuario,
            rol: user.rol
        });

    } catch (error) {

        console.error("Error en login:", error);
        res.status(500).json({ success: false });

    }
});

// OBTENER PERFIL
app.get("/perfil/:usuario", async (req, res) => {

    const { usuario } = req.params;

    try {

        const result = await pool.query(
            `SELECT nombre_usuario, correo, centro_costo 
             FROM usuarios_pgrr 
             WHERE nombre_usuario = $1`,
            [usuario]
        );

        if (result.rows.length === 0) {
            return res.json({ success: false });
        }

        res.json({
            success: true,
            usuario: result.rows[0]
        });

    } catch (error) {

        console.error("Error obteniendo perfil:", error);
        res.status(500).json({ success: false });

    }
});

// CAMBIAR CONTRASEÑA
app.post("/cambiar-password", async (req, res) => {

    const { usuario, actual, nueva } = req.body;

    try {

        const result = await pool.query(
            `SELECT contrasena 
             FROM usuarios_pgrr 
             WHERE nombre_usuario = $1`,
            [usuario]
        );

        if (result.rows.length === 0) {
            return res.json({ success: false, message: "Usuario no encontrado" });
        }

        const hashGuardado = result.rows[0].contrasena;

        const passwordValida = await bcrypt.compare(actual, hashGuardado);

        if (!passwordValida) {
            return res.json({ success: false, message: "Contraseña actual incorrecta" });
        }

        const nuevoHash = await bcrypt.hash(nueva, 10);

        await pool.query(
            `UPDATE usuarios_pgrr 
             SET contrasena = $1 
             WHERE nombre_usuario = $2`,
            [nuevoHash, usuario]
        );

        res.json({ success: true });

    } catch (error) {

        console.error("Error cambiando contraseña:", error);
        res.status(500).json({ success: false });

    }
});

app.listen(3000, () => {
    console.log("Servidor corriendo en http://localhost:3000");
});
