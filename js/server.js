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

        res.json({ success: passwordValida });

    } catch (error) {

        console.error("Error en login:", error);
        res.status(500).json({ success: false });

    }
});

app.listen(3000, () => {
    console.log("🚀 Servidor corriendo en http://localhost:3000");
});
