import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
    listarReservas,
    buscarReservaPorId,
    crearReserva,
    editarReserva,
    eliminarReserva
} from "../services/reservaService.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
    const resultado = await listarReservas();

    if (!resultado.ok) {
        return res.status(500).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.get("/:id", async (req, res) => {
    const { id } = req.params;
    const resultado = await buscarReservaPorId(id);

    if (!resultado.ok) {
        return res.status(404).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.post("/", async (req, res) => {
    const resultado = await crearReserva(req.body);

    if (!resultado.ok) {
        return res.status(400).json(resultado);
    }

    return res.status(201).json(resultado);
});

router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const resultado = await editarReserva(id, req.body);

    if (!resultado.ok) {
        return res.status(400).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const resultado = await eliminarReserva(id);

    if (!resultado.ok) {
        return res.status(404).json(resultado);
    }

    return res.status(200).json(resultado);
});

export default router;
