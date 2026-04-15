import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { buscarPacientes, crearPaciente } from "../services/pacienteService.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
    const resultado = await buscarPacientes(req.query.search);

    if (!resultado.ok) {
        return res.status(500).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.post("/", async (req, res) => {
    const resultado = await crearPaciente(req.body);

    if (!resultado.ok) {
        return res.status(400).json(resultado);
    }

    return res.status(201).json(resultado);
});

export default router;
