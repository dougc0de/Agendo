import bcrypt from "bcryptjs";
import pool from "../db/connection.js";

async function hashUsuarios() {
    try {
        const [usuarios] = await pool.query(`
            SELECT id, correo, contrasena
            FROM usuarios
        `);

        for (const usuario of usuarios) {
            const hash = await bcrypt.hash(usuario.contrasena, 10);

            await pool.query(
                `
                UPDATE usuarios
                SET contrasena = ?
                WHERE id = ?
                `,
                [hash, usuario.id]
            );

            console.log(`Usuario actualizado: ${usuario.correo}`);
        }

        console.log("Migracion completada.");
        process.exit(0);
    } catch (error) {
        console.error("Error al migrar contrasenas:", error.message);
        process.exit(1);
    }
}

hashUsuarios();
