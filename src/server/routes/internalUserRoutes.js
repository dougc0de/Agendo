import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
    actualizarEstadoUsuarioInterno,
    crearUsuarioInterno,
    editarUsuarioInterno,
    listarUsuariosInternos
} from "../services/internalUserService.js";

const router = express.Router();

router.use(requireAuth);

function resolveInternalUserStatus(resultado, fallbackStatus = 400) {
    if (String(resultado?.msg ?? "").startsWith("No autorizado")) {
        return 403;
    }

    return fallbackStatus;
}

router.get("/", async (req, res) => {
    const resultado = await listarUsuariosInternos(req.auth);

    if (!resultado.ok) {
        return res.status(resolveInternalUserStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.post("/", async (req, res) => {
    const resultado = await crearUsuarioInterno(req.body, req.auth);

    if (!resultado.ok) {
        return res.status(resolveInternalUserStatus(resultado, 400)).json(resultado);
    }

    return res.status(201).json(resultado);
});

router.put("/:id", async (req, res) => {
    const resultado = await editarUsuarioInterno(req.params.id, req.body, req.auth);

    if (!resultado.ok) {
        return res.status(resolveInternalUserStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.patch("/:id/estado", async (req, res) => {
    const resultado = await actualizarEstadoUsuarioInterno(
        req.params.id,
        req.body?.estado,
        req.auth
    );

    if (!resultado.ok) {
        return res.status(resolveInternalUserStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

export default router;
