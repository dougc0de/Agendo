import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { buscarPacientes, crearPaciente } from "../services/pacienteService.js";

const router = express.Router();

router.use(requireAuth);

function resolvePacienteStatus(resultado, fallbackStatus) {
    if (String(resultado?.msg ?? "").startsWith("No autorizado")) {
        return 401;
    }

    return fallbackStatus;
}

router.get("/", async (req, res) => {
    const resultado = await buscarPacientes(req.query.search, req.auth);

    if (!resultado.ok) {
        return res.status(resolvePacienteStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.post("/", async (req, res) => {
    const resultado = await crearPaciente(req.body, req.auth);

    if (!resultado.ok) {
        return res.status(resolvePacienteStatus(resultado, 400)).json(resultado);
    }

    return res.status(201).json(resultado);
});

export default router;
