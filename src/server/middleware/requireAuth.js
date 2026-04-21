import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
    try {
        const authorization = req.headers.authorization;

        if (!authorization) {
            return res.status(401).json({
                ok: false,
                msg: "No autorizado. Falta el token."
            });
        }

        if (!authorization.startsWith("Bearer ")) {
            return res.status(401).json({
                ok: false,
                msg: "No autorizado. Formato de token invalido."
            });
        }

        const token = authorization.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                ok: false,
                msg: "No autorizado. Token no proporcionado."
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = Number(decoded.userId ?? decoded.id);
        const workspaceId = Number(decoded.workspaceId ?? 0) || null;

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(401).json({
                ok: false,
                msg: "No autorizado. Token sin usuario valido."
            });
        }

        req.auth = {
            userId,
            correo: decoded.correo ?? null,
            workspaceId,
            membershipRole: decoded.membershipRole ?? null,
            planCode: decoded.planCode ?? null,
            commercialStatus: decoded.commercialStatus ?? null
        };
        next();
    } catch (error) {
        return res.status(401).json({
            ok: false,
            msg: "No autorizado. Token invalido o expirado."
        });
    }
}
