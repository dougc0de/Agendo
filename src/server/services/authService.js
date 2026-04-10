import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { buscarUsuarioPorCorreo } from "../repositories/usuarioRepository.js";


function sanitizeUser(usuario) {
    return {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        estado: usuario.estado
    };
}

export async function iniciarSesion(credentials) {
    try {
        const correo = String(credentials?.correo ?? "").trim();
        const contrasena = String(credentials?.contrasena ?? "").trim();

        if (!correo || !contrasena) {
            return {
                ok: false,
                msg: "Debe completar correo y contrasena."
            };
        }

        const usuario = await buscarUsuarioPorCorreo(correo);

        if (!usuario) {
            return {
                ok: false,
                msg: "Correo o contrasena incorrectos."
            };
        }

        if (usuario.estado !== "activo") {
            return {
                ok: false,
                msg: "El usuario no esta activo."
            };
        }

        const coincideContrasena = await bcrypt.compare(
            contrasena,
            usuario.contrasena
        );

        if (!coincideContrasena) {
            return {
                ok: false,
                msg: "Correo o contrasena incorrectos."
            };
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                correo: usuario.correo,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "8h"
            }
        );

        return {
            ok: true,
            msg: "Inicio de sesion exitoso.",
            data: {
                token,
                user: sanitizeUser(usuario)
            }
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al iniciar sesion: ${error.message}`
        };
    }
}