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
                    consultation_duration_enabled,
                    consultation_duration_minutes,
                    procedure_duration_enabled,
                    procedure_duration_minutes,
                    procedure_turnover_enabled,
                    procedure_turnover_minutes,
                    consultation_open_time,
                    consultation_close_time,
                    consultation_no_closing,
                    procedure_open_time,
                    procedure_close_time,
                    procedure_no_closing,
                    time_zone,
                    procedure_pricing_policy,
                    default_procedure_pricing_mode,
                    default_currency_code
                )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
        `,
        [
            datosSettings.workspaceId,
            datosSettings.consultationDurationEnabled,
            datosSettings.consultationDurationMinutes,
            datosSettings.procedureDurationEnabled,
            datosSettings.procedureDurationMinutes,
            datosSettings.procedureTurnoverEnabled,
            datosSettings.procedureTurnoverMinutes,
            datosSettings.consultationOpenTime,
            datosSettings.consultationCloseTime,
            datosSettings.consultationNoClosing,
            datosSettings.procedureOpenTime,
            datosSettings.procedureCloseTime,
            datosSettings.procedureNoClosing,
            datosSettings.timeZone,
            datosSettings.procedurePricingPolicy,
            datosSettings.defaultProcedurePricingMode,
            datosSettings.defaultCurrencyCode
        ]
    );

    return rows[0];
}

export async function actualizarWorkspaceSettings(workspaceId, datosSettings, executor = pool) {
    const { rows } = await executor.query(
        `
            UPDATE workspace_settings
            SET
                consultation_duration_enabled = $2,
                consultation_duration_minutes = $3,
                procedure_duration_enabled = $4,
                procedure_duration_minutes = $5,
                procedure_turnover_enabled = $6,
                procedure_turnover_minutes = $7,
                consultation_open_time = $8,
                consultation_close_time = $9,
                consultation_no_closing = $10,
                procedure_open_time = $11,
                procedure_close_time = $12,
                procedure_no_closing = $13,
                time_zone = $14,
                procedure_pricing_policy = $15,
                default_procedure_pricing_mode = $16,
                default_currency_code = $17
            WHERE workspace_id = $1
            RETURNING *
        `,
        [
            workspaceId,
            datosSettings.consultationDurationEnabled,
            datosSettings.consultationDurationMinutes,
            datosSettings.procedureDurationEnabled,
            datosSettings.procedureDurationMinutes,
            datosSettings.procedureTurnoverEnabled,
            datosSettings.procedureTurnoverMinutes,
            datosSettings.consultationOpenTime,
            datosSettings.consultationCloseTime,
            datosSettings.consultationNoClosing,
            datosSettings.procedureOpenTime,
            datosSettings.procedureCloseTime,
            datosSettings.procedureNoClosing,
            datosSettings.timeZone,
            datosSettings.procedurePricingPolicy,
            datosSettings.defaultProcedurePricingMode,
            datosSettings.defaultCurrencyCode
        ]
    );

    return rows[0];
}
