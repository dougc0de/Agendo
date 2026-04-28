import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
    actualizarCobro,
    confirmarPagoCobro,
    crearCobro,
    listarReservasFacturables,
    obtenerReporteOperacionPdf,
    obtenerResumenFinanciero
} from "../services/financeService.js";
import {
    actualizarEstadoItemInventario,
    actualizarItemInventario,
    crearItemInventario,
    crearMovimientoInventario,
    listarInventario,
    listarMovimientosInventario,
    obtenerItemInventario,
    obtenerReportesInventario,
    obtenerResumenInventario
} from "../services/inventoryService.js";
import { listarCobros } from "../services/financeService.js";

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

router.get("/reportes-operacion", async (req, res) => {
    const resultado = await listarCobros(req.query, req.auth);

    if (!resultado.ok) {
        return res.status(resolveFinanceStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.get("/reservas-facturables", async (req, res) => {
    const resultado = await listarReservasFacturables(req.query, req.auth);

    if (!resultado.ok) {
        return res.status(resolveFinanceStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.get("/reportes-operacion/:id/pdf", async (req, res) => {
    const resultado = await obtenerReporteOperacionPdf(req.params.id, req.auth);

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

router.get("/inventario/resumen", async (req, res) => {
    const resultado = await obtenerResumenInventario(req.query, req.auth);

    if (!resultado.ok) {
        return res.status(resolveFinanceStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.get("/inventario/reportes", async (req, res) => {
    const resultado = await obtenerReportesInventario(req.query, req.auth);

    if (!resultado.ok) {
        return res.status(resolveFinanceStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.get("/inventario", async (req, res) => {
    const resultado = await listarInventario(req.query, req.auth);

    if (!resultado.ok) {
        return res.status(resolveFinanceStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.get("/inventario/:id", async (req, res) => {
    const resultado = await obtenerItemInventario(req.params.id, req.auth);

    if (!resultado.ok) {
        return res.status(resolveFinanceStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.get("/inventario/:id/movimientos", async (req, res) => {
    const resultado = await listarMovimientosInventario(req.params.id, req.query, req.auth);

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

router.post("/reportes-operacion", async (req, res) => {
    const resultado = await crearCobro(req.body, req.auth);

    if (!resultado.ok) {
        return res.status(resolveFinanceStatus(resultado, 400)).json(resultado);
    }

    return res.status(201).json(resultado);
});

router.post("/inventario", async (req, res) => {
    const resultado = await crearItemInventario(req.body, req.auth);

    if (!resultado.ok) {
        return res.status(resolveFinanceStatus(resultado, 400)).json(resultado);
    }

    return res.status(201).json(resultado);
});

router.post("/inventario/:id/movimientos", async (req, res) => {
    const resultado = await crearMovimientoInventario(req.params.id, req.body, req.auth);

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

router.put("/reportes-operacion/:id", async (req, res) => {
    const resultado = await actualizarCobro(req.params.id, req.body, req.auth);

    if (!resultado.ok) {
        return res.status(resolveFinanceStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.patch("/cobros/:id/pago", async (req, res) => {
    const resultado = await confirmarPagoCobro(req.params.id, req.body, req.auth);

    if (!resultado.ok) {
        return res.status(resolveFinanceStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.patch("/reportes-operacion/:id/pago", async (req, res) => {
    const resultado = await confirmarPagoCobro(req.params.id, req.body, req.auth);

    if (!resultado.ok) {
        return res.status(resolveFinanceStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.put("/inventario/:id", async (req, res) => {
    const resultado = await actualizarItemInventario(req.params.id, req.body, req.auth);

    if (!resultado.ok) {
        return res.status(resolveFinanceStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.patch("/inventario/:id/estado", async (req, res) => {
    const resultado = await actualizarEstadoItemInventario(
        req.params.id,
        req.body?.estado,
        req.auth
    );

    if (!resultado.ok) {
        return res.status(resolveFinanceStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

export default router;
