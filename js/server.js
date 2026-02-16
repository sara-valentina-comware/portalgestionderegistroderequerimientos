require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "true"
});

app.post("/login", async (req, res) => {
    const { usuario, password } = req.body;

    try {
        const result = await pool.query(
            `SELECT * 
             FROM usuarios 
             WHERE nombre_usuario = $1 
             AND contrasena = $2`,
            [usuario, password]
        );

        res.json({ success: result.rows.length > 0 });

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ success: false });
    }
});

app.listen(3000, () => {
    console.log("✅ Servidor corriendo en http://localhost:3000");
});
