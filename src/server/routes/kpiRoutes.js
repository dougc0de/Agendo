import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
    obtenerKpiAlerts,
    obtenerKpiBreakdown,
    obtenerKpiDashboard,
    obtenerKpiReports,
    obtenerKpiTrends
} from "../services/kpiService.js";

const router = express.Router();

router.use(requireAuth);

function resolveKpiStatus(resultado, fallbackStatus = 400) {
    if (String(resultado?.msg ?? "").startsWith("No autorizado")) {
        return 403;
    }

    return fallbackStatus;
}

router.get("/dashboard", async (req, res) => {
    const resultado = await obtenerKpiDashboard(req.query, req.auth);

    if (!resultado.ok) {
        return res.status(resolveKpiStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.get("/trends", async (req, res) => {
    const resultado = await obtenerKpiTrends(req.query, req.auth);

    if (!resultado.ok) {
        return res.status(resolveKpiStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.get("/breakdown", async (req, res) => {
    const resultado = await obtenerKpiBreakdown(req.query, req.auth);

    if (!resultado.ok) {
        return res.status(resolveKpiStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.get("/reports", async (req, res) => {
    const resultado = await obtenerKpiReports(req.query, req.auth);

    if (!resultado.ok) {
        return res.status(resolveKpiStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.get("/alerts", async (req, res) => {
    const resultado = await obtenerKpiAlerts(req.query, req.auth);

    if (!resultado.ok) {
        return res.status(resolveKpiStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

export default router;
