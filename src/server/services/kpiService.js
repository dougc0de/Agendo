import { listarKpiReservationFacts, listarSalasParaKpis } from "../repositories/kpiRepository.js";
import { obtenerConfiguracionOperativaNormalizada } from "./workspaceSettingsService.js";
import { canAccessFinance, isAdministrativeUser, isDoctorUser } from "../../shared/roles.js";
import { normalizeSupportedCurrencyCode, SUPPORTED_CURRENCY_CODES } from "../../shared/currencies.js";

const GRANULARITIES = ["day", "week", "month"];
const DIMENSIONS = ["branch", "room", "doctor", "procedure"];
const REPORT_TYPES = ["room", "doctor", "branch", "procedure", "collections", "outcomes", "occupancy"];
const RESERVATION_STATUSES = ["pendiente", "confirmada", "cancelada"];
const KPI_METRICS = [
    "occupancy",
    "no_show",
    "cancellation",
    "paid_revenue",
    "pending_revenue",
    "average_ticket",
    "gross_margin",
    "revenue_leakage"
];

function normalizarTexto(valor) {
    return String(valor ?? "").trim();
}

function normalizarFecha(valor) {
    if (!valor) {
        return null;
    }

    if (valor instanceof Date) {
        return valor.toISOString().slice(0, 10);
    }

    return String(valor).slice(0, 10);
}

function parseDateKey(dateKey) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey ?? ""))) {
        return null;
    }

    const value = new Date(`${dateKey}T00:00:00Z`);
    return Number.isNaN(value.getTime()) ? null : value;
}

function formatDateKey(date) {
    return date.toISOString().slice(0, 10);
}

function addDays(dateKey, amount) {
    const date = parseDateKey(dateKey);

    if (!date) {
        return dateKey;
    }

    date.setUTCDate(date.getUTCDate() + amount);
    return formatDateKey(date);
}

function addMonths(dateKey, amount) {
    const date = parseDateKey(dateKey);

    if (!date) {
        return dateKey;
    }

    date.setUTCMonth(date.getUTCMonth() + amount, 1);
    return formatDateKey(date);
}

function startOfWeek(dateKey) {
    const date = parseDateKey(dateKey);

    if (!date) {
        return dateKey;
    }

    const weekday = date.getUTCDay();
    const offset = weekday === 0 ? -6 : 1 - weekday;
    date.setUTCDate(date.getUTCDate() + offset);
    return formatDateKey(date);
}

function startOfMonth(dateKey) {
    const date = parseDateKey(dateKey);

    if (!date) {
        return dateKey;
    }

    date.setUTCDate(1);
    return formatDateKey(date);
}

function enumerateDates(from, to) {
    const start = parseDateKey(from);
    const end = parseDateKey(to);

    if (!start || !end || start.getTime() > end.getTime()) {
        return [];
    }

    const dates = [];
    const cursor = new Date(start);

    while (cursor.getTime() <= end.getTime()) {
        dates.push(formatDateKey(cursor));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return dates;
}

function getCurrentZonedDateKey(timeZone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    const parts = {};

    for (const part of formatter.formatToParts(new Date())) {
        if (part.type !== "literal") {
            parts[part.type] = part.value;
        }
    }

    return `${parts.year}-${parts.month}-${parts.day}`;
}

function roundMoney(value) {
    return Number(Number(value ?? 0).toFixed(2));
}

function roundMetric(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return null;
    }

    return Number(Number(value).toFixed(2));
}

function safeNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
}

function timeToMinutes(timeValue, fallback = 0) {
    const normalized = String(timeValue ?? "").trim().slice(0, 5);

    if (!/^\d{2}:\d{2}$/.test(normalized)) {
        return fallback;
    }

    const [hours, minutes] = normalized.split(":").map(Number);
    return hours * 60 + minutes;
}

function resolveOperationalWindowMinutes(settings) {
    const consultationOpen = timeToMinutes(settings.consultationOpenTime, 8 * 60);
    const procedureOpen = timeToMinutes(settings.procedureOpenTime, consultationOpen);
    const consultationClose = settings.consultationNoClosing
        ? 24 * 60
        : timeToMinutes(settings.consultationCloseTime, 17 * 60);
    const procedureClose = settings.procedureNoClosing
        ? 24 * 60
        : timeToMinutes(settings.procedureCloseTime, consultationClose);
    const earliestOpen = Math.min(consultationOpen, procedureOpen);
    const latestClose = Math.max(consultationClose, procedureClose);

    return Math.max(0, latestClose - earliestOpen);
}

function resolveWorkspaceId(auth) {
    const workspaceId = Number(auth?.workspaceId);
    return Number.isInteger(workspaceId) && workspaceId > 0 ? workspaceId : null;
}

function hasKpiAccess(auth) {
    return (
        canAccessFinance({
            membershipRole: auth?.membershipRole,
            userRole: auth?.userRole
        }) &&
        !isDoctorUser({
            membershipRole: auth?.membershipRole,
            userRole: auth?.userRole
        })
    );
}

function buildAuthMeta(auth) {
    return {
        isAdmin: isAdministrativeUser({
            membershipRole: auth?.membershipRole,
            userRole: auth?.userRole
        }),
        branchId: Number(auth?.branchId ?? 0) || null,
        branchName: auth?.branchName ?? null
    };
}

function defaultDateRange() {
    const to = formatDateKey(new Date());
    return {
        from: addDays(to, -29),
        to
    };
}

function normalizeGranularity(value) {
    const normalized = normalizarTexto(value).toLowerCase();
    return GRANULARITIES.includes(normalized) ? normalized : "day";
}

function normalizeStatus(value) {
    const normalized = normalizarTexto(value).toLowerCase();
    return RESERVATION_STATUSES.includes(normalized) ? normalized : null;
}

function normalizeDimension(value) {
    const normalized = normalizarTexto(value).toLowerCase();
    return DIMENSIONS.includes(normalized) ? normalized : "room";
}

function normalizeReportType(value) {
    const normalized = normalizarTexto(value).toLowerCase();
    return REPORT_TYPES.includes(normalized) ? normalized : "room";
}

function normalizeMetric(value) {
    const normalized = normalizarTexto(value).toLowerCase();
    return KPI_METRICS.includes(normalized) ? normalized : "occupancy";
}

function normalizeSortBy(value) {
    return normalizarTexto(value).toLowerCase() || null;
}

function normalizeFilters(rawFilters = {}, auth) {
    const authMeta = buildAuthMeta(auth);
    const defaultRange = defaultDateRange();
    const from = normalizarFecha(rawFilters.from) ?? defaultRange.from;
    const to = normalizarFecha(rawFilters.to) ?? defaultRange.to;

    if (!parseDateKey(from) || !parseDateKey(to) || from > to) {
        return {
            ok: false,
            msg: "El rango de fechas para KPIs no es valido."
        };
    }

    const requestedBranchId = Number(rawFilters.branchId);
    const requestedRoomId = Number(rawFilters.roomId);
    const requestedDoctorUserId = Number(rawFilters.doctorUserId);
    const normalizedCurrency = normalizeSupportedCurrencyCode(rawFilters.currencyCode, "");

    if (rawFilters.currencyCode && !SUPPORTED_CURRENCY_CODES.includes(normalizedCurrency)) {
        return {
            ok: false,
            msg: "La moneda indicada para los KPIs no es valida."
        };
    }

    if (!authMeta.isAdmin) {
        if (!authMeta.branchId) {
            return {
                ok: false,
                msg: "No autorizado. Tu usuario necesita una sucursal asignada para ver KPIs gerenciales."
            };
        }

        if (
            Number.isInteger(requestedBranchId) &&
            requestedBranchId > 0 &&
            requestedBranchId !== authMeta.branchId
        ) {
            return {
                ok: false,
                msg: "No autorizado. Solo puedes consultar los KPIs de tu propia sucursal."
            };
        }
    }

    return {
        ok: true,
        data: {
            from,
            to,
            branchId:
                authMeta.isAdmin && Number.isInteger(requestedBranchId) && requestedBranchId > 0
                    ? requestedBranchId
                    : authMeta.isAdmin
                      ? null
                      : authMeta.branchId,
            roomId: Number.isInteger(requestedRoomId) && requestedRoomId > 0 ? requestedRoomId : null,
            doctorUserId:
                Number.isInteger(requestedDoctorUserId) && requestedDoctorUserId > 0
                    ? requestedDoctorUserId
                    : null,
            status: normalizeStatus(rawFilters.status),
            currencyCode: normalizedCurrency || null,
            granularity: normalizeGranularity(rawFilters.granularity),
            metric: normalizeMetric(rawFilters.metric),
            dimension: normalizeDimension(rawFilters.dimension),
            report: normalizeReportType(rawFilters.report),
            sortBy: normalizeSortBy(rawFilters.sortBy),
            isAdmin: authMeta.isAdmin,
            scopedBranchId: authMeta.branchId,
            scopedBranchName: authMeta.branchName ?? null
        }
    };
}

function normalizeFactRow(row) {
    return {
        workspaceId: Number(row.workspace_id),
        reservationId: Number(row.reservation_id),
        reservationDate: normalizarFecha(row.reservation_date),
        reservationCreatedAt: row.reservation_created_at ?? null,
        reservationStatus: row.reservation_status,
        appointmentOutcome: row.appointment_outcome ?? "pendiente",
        tipoAtencion: row.tipo_atencion ?? "consulta",
        tipoConsulta: row.tipo_consulta ?? "",
        branchId: Number(row.branch_id ?? 0) || null,
        branchName: row.branch_name ?? null,
        roomId: Number(row.room_id ?? 0) || null,
        roomName: row.room_name ?? null,
        roomStatus: row.room_status ?? "activa",
        reservationUserId: Number(row.reservation_user_id ?? 0) || null,
        reservationUserName: row.reservation_user_name ?? null,
        confirmedAt: row.confirmed_at ?? null,
        cancelledAt: row.cancelled_at ?? null,
        checkedInAt: row.checked_in_at ?? null,
        completedAt: row.completed_at ?? null,
        durationMinutes: safeNumber(row.duration_minutes),
        chargeId: Number(row.charge_id ?? 0) || null,
        paymentStatus: row.payment_status ?? null,
        currencyCode: row.currency_code ?? null,
        chargeDecision: row.charge_decision ?? "cobrable",
        pricingMode: row.pricing_mode ?? null,
        paidRevenue: safeNumber(row.paid_revenue),
        pendingRevenue: safeNumber(row.pending_revenue),
        exoneratedAmount: safeNumber(row.exonerated_amount),
        suppliesCost: safeNumber(row.supplies_total_cost),
        totalBilledAmount: safeNumber(row.total_billed_amount),
        grossMarginAmount:
            row.gross_margin_amount === null || row.gross_margin_amount === undefined
                ? null
                : safeNumber(row.gross_margin_amount)
    };
}

function normalizeRoomRow(row) {
    return {
        id: Number(row.id),
        nombre: row.nombre,
        estado: row.estado,
        tipo: row.tipo ?? "",
        branchId: Number(row.sucursal_id ?? 0) || null,
        branchName: row.sucursal_nombre ?? null
    };
}

function buildRoomScope(roomRows, facts, filters) {
    const normalizedRooms = roomRows.map((room) => normalizeRoomRow(room));
    const factRoomMap = new Map();

    for (const fact of facts) {
        if (!fact.roomId || factRoomMap.has(fact.roomId)) {
            continue;
        }

        factRoomMap.set(fact.roomId, {
            id: fact.roomId,
            nombre: fact.roomName ?? `Sala #${fact.roomId}`,
            estado: fact.roomStatus ?? "activa",
            tipo: "",
            branchId: fact.branchId ?? null,
            branchName: fact.branchName ?? null
        });
    }

    let rooms = normalizedRooms.filter(
        (room) => room.estado === "activa" || factRoomMap.has(Number(room.id))
    );

    if (filters.roomId) {
        rooms = rooms.filter((room) => Number(room.id) === Number(filters.roomId));
    } else if (filters.doctorUserId) {
        const doctorRoomIds = new Set(
            facts
                .filter((fact) => Number(fact.reservationUserId) === Number(filters.doctorUserId))
                .map((fact) => Number(fact.roomId))
        );

        if (doctorRoomIds.size) {
            rooms = rooms.filter((room) => doctorRoomIds.has(Number(room.id)));
        }
    }

    for (const room of factRoomMap.values()) {
        if (!rooms.some((currentRoom) => Number(currentRoom.id) === Number(room.id))) {
            rooms.push(room);
        }
    }

    return rooms;
}

function buildCurrencyMeta(facts, filters) {
    const availableCurrencies = [...new Set(facts.map((fact) => fact.currencyCode).filter(Boolean))];
    const mixedCurrency = !filters.currencyCode && availableCurrencies.length > 1;

    return {
        availableCurrencies,
        mixedCurrency,
        financialVisible: !mixedCurrency
    };
}

function getBucketKey(dateKey, granularity) {
    if (granularity === "month") {
        return startOfMonth(dateKey);
    }

    if (granularity === "week") {
        return startOfWeek(dateKey);
    }

    return dateKey;
}

function buildBucketKeys(from, to, granularity) {
    const keys = [];
    let cursor = granularity === "month" ? startOfMonth(from) : granularity === "week" ? startOfWeek(from) : from;
    const finalKey = granularity === "month" ? startOfMonth(to) : granularity === "week" ? startOfWeek(to) : to;

    while (cursor <= finalKey) {
        keys.push(cursor);
        cursor =
            granularity === "month"
                ? addMonths(cursor, 1)
                : granularity === "week"
                  ? addDays(cursor, 7)
                  : addDays(cursor, 1);
    }

    return keys;
}

function buildBucketDateCounts(from, to, granularity) {
    const counts = new Map();

    for (const dateKey of enumerateDates(from, to)) {
        const bucketKey = getBucketKey(dateKey, granularity);
        counts.set(bucketKey, (counts.get(bucketKey) ?? 0) + 1);
    }

    return counts;
}

function buildBucketLabel(bucketKey, granularity) {
    const date = parseDateKey(bucketKey);

    if (!date) {
        return bucketKey;
    }

    if (granularity === "month") {
        return new Intl.DateTimeFormat("es-CR", {
            month: "short",
            year: "numeric",
            timeZone: "UTC"
        }).format(date);
    }

    if (granularity === "week") {
        const endDate = parseDateKey(addDays(bucketKey, 6));
        const startLabel = new Intl.DateTimeFormat("es-CR", {
            day: "numeric",
            month: "short",
            timeZone: "UTC"
        }).format(date);
        const endLabel = endDate
            ? new Intl.DateTimeFormat("es-CR", {
                  day: "numeric",
                  month: "short",
                  timeZone: "UTC"
              }).format(endDate)
            : bucketKey;

        return `${startLabel} - ${endLabel}`;
    }

    return new Intl.DateTimeFormat("es-CR", {
        day: "numeric",
        month: "short",
        timeZone: "UTC"
    }).format(date);
}

function groupFacts(facts, keyBuilder) {
    const grouped = new Map();

    for (const fact of facts) {
        const key = keyBuilder(fact);

        if (!grouped.has(key)) {
            grouped.set(key, []);
        }

        grouped.get(key).push(fact);
    }

    return grouped;
}

function getLeadTimeDays(fact) {
    const serviceDate = parseDateKey(fact.reservationDate);
    const createdAt = fact.reservationCreatedAt ? new Date(fact.reservationCreatedAt) : null;

    if (!serviceDate || !createdAt || Number.isNaN(createdAt.getTime())) {
        return null;
    }

    const createdDate = Date.UTC(
        createdAt.getUTCFullYear(),
        createdAt.getUTCMonth(),
        createdAt.getUTCDate()
    );
    const diff = serviceDate.getTime() - createdDate;
    return diff >= 0 ? diff / (24 * 60 * 60 * 1000) : null;
}

function buildMetrics(facts, { operationalMinutes = 0, currentDateKey, financialVisible = true } = {}) {
    const scheduledCount = facts.length;
    const cancelledCount = facts.filter((fact) => fact.reservationStatus === "cancelada").length;
    const bookedMinutes = facts.reduce((sum, fact) => {
        if (fact.reservationStatus === "cancelada") {
            return sum;
        }

        return sum + safeNumber(fact.durationMinutes);
    }, 0);
    const attendedCount = facts.filter((fact) => fact.appointmentOutcome === "atendida").length;
    const noShowCount = facts.filter((fact) => fact.appointmentOutcome === "no_show").length;
    const knownOutcomeCount = attendedCount + noShowCount;
    const futureFacts = facts.filter(
        (fact) =>
            fact.reservationDate >= currentDateKey &&
            fact.reservationStatus !== "cancelada"
    );
    const confirmedFutureCount = futureFacts.filter(
        (fact) => fact.reservationStatus === "confirmada"
    ).length;
    const paidFacts = facts.filter(
        (fact) => fact.chargeDecision === "cobrable" && fact.paymentStatus === "pagado"
    );
    const paidRevenueRaw = paidFacts.reduce((sum, fact) => sum + fact.paidRevenue, 0);
    const pendingRevenueRaw = facts.reduce((sum, fact) => sum + fact.pendingRevenue, 0);
    const exoneratedAmountRaw = facts.reduce((sum, fact) => sum + fact.exoneratedAmount, 0);
    const suppliesCostRaw = paidFacts.reduce((sum, fact) => sum + fact.suppliesCost, 0);
    const grossMarginAmountRaw = paidFacts.reduce(
        (sum, fact) => sum + safeNumber(fact.grossMarginAmount),
        0
    );
    const paidChargeCount = paidFacts.filter((fact) => Boolean(fact.chargeId)).length;
    const paidDoctorIds = new Set(
        paidFacts
            .map((fact) => Number(fact.reservationUserId))
            .filter((doctorId) => Number.isInteger(doctorId) && doctorId > 0)
    );
    const leadTimeValues = facts.map(getLeadTimeDays).filter((value) => value !== null);

    const cancellationRate =
        scheduledCount > 0 ? (cancelledCount / scheduledCount) * 100 : null;
    const noShowRate =
        knownOutcomeCount > 0 ? (noShowCount / knownOutcomeCount) * 100 : null;
    const occupancyRate =
        operationalMinutes > 0 ? (bookedMinutes / operationalMinutes) * 100 : null;
    const averageTicketRaw =
        paidChargeCount > 0 ? paidRevenueRaw / paidChargeCount : null;
    const averageRevenuePerDoctorRaw =
        paidDoctorIds.size > 0 ? paidRevenueRaw / paidDoctorIds.size : null;
    const revenuePerRoomHourRaw =
        bookedMinutes > 0 ? paidRevenueRaw / (bookedMinutes / 60) : null;
    const grossMarginRateRaw =
        paidRevenueRaw > 0 ? (grossMarginAmountRaw / paidRevenueRaw) * 100 : null;
    const confirmationRate =
        futureFacts.length > 0 ? (confirmedFutureCount / futureFacts.length) * 100 : null;
    const averageLeadDays =
        leadTimeValues.length > 0
            ? leadTimeValues.reduce((sum, value) => sum + value, 0) / leadTimeValues.length
            : null;

    return {
        scheduledCount,
        confirmedCount: facts.filter((fact) => fact.reservationStatus === "confirmada").length,
        cancelledCount,
        attendedCount,
        noShowCount,
        knownOutcomeCount,
        bookedMinutes,
        operationalMinutes,
        idleMinutes: Math.max(0, operationalMinutes - bookedMinutes),
        occupancyRate: roundMetric(occupancyRate),
        cancellationRate: roundMetric(cancellationRate),
        noShowRate: roundMetric(noShowRate),
        confirmationRate: roundMetric(confirmationRate),
        averageLeadDays: roundMetric(averageLeadDays),
        paidChargeCount,
        distinctDoctorsCount: paidDoctorIds.size,
        paidRevenue: financialVisible ? roundMoney(paidRevenueRaw) : null,
        pendingRevenue: financialVisible ? roundMoney(pendingRevenueRaw) : null,
        exoneratedAmount: financialVisible ? roundMoney(exoneratedAmountRaw) : null,
        revenueLeakage: financialVisible
            ? roundMoney(pendingRevenueRaw + exoneratedAmountRaw)
            : null,
        suppliesCost: financialVisible ? roundMoney(suppliesCostRaw) : null,
        grossMarginAmount: financialVisible ? roundMoney(grossMarginAmountRaw) : null,
        grossMarginRate: financialVisible ? roundMetric(grossMarginRateRaw) : null,
        averageTicket: financialVisible ? roundMoney(averageTicketRaw) : null,
        averageRevenuePerDoctor: financialVisible
            ? roundMoney(averageRevenuePerDoctorRaw)
            : null,
        revenuePerRoomHour: financialVisible ? roundMoney(revenuePerRoomHourRaw) : null
    };
}

function buildTrendSeries(facts, filters, roomScope, settings, currencyMeta) {
    const bucketKeys = buildBucketKeys(filters.from, filters.to, filters.granularity);
    const bucketDateCounts = buildBucketDateCounts(filters.from, filters.to, filters.granularity);
    const grouped = groupFacts(facts, (fact) => getBucketKey(fact.reservationDate, filters.granularity));
    const currentDateKey = getCurrentZonedDateKey(settings.timeZone);
    const operationalWindowMinutes = resolveOperationalWindowMinutes(settings);
    const roomCount = roomScope.length;

    return bucketKeys.map((bucketKey) => {
        const bucketFacts = grouped.get(bucketKey) ?? [];
        const metrics = buildMetrics(bucketFacts, {
            operationalMinutes: roomCount * (bucketDateCounts.get(bucketKey) ?? 0) * operationalWindowMinutes,
            currentDateKey,
            financialVisible: currencyMeta.financialVisible
        });

        return {
            bucketKey,
            label: buildBucketLabel(bucketKey, filters.granularity),
            ...metrics
        };
    });
}

function buildBranchBreakdown(facts, filters, roomScope, settings, currencyMeta) {
    const dayCount = enumerateDates(filters.from, filters.to).length;
    const operationalWindowMinutes = resolveOperationalWindowMinutes(settings);
    const roomCountByBranch = roomScope.reduce((accumulator, room) => {
        const branchKey = Number(room.branchId ?? 0) || 0;
        accumulator.set(branchKey, (accumulator.get(branchKey) ?? 0) + 1);
        return accumulator;
    }, new Map());
    const branchNameById = new Map(
        roomScope.map((room) => [Number(room.branchId ?? 0) || 0, room.branchName ?? "Sin sucursal"])
    );

    for (const fact of facts) {
        const branchKey = Number(fact.branchId ?? 0) || 0;

        if (!branchNameById.has(branchKey)) {
            branchNameById.set(branchKey, fact.branchName ?? "Sin sucursal");
        }
    }

    const grouped = groupFacts(facts, (fact) => String(Number(fact.branchId ?? 0) || 0));
    const branchKeys = [...new Set([...branchNameById.keys(), ...[...grouped.keys()].map(Number)])];

    return branchKeys
        .map((branchKey) => {
            const branchFacts = grouped.get(String(branchKey)) ?? [];
            const metrics = buildMetrics(branchFacts, {
                operationalMinutes:
                    (roomCountByBranch.get(branchKey) ?? 0) * dayCount * operationalWindowMinutes,
                currentDateKey: getCurrentZonedDateKey(settings.timeZone),
                financialVisible: currencyMeta.financialVisible
            });

            return {
                branchId: branchKey || null,
                branchName: branchNameById.get(branchKey) ?? "Sin sucursal",
                roomCount: roomCountByBranch.get(branchKey) ?? 0,
                ...metrics
            };
        })
        .sort((left, right) => (right.paidRevenue ?? 0) - (left.paidRevenue ?? 0));
}

function buildRoomBreakdown(facts, filters, roomScope, settings, currencyMeta) {
    const dayCount = enumerateDates(filters.from, filters.to).length;
    const operationalWindowMinutes = resolveOperationalWindowMinutes(settings);
    const grouped = groupFacts(facts, (fact) => String(fact.roomId ?? 0));
    const currentDateKey = getCurrentZonedDateKey(settings.timeZone);

    return roomScope
        .map((room) => {
            const roomFacts = grouped.get(String(room.id)) ?? [];
            const metrics = buildMetrics(roomFacts, {
                operationalMinutes: dayCount * operationalWindowMinutes,
                currentDateKey,
                financialVisible: currencyMeta.financialVisible
            });

            return {
                roomId: room.id,
                roomName: room.nombre,
                branchId: room.branchId ?? null,
                branchName: room.branchName ?? null,
                ...metrics
            };
        })
        .sort((left, right) => (right.paidRevenue ?? 0) - (left.paidRevenue ?? 0));
}

function buildDoctorBreakdown(facts, settings, currencyMeta) {
    const grouped = groupFacts(facts, (fact) => String(fact.reservationUserId ?? 0));
    const currentDateKey = getCurrentZonedDateKey(settings.timeZone);

    return [...grouped.entries()]
        .map(([doctorKey, doctorFacts]) => {
            const metrics = buildMetrics(doctorFacts, {
                operationalMinutes: 0,
                currentDateKey,
                financialVisible: currencyMeta.financialVisible
            });

            return {
                doctorUserId: Number(doctorKey) || null,
                doctorName:
                    doctorFacts[0]?.reservationUserName ?? `Usuario #${doctorKey}`,
                roomsUsedCount: new Set(
                    doctorFacts.map((fact) => Number(fact.roomId)).filter(Boolean)
                ).size,
                ...metrics
            };
        })
        .sort((left, right) => (right.paidRevenue ?? 0) - (left.paidRevenue ?? 0));
}

function buildProcedureBreakdown(facts, settings, currencyMeta) {
    const grouped = groupFacts(facts, (fact) => fact.tipoConsulta || "Sin nombre");
    const currentDateKey = getCurrentZonedDateKey(settings.timeZone);

    return [...grouped.entries()]
        .map(([procedureName, procedureFacts]) => {
            const metrics = buildMetrics(procedureFacts, {
                operationalMinutes: 0,
                currentDateKey,
                financialVisible: currencyMeta.financialVisible
            });

            return {
                procedureName,
                tipoAtencion: procedureFacts[0]?.tipoAtencion ?? "consulta",
                ...metrics
            };
        })
        .sort((left, right) => (right.grossMarginAmount ?? 0) - (left.grossMarginAmount ?? 0));
}

function buildAlerts({ summaryMetrics, roomBreakdown, facts, settings, currencyMeta, filters }) {
    const alerts = [];
    const currentDateKey = getCurrentZonedDateKey(settings.timeZone);
    const unknownOutcomePastCount = facts.filter(
        (fact) =>
            fact.reservationDate < currentDateKey &&
            fact.reservationStatus !== "cancelada" &&
            fact.appointmentOutcome === "pendiente"
    ).length;

    if (currencyMeta.mixedCurrency) {
        alerts.push({
            code: "mixed_currency",
            level: "warning",
            title: "Monedas mixtas en el rango",
            message: "Filtra una moneda para habilitar los KPI financieros agregados sin mezclar divisas."
        });
    }

    if ((summaryMetrics.occupancyRate ?? 0) > 0 && (summaryMetrics.occupancyRate ?? 0) < 40) {
        alerts.push({
            code: "low_occupancy",
            level: "warning",
            title: "Ocupacion baja",
            message: "La ocupacion total del periodo esta por debajo del 40%."
        });
    }

    if ((summaryMetrics.noShowRate ?? 0) >= 15) {
        alerts.push({
            code: "high_no_show",
            level: "high",
            title: "No-show alto",
            message: "La tasa de no-show supera el 15%. Conviene reforzar confirmaciones y recordatorios."
        });
    }

    if ((summaryMetrics.cancellationRate ?? 0) >= 15) {
        alerts.push({
            code: "high_cancellation",
            level: "warning",
            title: "Cancelaciones elevadas",
            message: "La tasa de cancelacion esta por encima del umbral recomendado."
        });
    }

    if (
        summaryMetrics.pendingRevenue !== null &&
        summaryMetrics.paidRevenue !== null &&
        summaryMetrics.pendingRevenue > summaryMetrics.paidRevenue * 0.4
    ) {
        alerts.push({
            code: "high_pending",
            level: "warning",
            title: "Pendiente de cobro alto",
            message: "El monto pendiente ya representa mas del 40% del ingreso cobrado del cohorte."
        });
    }

    if (unknownOutcomePastCount > 0) {
        alerts.push({
            code: "missing_outcomes",
            level: "info",
            title: "Resultados sin cerrar",
            message: `${unknownOutcomePastCount} reservas pasadas siguen sin resultado operativo registrado.`
        });
    }

    const lowRoom = roomBreakdown.find(
        (room) => room.occupancyRate !== null && room.occupancyRate < 25
    );

    if (lowRoom) {
        alerts.push({
            code: "room_idle_risk",
            level: "info",
            title: "Sala con tiempo muerto alto",
            message: `${lowRoom.roomName} muestra una ocupacion menor al 25% en el rango actual.`
        });
    }

    if (
        filters.granularity === "day" &&
        enumerateDates(filters.from, filters.to).length > 45
    ) {
        alerts.push({
            code: "wide_day_range",
            level: "info",
            title: "Rango diario amplio",
            message: "Para leer tendencias largas con mas claridad, conviene cambiar la granularidad a semana o mes."
        });
    }

    return alerts;
}

function buildDashboardPayload(facts, rooms, filters, settings) {
    const normalizedFacts = facts.map((fact) => normalizeFactRow(fact));
    const roomScope = buildRoomScope(rooms, normalizedFacts, filters);
    const currencyMeta = buildCurrencyMeta(normalizedFacts, filters);
    const currentDateKey = getCurrentZonedDateKey(settings.timeZone);
    const operationalWindowMinutes = resolveOperationalWindowMinutes(settings);
    const dayCount = enumerateDates(filters.from, filters.to).length;
    const summaryMetrics = buildMetrics(normalizedFacts, {
        operationalMinutes: roomScope.length * dayCount * operationalWindowMinutes,
        currentDateKey,
        financialVisible: currencyMeta.financialVisible
    });
    const trends = buildTrendSeries(normalizedFacts, filters, roomScope, settings, currencyMeta);
    const roomBreakdown = buildRoomBreakdown(normalizedFacts, filters, roomScope, settings, currencyMeta);
    const branchBreakdown = buildBranchBreakdown(normalizedFacts, filters, roomScope, settings, currencyMeta);
    const doctorBreakdown = buildDoctorBreakdown(normalizedFacts, settings, currencyMeta);
    const procedureBreakdown = buildProcedureBreakdown(normalizedFacts, settings, currencyMeta);
    const alerts = buildAlerts({
        summaryMetrics,
        roomBreakdown,
        facts: normalizedFacts,
        settings,
        currencyMeta,
        filters
    });

    return {
        summary: summaryMetrics,
        trends,
        breakdowns: {
            branches: branchBreakdown,
            rooms: roomBreakdown,
            doctors: doctorBreakdown,
            procedures: procedureBreakdown
        },
        alerts,
        meta: {
            from: filters.from,
            to: filters.to,
            granularity: filters.granularity,
            roomCount: roomScope.length,
            operationalWindowMinutes,
            availableCurrencies: currencyMeta.availableCurrencies,
            mixedCurrency: currencyMeta.mixedCurrency,
            financialVisible: currencyMeta.financialVisible,
            scopedBranchId: filters.branchId ?? filters.scopedBranchId ?? null,
            scopedBranchName: filters.scopedBranchName ?? null
        }
    };
}

function sortBreakdownRows(rows, dimension, sortBy = null) {
    const defaultKey = {
        branch: "paidRevenue",
        room: "paidRevenue",
        doctor: "paidRevenue",
        procedure: "grossMarginAmount"
    }[dimension] ?? "paidRevenue";
    const sortKey = sortBy || defaultKey;

    return [...rows].sort((left, right) => {
        const rightValue = right?.[sortKey] ?? 0;
        const leftValue = left?.[sortKey] ?? 0;

        if (rightValue === leftValue) {
            return 0;
        }

        return rightValue > leftValue ? 1 : -1;
    });
}

async function cargarContextoKpi(filters, auth) {
    const workspaceId = resolveWorkspaceId(auth);

    if (!workspaceId) {
        return {
            ok: false,
            msg: "No autorizado. Falta el contexto de la cuenta."
        };
    }

    if (!hasKpiAccess(auth)) {
        return {
            ok: false,
            msg: "No autorizado. No tienes acceso a los KPIs gerenciales."
        };
    }

    const normalizedFiltersResult = normalizeFilters(filters, auth);

    if (!normalizedFiltersResult.ok) {
        return normalizedFiltersResult;
    }

    const normalizedFilters = normalizedFiltersResult.data;
    const [settings, facts, rooms] = await Promise.all([
        obtenerConfiguracionOperativaNormalizada(workspaceId),
        listarKpiReservationFacts(workspaceId, normalizedFilters),
        listarSalasParaKpis(workspaceId, normalizedFilters)
    ]);

    return {
        ok: true,
        data: {
            workspaceId,
            settings,
            filters: normalizedFilters,
            facts,
            rooms
        }
    };
}

export async function obtenerKpiDashboard(filters, auth) {
    try {
        const contextResult = await cargarContextoKpi(filters, auth);

        if (!contextResult.ok) {
            return contextResult;
        }

        const payload = buildDashboardPayload(
            contextResult.data.facts,
            contextResult.data.rooms,
            contextResult.data.filters,
            contextResult.data.settings
        );

        return {
            ok: true,
            msg: "Dashboard gerencial generado correctamente.",
            data: payload
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al generar el dashboard gerencial: ${error.message}`
        };
    }
}

export async function obtenerKpiTrends(filters, auth) {
    try {
        const contextResult = await cargarContextoKpi(filters, auth);

        if (!contextResult.ok) {
            return contextResult;
        }

        const payload = buildDashboardPayload(
            contextResult.data.facts,
            contextResult.data.rooms,
            contextResult.data.filters,
            contextResult.data.settings
        );
        const metric = contextResult.data.filters.metric;
        const metricKeyMap = {
            occupancy: "occupancyRate",
            no_show: "noShowRate",
            cancellation: "cancellationRate",
            paid_revenue: "paidRevenue",
            pending_revenue: "pendingRevenue",
            average_ticket: "averageTicket",
            gross_margin: "grossMarginAmount",
            revenue_leakage: "revenueLeakage"
        };

        return {
            ok: true,
            msg: "Tendencias KPI generadas correctamente.",
            data: {
                metric,
                valueKey: metricKeyMap[metric],
                series: payload.trends,
                meta: payload.meta,
                alerts: payload.alerts
            }
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al generar las tendencias KPI: ${error.message}`
        };
    }
}

export async function obtenerKpiBreakdown(filters, auth) {
    try {
        const contextResult = await cargarContextoKpi(filters, auth);

        if (!contextResult.ok) {
            return contextResult;
        }

        const payload = buildDashboardPayload(
            contextResult.data.facts,
            contextResult.data.rooms,
            contextResult.data.filters,
            contextResult.data.settings
        );
        const dimension = contextResult.data.filters.dimension;
        const breakdownMap = {
            branch: payload.breakdowns.branches,
            room: payload.breakdowns.rooms,
            doctor: payload.breakdowns.doctors,
            procedure: payload.breakdowns.procedures
        };

        return {
            ok: true,
            msg: "Desglose gerencial generado correctamente.",
            data: {
                dimension,
                rows: sortBreakdownRows(
                    breakdownMap[dimension] ?? [],
                    dimension,
                    contextResult.data.filters.sortBy
                ),
                meta: payload.meta,
                alerts: payload.alerts
            }
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al generar el desglose KPI: ${error.message}`
        };
    }
}

export async function obtenerKpiReports(filters, auth) {
    try {
        const contextResult = await cargarContextoKpi(filters, auth);

        if (!contextResult.ok) {
            return contextResult;
        }

        const payload = buildDashboardPayload(
            contextResult.data.facts,
            contextResult.data.rooms,
            contextResult.data.filters,
            contextResult.data.settings
        );
        const reportType = contextResult.data.filters.report;
        const reportData = {
            room: payload.breakdowns.rooms,
            doctor: payload.breakdowns.doctors,
            branch: payload.breakdowns.branches,
            procedure: payload.breakdowns.procedures,
            collections: payload.trends.map((row) => ({
                bucketKey: row.bucketKey,
                label: row.label,
                paidRevenue: row.paidRevenue,
                pendingRevenue: row.pendingRevenue,
                exoneratedAmount: row.exoneratedAmount,
                revenueLeakage: row.revenueLeakage
            })),
            outcomes: payload.trends.map((row) => ({
                bucketKey: row.bucketKey,
                label: row.label,
                scheduledCount: row.scheduledCount,
                attendedCount: row.attendedCount,
                noShowCount: row.noShowCount,
                cancelledCount: row.cancelledCount,
                noShowRate: row.noShowRate,
                cancellationRate: row.cancellationRate
            })),
            occupancy: payload.breakdowns.rooms.map((row) => ({
                roomId: row.roomId,
                roomName: row.roomName,
                branchName: row.branchName,
                bookedMinutes: row.bookedMinutes,
                operationalMinutes: row.operationalMinutes,
                idleMinutes: row.idleMinutes,
                occupancyRate: row.occupancyRate,
                revenuePerRoomHour: row.revenuePerRoomHour
            }))
        };

        return {
            ok: true,
            msg: "Reporte gerencial generado correctamente.",
            data: {
                report: reportType,
                rows: reportData[reportType] ?? [],
                summary: payload.summary,
                meta: payload.meta,
                alerts: payload.alerts
            }
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al generar el reporte gerencial: ${error.message}`
        };
    }
}

export async function obtenerKpiAlerts(filters, auth) {
    try {
        const contextResult = await cargarContextoKpi(filters, auth);

        if (!contextResult.ok) {
            return contextResult;
        }

        const payload = buildDashboardPayload(
            contextResult.data.facts,
            contextResult.data.rooms,
            contextResult.data.filters,
            contextResult.data.settings
        );

        return {
            ok: true,
            msg: "Alertas gerenciales generadas correctamente.",
            data: {
                alerts: payload.alerts,
                meta: payload.meta
            }
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al generar las alertas gerenciales: ${error.message}`
        };
    }
}
