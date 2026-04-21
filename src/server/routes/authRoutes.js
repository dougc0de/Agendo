import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
    iniciarSesion,
    signupWorkspaceOwner,
    getCurrentSession
} from "../services/authService.js";

const router = express.Router();

function resolveAuthStatus(result, fallbackStatus = 400) {
    switch (result?.code) {
        case "INVALID_CREDENTIALS":
            return 401;
        case "UNAUTHORIZED":
            return 401;
        case "USER_INACTIVE":
            return 403;
        case "EMAIL_ALREADY_EXISTS":
            return 409;
        case "INVALID_SIGNUP_PAYLOAD":
            return 400;
        case "INVALID_PLAN":
            return 400;
        case "WORKSPACE_NOT_FOUND":
            return 403;
        case "SUBSCRIPTION_NOT_FOUND":
            return 403;
        default:
            return fallbackStatus;
    }
}

router.post("/login", async (req, res) => {
    const resultado = await iniciarSesion(req.body);

    if (!resultado.ok) {
        return res.status(resolveAuthStatus(resultado, 401)).json(resultado);
    }

    return res.status(200).json(resultado);
});

router.post("/signup", async (req, res) => {
    const resultado = await signupWorkspaceOwner(req.body);

    if (!resultado.ok) {
        return res.status(resolveAuthStatus(resultado, 400)).json(resultado);
    }

    return res.status(201).json(resultado);
});

router.get("/me", requireAuth, async (req, res) => {
    const resultado = await getCurrentSession(req.auth);

    if (!resultado.ok) {
        return res.status(resolveAuthStatus(resultado, 401)).json(resultado);
    }

    return res.status(200).json(resultado);
});

export default router;
