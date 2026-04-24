import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
    listarReservas,
    listarReservasCalendario,
    listarReservasPasadas,
    buscarReservaPorId,
    crearReserva,
    editarReserva,
    actualizarEstadoReserva,
    eliminarReserva
} from "../services/reservaService.js";

const router = express.Router();

router.use(requireAuth);

function resolveReservaStatus(resultado, fallbackStatus) {
    if (String(resultado?.msg ?? "").startsWith("No autorizado")) {
        return 401;
    }

    return fallbackStatus;
}

router.get("/", async (req, res) => {
    const resultado = await listarReservas(req.auth);

    if (!resultado.ok) {
        return res.status(resolveReservaStatus(resultado, 500)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.get("/calendario", async (req, res) => {
    const resultado = await listarReservasCalendario(req.query, req.auth);

    if (!resultado.ok) {
        return res.status(resolveReservaStatus(resultado, 500)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.get("/pasadas", async (req, res) => {
    const resultado = await listarReservasPasadas(req.query, req.auth);

    if (!resultado.ok) {
        return res.status(resolveReservaStatus(resultado, 500)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.get("/:id", async (req, res) => {
    const { id } = req.params;
    const resultado = await buscarReservaPorId(id, req.auth);

    if (!resultado.ok) {
        return res.status(resolveReservaStatus(resultado, 404)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.post("/", async (req, res) => {
    const resultado = await crearReserva(req.body, req.auth);

    if (!resultado.ok) {
        return res.status(resolveReservaStatus(resultado, 400)).json(resultado);
    }

    return res.status(201).json(resultado);
});

router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const resultado = await editarReserva(id, req.body, req.auth);

    if (!resultado.ok) {
        return res.status(resolveReservaStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.patch("/:id/estado", async (req, res) => {
    const { id } = req.params;
    const resultado = await actualizarEstadoReserva(id, req.body?.estado, req.auth);

    if (!resultado.ok) {
        return res.status(resolveReservaStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const resultado = await eliminarReserva(id, req.auth);

    if (!resultado.ok) {
        return res.status(resolveReservaStatus(resultado, 404)).json(resultado);
    }

    return res.status(200).json(resultado);
});

export default router;
