import express from "express";
import { iniciarSesion } from "../services/authService.js";

const router = express.Router();

router.post("/login", async (req, res) => {
    const resultado = await iniciarSesion(req.body);

    if (!resultado.ok) {
        return res.status(401).json(resultado);
    }

    return res.status(200).json(resultado);
});

export default router;
