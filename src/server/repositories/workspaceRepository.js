import pool from "../db/connection.js";

export async function buscarWorkspacePorSlug(slug, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT *
            FROM workspaces
            WHERE slug = $1
            LIMIT 1
        `,
        [slug]
    );

    return rows[0];
}

export async function buscarWorkspacePorId(id, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT *
            FROM workspaces
            WHERE id = $1
            LIMIT 1
        `,
        [id]
    );

    return rows[0];
}

export async function crearWorkspace(datosWorkspace, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO workspaces
                (nombre, slug, estado)
            VALUES ($1, $2, $3)
            RETURNING *
        `,
        [
            datosWorkspace.nombre,
            datosWorkspace.slug,
            datosWorkspace.estado ?? "activo"
        ]
    );

    return rows[0];
}
