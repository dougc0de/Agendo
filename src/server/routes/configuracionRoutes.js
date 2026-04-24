import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
    actualizarConfiguracionCuenta,
    obtenerConfiguracionCuenta
} from "../services/workspaceSettingsService.js";

const router = express.Router();

router.use(requireAuth);

function resolveConfigStatus(resultado, fallbackStatus = 400) {
    if (String(resultado?.msg ?? "").startsWith("No autorizado")) {
        return 403;
    }

    return fallbackStatus;
}

router.get("/", async (req, res) => {
    const resultado = await obtenerConfiguracionCuenta(req.auth);

    if (!resultado.ok) {
        return res.status(resolveConfigStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.put("/", async (req, res) => {
    const resultado = await actualizarConfiguracionCuenta(req.body, req.auth);

    if (!resultado.ok) {
        return res.status(resolveConfigStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

export default router;
