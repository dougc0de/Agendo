import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
    actualizarCobro,
    crearCobro,
    listarCobros,
    obtenerResumenFinanciero
} from "../services/financeService.js";

const router = express.Router();

router.use(requireAuth);

function resolveFinanceStatus(resultado, fallbackStatus = 400) {
    if (String(resultado?.msg ?? "").startsWith("No autorizado")) {
        return 403;
    }

    return fallbackStatus;
}

router.get("/cobros", async (req, res) => {
    const resultado = await listarCobros(req.query, req.auth);

    if (!resultado.ok) {
        return res.status(resolveFinanceStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.get("/resumen", async (req, res) => {
    const resultado = await obtenerResumenFinanciero(req.query, req.auth);

    if (!resultado.ok) {
        return res.status(resolveFinanceStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.post("/cobros", async (req, res) => {
    const resultado = await crearCobro(req.body, req.auth);

    if (!resultado.ok) {
        return res.status(resolveFinanceStatus(resultado, 400)).json(resultado);
    }

    return res.status(201).json(resultado);
});

router.put("/cobros/:id", async (req, res) => {
    const resultado = await actualizarCobro(req.params.id, req.body, req.auth);

    if (!resultado.ok) {
        return res.status(resolveFinanceStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

export default router;
