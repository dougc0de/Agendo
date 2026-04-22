import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { crearSala, listarSalas } from "../services/salaService.js";

const router = express.Router();

router.use(requireAuth);

function resolveSalaStatus(resultado, fallbackStatus) {
    if (String(resultado?.msg ?? "").startsWith("No autorizado")) {
        return 401;
    }

    return fallbackStatus;
}

router.get("/", async (req, res) => {
    const resultado = await listarSalas(req.auth);

    if (!resultado.ok) {
        return res.status(resolveSalaStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.post("/", async (req, res) => {
    const resultado = await crearSala(req.body, req.auth);

    if (!resultado.ok) {
        return res.status(resolveSalaStatus(resultado, 400)).json(resultado);
    }

    return res.status(201).json(resultado);
});

export default router;
