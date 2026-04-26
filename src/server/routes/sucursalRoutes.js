import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
    cambiarEstadoSucursal,
    crearSucursal,
    editarSucursal,
    listarSucursales
} from "../services/sucursalService.js";

const router = express.Router();

router.use(requireAuth);

function resolveSucursalStatus(resultado, fallbackStatus) {
    if (String(resultado?.msg ?? "").startsWith("No autorizado")) {
        return 403;
    }

    return fallbackStatus;
}

router.get("/", async (req, res) => {
    const resultado = await listarSucursales(req.auth);

    if (!resultado.ok) {
        return res.status(resolveSucursalStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.post("/", async (req, res) => {
    const resultado = await crearSucursal(req.body, req.auth);

    if (!resultado.ok) {
        return res.status(resolveSucursalStatus(resultado, 400)).json(resultado);
    }

    return res.status(201).json(resultado);
});

router.put("/:id", async (req, res) => {
    const resultado = await editarSucursal(req.params.id, req.body, req.auth);

    if (!resultado.ok) {
        return res.status(resolveSucursalStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.patch("/:id/estado", async (req, res) => {
    const resultado = await cambiarEstadoSucursal(
        req.params.id,
        req.body?.estado,
        req.auth
    );

    if (!resultado.ok) {
        return res.status(resolveSucursalStatus(resultado, 400)).json(resultado);
    }

    return res.status(200).json(resultado);
});

export default router;
