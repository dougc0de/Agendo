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
                    procedure_duration_minutes,
                    consultation_open_time,
                    consultation_close_time,
                    consultation_no_closing,
                    procedure_open_time,
                    procedure_close_time,
                    procedure_no_closing,
                    time_zone,
                    default_procedure_pricing_mode
                )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `,
        [
            datosSettings.workspaceId,
            datosSettings.consultationDurationMinutes,
            datosSettings.procedureDurationMinutes,
            datosSettings.consultationOpenTime,
            datosSettings.consultationCloseTime,
            datosSettings.consultationNoClosing,
            datosSettings.procedureOpenTime,
            datosSettings.procedureCloseTime,
            datosSettings.procedureNoClosing,
            datosSettings.timeZone,
            datosSettings.defaultProcedurePricingMode
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
                procedure_duration_minutes = $3,
                consultation_open_time = $4,
                consultation_close_time = $5,
                consultation_no_closing = $6,
                procedure_open_time = $7,
                procedure_close_time = $8,
                procedure_no_closing = $9,
                time_zone = $10,
                default_procedure_pricing_mode = $11
            WHERE workspace_id = $1
            RETURNING *
        `,
        [
            workspaceId,
            datosSettings.consultationDurationMinutes,
            datosSettings.procedureDurationMinutes,
            datosSettings.consultationOpenTime,
            datosSettings.consultationCloseTime,
            datosSettings.consultationNoClosing,
            datosSettings.procedureOpenTime,
            datosSettings.procedureCloseTime,
            datosSettings.procedureNoClosing,
            datosSettings.timeZone,
            datosSettings.defaultProcedurePricingMode
        ]
    );

    return rows[0];
}
