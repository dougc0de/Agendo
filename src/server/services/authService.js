import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { withTransaction } from "../db/connection.js";
import { DEFAULT_CURRENCY_CODE } from "../../shared/currencies.js";
import {
    buscarUsuarioPorCorreo,
    crearUsuario
} from "../repositories/usuarioRepository.js";
import { crearClinica } from "../repositories/clinicaRepository.js";
import {
    crearWorkspace,
    buscarWorkspacePorSlug
} from "../repositories/workspaceRepository.js";
import { crearWorkspaceSettings } from "../repositories/workspaceSettingsRepository.js";
import { crearSucursal } from "../repositories/sucursalRepository.js";
import {
    crearWorkspaceMember,
    buscarSesionActivaPorUsuarioId
} from "../repositories/workspaceMemberRepository.js";
import { crearSubscription } from "../repositories/subscriptionRepository.js";
import {
    getPlanDefinition,
    isPublicSignupPlan
} from "../../shared/plans.js";

const DEFAULT_TRIAL_DURATION_DAYS = 10;

function normalizeText(value) {
    return String(value ?? "").trim();
}

function normalizeEmail(value) {
    return normalizeText(value).toLowerCase();
}

function normalizeTime(value) {
    return normalizeText(value).slice(0, 5);
}

function slugify(value) {
    const baseSlug = normalizeText(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return baseSlug || "workspace";
}

function sanitizeUser(sessionRow) {
    return {
        id: sessionRow.user_id,
        nombre: sessionRow.user_nombre,
        correo: sessionRow.user_correo,
        rol: sessionRow.user_rol,
        estado: sessionRow.user_estado
    };
}

function sanitizeWorkspace(sessionRow) {
    return {
        id: sessionRow.workspace_id,
        nombre: sessionRow.workspace_nombre,
        slug: sessionRow.workspace_slug,
        estado: sessionRow.workspace_estado,
        clinicId: sessionRow.clinic_id ?? null,
        clinicName: sessionRow.clinic_nombre ?? null
    };
}

function sanitizeBranch(sessionRow) {
    if (!sessionRow.sucursal_id) {
        return null;
    }

    return {
        id: sessionRow.sucursal_id,
        nombre: sessionRow.sucursal_nombre ?? null
    };
}

function sanitizeSubscription(sessionRow) {
    return {
        id: sessionRow.subscription_id ?? null,
        planCode: sessionRow.plan_code ?? null,
        commercialStatus: sessionRow.commercial_status ?? null,
        billingMode: sessionRow.billing_mode ?? null,
        trialEndsAt: sessionRow.trial_ends_at ?? null,
        currentPeriodEndsAt: sessionRow.current_period_ends_at ?? null,
        maxUsers: sessionRow.max_users ?? null,
        maxRooms: sessionRow.max_rooms ?? null,
        maxReservationsPerMonth: sessionRow.max_reservations_per_month ?? null,
        partnerValidUntil: sessionRow.partner_valid_until ?? null,
        partnerNotes: sessionRow.partner_notes ?? null
    };
}

function getJwtSecret() {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET no esta configurado en el backend.");
    }

    return process.env.JWT_SECRET;
}

function createAuthToken(sessionRow) {
    return jwt.sign(
        {
            userId: sessionRow.user_id,
            userRole: sessionRow.user_rol,
            correo: sessionRow.user_correo,
            workspaceId: sessionRow.workspace_id,
            membershipRole: sessionRow.membership_role,
            branchId: sessionRow.sucursal_id ?? null,
            branchName: sessionRow.sucursal_nombre ?? null,
            planCode: sessionRow.plan_code,
            commercialStatus: sessionRow.commercial_status
        },
        getJwtSecret(),
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "8h"
        }
    );
}

function buildSessionResponse(sessionRow, token, msg) {
    return {
        ok: true,
        msg,
        data: {
            token,
            user: sanitizeUser(sessionRow),
            workspace: sanitizeWorkspace(sessionRow),
            branch: sanitizeBranch(sessionRow),
            subscription: sanitizeSubscription(sessionRow),
            membershipRole: sessionRow.membership_role
        }
    };
}

function validateSignupPayload(payload) {
    const owner = {
        nombre: normalizeText(payload?.owner?.nombre),
        correo: normalizeEmail(payload?.owner?.correo),
        contrasena: normalizeText(payload?.owner?.contrasena)
    };

    const clinic = {
        nombre: normalizeText(payload?.clinic?.nombre),
        direccion: normalizeText(payload?.clinic?.direccion),
        telefono: normalizeText(payload?.clinic?.telefono),
        horaApertura: normalizeTime(payload?.clinic?.horaApertura),
        horaCierre: normalizeTime(payload?.clinic?.horaCierre),
        diasLaborales: normalizeText(payload?.clinic?.diasLaborales)
    };

    const planCode = normalizeText(payload?.planCode).toLowerCase();

    if (!owner.nombre || !owner.correo || !owner.contrasena) {
        return {
            ok: false,
            code: "INVALID_SIGNUP_PAYLOAD",
            msg: "Debes completar nombre, correo y contrasena del propietario."
        };
    }

    if (
        !clinic.nombre ||
        !clinic.direccion ||
        !clinic.telefono ||
        !clinic.horaApertura ||
        !clinic.horaCierre ||
        !clinic.diasLaborales
    ) {
        return {
            ok: false,
            code: "INVALID_SIGNUP_PAYLOAD",
            msg: "Debes completar todos los datos principales de la clinica."
        };
    }

    if (!isPublicSignupPlan(planCode)) {
        return {
            ok: false,
            code: "INVALID_PLAN",
            msg: "El plan seleccionado no esta disponible para registro publico."
        };
    }

    return {
        ok: true,
        data: {
            owner,
            clinic,
            planCode
        }
    };
}

async function resolveUniqueWorkspaceSlug(nombreBase, executor) {
    const baseSlug = slugify(nombreBase);
    let candidate = baseSlug;
    let counter = 2;

    while (await buscarWorkspacePorSlug(candidate, executor)) {
        candidate = `${baseSlug}-${counter}`;
        counter += 1;
    }

    return candidate;
}

async function resolveActiveSessionRow(userId, executor) {
    const sessionRow = await buscarSesionActivaPorUsuarioId(userId, executor);

    if (!sessionRow) {
        return {
            ok: false,
            code: "WORKSPACE_NOT_FOUND",
            msg: "El usuario no tiene un workspace activo asociado."
        };
    }

    if (sessionRow.user_estado !== "activo") {
        return {
            ok: false,
            code: "USER_INACTIVE",
            msg: "El usuario no esta activo."
        };
    }

    if (sessionRow.workspace_estado !== "activo") {
        return {
            ok: false,
            code: "WORKSPACE_INACTIVE",
            msg: "El workspace no esta disponible."
        };
    }

    if (!sessionRow.subscription_id) {
        return {
            ok: false,
            code: "SUBSCRIPTION_NOT_FOUND",
            msg: "El workspace no tiene una suscripcion activa."
        };
    }

    return {
        ok: true,
        data: sessionRow
    };
}

export async function signupWorkspaceOwner(payload) {
    try {
        const validation = validateSignupPayload(payload);

        if (!validation.ok) {
            return validation;
        }

        const { owner, clinic, planCode } = validation.data;
        const existingUser = await buscarUsuarioPorCorreo(owner.correo);

        if (existingUser) {
            return {
                ok: false,
                code: "EMAIL_ALREADY_EXISTS",
                msg: "Ya existe un usuario con ese correo."
            };
        }

        const plan = getPlanDefinition(planCode);
        const now = new Date();
        const trialDurationDays = Number(plan?.trialDays ?? DEFAULT_TRIAL_DURATION_DAYS);
        const trialEndsAt = new Date(
            now.getTime() + trialDurationDays * 24 * 60 * 60 * 1000
        );

        const result = await withTransaction(async (client) => {
            const workspaceSlug = await resolveUniqueWorkspaceSlug(clinic.nombre, client);
            const workspace = await crearWorkspace(
                {
                    nombre: clinic.nombre,
                    slug: workspaceSlug,
                    estado: "activo"
                },
                client
            );

            const hashedPassword = await bcrypt.hash(owner.contrasena, 10);
            const user = await crearUsuario(
                {
                    nombre: owner.nombre,
                    correo: owner.correo,
                    contrasena: hashedPassword,
                    rol: "admin",
                    estado: "activo"
                },
                client
            );

            await crearClinica(
                {
                    ...clinic,
                    estado: "activa",
                    workspaceId: workspace.id
                },
                client
            );

            const sucursalPrincipal = await crearSucursal(
                {
                    workspaceId: workspace.id,
                    nombre: "Sucursal principal",
                    codigo: "principal",
                    direccion: clinic.direccion,
                    telefono: clinic.telefono,
                    estado: "activa"
                },
                client
            );

            await crearWorkspaceMember(
                {
                    workspaceId: workspace.id,
                    usuarioId: user.id,
                    role: "owner",
                    estado: "activo",
                    sucursalId: sucursalPrincipal.id
                },
                client
            );

            await crearSubscription(
                {
                    workspaceId: workspace.id,
                    planCode: plan.code,
                    commercialStatus: "trial",
                    billingMode: "paid",
                    trialEndsAt,
                    currentPeriodEndsAt: trialEndsAt,
                    maxUsers: plan.maxUsers,
                    maxRooms: plan.maxRooms,
                    maxReservationsPerMonth: plan.maxReservationsPerMonth
                },
                client
            );

            await crearWorkspaceSettings(
                {
                    workspaceId: workspace.id,
                    consultationDurationEnabled: false,
                    consultationDurationMinutes: 30,
                    procedureDurationEnabled: false,
                    procedureDurationMinutes: 60,
                    procedureTurnoverEnabled: false,
                    procedureTurnoverMinutes: 15,
                    consultationOpenTime: clinic.horaApertura,
                    consultationCloseTime: clinic.horaCierre,
                    consultationNoClosing: false,
                    procedureOpenTime: clinic.horaApertura,
                    procedureCloseTime: clinic.horaCierre,
                    procedureNoClosing: false,
                    timeZone: "America/Costa_Rica",
                    procedurePricingPolicy: "bloqueado",
                    defaultProcedurePricingMode: "solo_sala",
                    defaultCurrencyCode: DEFAULT_CURRENCY_CODE
                },
                client
            );

            const sessionResult = await resolveActiveSessionRow(user.id, client);

            if (!sessionResult.ok) {
                throw new Error(sessionResult.msg);
            }

            const token = createAuthToken(sessionResult.data);
            return buildSessionResponse(
                sessionResult.data,
                token,
                "Cuenta creada correctamente."
            );
        });

        return result;
    } catch (error) {
        console.error("Error en signupWorkspaceOwner:", error);

        if (error?.code === "23505") {
            return {
                ok: false,
                code: "EMAIL_ALREADY_EXISTS",
                msg: "Ya existe una cuenta con ese correo o ese workspace ya fue creado."
            };
        }

        return {
            ok: false,
            code: "SIGNUP_ERROR",
            msg: `Error al crear la cuenta: ${error?.message || "sin mensaje"}`
        };
    }
}

export async function iniciarSesion(credentials) {
    try {
        const correo = normalizeEmail(credentials?.correo);
        const contrasena = normalizeText(credentials?.contrasena);

        if (!correo || !contrasena) {
            return {
                ok: false,
                code: "INVALID_CREDENTIALS",
                msg: "Debe completar correo y contrasena."
            };
        }

        const usuario = await buscarUsuarioPorCorreo(correo);

        if (!usuario) {
            return {
                ok: false,
                code: "INVALID_CREDENTIALS",
                msg: "Correo o contrasena incorrectos."
            };
        }

        if (usuario.estado !== "activo") {
            return {
                ok: false,
                code: "USER_INACTIVE",
                msg: "El usuario no esta activo."
            };
        }

        const passwordMatches = await bcrypt.compare(contrasena, usuario.contrasena);

        if (!passwordMatches) {
            return {
                ok: false,
                code: "INVALID_CREDENTIALS",
                msg: "Correo o contrasena incorrectos."
            };
        }

        const sessionResult = await resolveActiveSessionRow(usuario.id);

        if (!sessionResult.ok) {
            return sessionResult;
        }

        const token = createAuthToken(sessionResult.data);

        return buildSessionResponse(
            sessionResult.data,
            token,
            "Inicio de sesion exitoso."
        );
    } catch (error) {
        console.error("Error en iniciarSesion:", error);

        return {
            ok: false,
            code: "LOGIN_ERROR",
            msg: `Error al iniciar sesion: ${error?.message || "sin mensaje"}`
        };
    }
}

export async function getCurrentSession(auth) {
    try {
        const userId = Number(auth?.userId);

        if (!Number.isInteger(userId) || userId <= 0) {
            return {
                ok: false,
                code: "UNAUTHORIZED",
                msg: "No autorizado."
            };
        }

        const sessionResult = await resolveActiveSessionRow(userId);

        if (!sessionResult.ok) {
            return sessionResult;
        }

        const token = createAuthToken(sessionResult.data);

        return buildSessionResponse(
            sessionResult.data,
            token,
            "Sesion recuperada correctamente."
        );
    } catch (error) {
        console.error("Error en getCurrentSession:", error);

        return {
            ok: false,
            code: "SESSION_ERROR",
            msg: `Error al recuperar la sesion: ${error?.message || "sin mensaje"}`
        };
    }
}
