import pool from "../db/connection.js";

export async function buscarWorkspaceSettingsPorWorkspaceId(workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT *
            FROM workspace_settings
            WHERE workspace_id = $1
            LIMIT 1
        `,
        [workspaceId]
    );

    return rows[0];
}

export async function crearWorkspaceSettings(datosSettings, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO workspace_settings
                (
                    workspace_id,
                    consultation_duration_minutes,
                    procedure_duration_minutes
                )
            VALUES ($1, $2, $3)
            RETURNING *
        `,
        [
            datosSettings.workspaceId,
            datosSettings.consultationDurationMinutes,
            datosSettings.procedureDurationMinutes
        ]
    );

    return rows[0];
}

export async function actualizarWorkspaceSettings(workspaceId, datosSettings, executor = pool) {
    const { rows } = await executor.query(
        `
            UPDATE workspace_settings
            SET
                consultation_duration_minutes = $2,
                procedure_duration_minutes = $3
            WHERE workspace_id = $1
            RETURNING *
        `,
        [
            workspaceId,
            datosSettings.consultationDurationMinutes,
            datosSettings.procedureDurationMinutes
        ]
    );

    return rows[0];
}
