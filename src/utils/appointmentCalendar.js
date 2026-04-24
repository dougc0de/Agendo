const WEEKDAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

const monthLabelFormatter = new Intl.DateTimeFormat("es-CR", {
    month: "long",
    year: "numeric"
});

const shortDayFormatter = new Intl.DateTimeFormat("es-CR", {
    weekday: "short",
    day: "numeric",
    month: "short"
});

const longDayFormatter = new Intl.DateTimeFormat("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
});

function pad(value) {
    return String(value).padStart(2, "0");
}

export function parseDateKey(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""))) {
        return null;
    }

    const [year, month, day] = String(value).split("-").map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

export function formatDateKey(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return "";
    }

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getTodayDateKey(timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    const partMap = {};

    for (const part of formatter.formatToParts(new Date())) {
        if (part.type !== "literal") {
            partMap[part.type] = part.value;
        }
    }

    return `${partMap.year}-${partMap.month}-${partMap.day}`;
}

export function addDays(dateKey, amount) {
    const date = parseDateKey(dateKey);

    if (!date) {
        return "";
    }

    date.setDate(date.getDate() + Number(amount || 0));
    return formatDateKey(date);
}

export function addMonths(dateKey, amount) {
    const date = parseDateKey(dateKey);

    if (!date) {
        return "";
    }

    date.setMonth(date.getMonth() + Number(amount || 0));
    return formatDateKey(date);
}

export function startOfWeek(dateKey) {
    const date = parseDateKey(dateKey);

    if (!date) {
        return "";
    }

    const mondayOffset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - mondayOffset);
    return formatDateKey(date);
}

export function endOfWeek(dateKey) {
    return addDays(startOfWeek(dateKey), 6);
}

export function startOfMonth(dateKey) {
    const date = parseDateKey(dateKey);

    if (!date) {
        return "";
    }

    date.setDate(1);
    return formatDateKey(date);
}

export function endOfMonth(dateKey) {
    const date = parseDateKey(dateKey);

    if (!date) {
        return "";
    }

    date.setMonth(date.getMonth() + 1, 0);
    return formatDateKey(date);
}

export function getScaleRange(scale, dateKey) {
    if (scale === "week") {
        return {
            from: startOfWeek(dateKey),
            to: endOfWeek(dateKey)
        };
    }

    if (scale === "day") {
        return {
            from: dateKey,
            to: dateKey
        };
    }

    return {
        from: startOfWeek(startOfMonth(dateKey)),
        to: endOfWeek(endOfMonth(dateKey))
    };
}

export function getMonthGrid(dateKey) {
    const range = getScaleRange("month", dateKey);
    const days = [];
    let cursor = range.from;

    while (cursor && cursor <= range.to) {
        days.push(cursor);
        cursor = addDays(cursor, 1);
    }

    const weeks = [];

    for (let index = 0; index < days.length; index += 7) {
        weeks.push(days.slice(index, index + 7));
    }

    return weeks;
}

export function getWeekDays(dateKey) {
    const firstDay = startOfWeek(dateKey);
    return Array.from({ length: 7 }, (_, index) => addDays(firstDay, index));
}

export function formatMonthLabel(dateKey) {
    const date = parseDateKey(dateKey);
    return date ? monthLabelFormatter.format(date) : "";
}

export function formatShortDayLabel(dateKey) {
    const date = parseDateKey(dateKey);
    return date
        ? shortDayFormatter
              .format(date)
              .replace(".", "")
        : "";
}

export function formatLongDayLabel(dateKey) {
    const date = parseDateKey(dateKey);
    return date ? longDayFormatter.format(date) : "";
}

export function isSameDateKey(left, right) {
    return String(left ?? "") === String(right ?? "");
}

export function isDateInMonth(dateKey, monthDateKey) {
    return String(dateKey ?? "").slice(0, 7) === String(monthDateKey ?? "").slice(0, 7);
}

export function groupAppointmentsByDate(items = []) {
    return items.reduce((accumulator, item) => {
        const dateKey = String(item?.fecha ?? "");

        if (!dateKey) {
            return accumulator;
        }

        if (!accumulator[dateKey]) {
            accumulator[dateKey] = [];
        }

        accumulator[dateKey].push(item);
        accumulator[dateKey].sort((left, right) =>
            `${left.fecha}T${left.horaInicio}`.localeCompare(`${right.fecha}T${right.horaInicio}`)
        );
        return accumulator;
    }, {});
}

export function mapSummaryByDate(summary = []) {
    return summary.reduce((accumulator, item) => {
        accumulator[item.date] = item;
        return accumulator;
    }, {});
}

export function getDayTone(summary) {
    if (!summary || !summary.total) {
        return "empty";
    }

    if (summary.inProgress > 0) {
        return "in-progress";
    }

    if (summary.pending > 0) {
        return "pending";
    }

    if (summary.confirmed > 0) {
        return "confirmed";
    }

    if (summary.cancelled > 0) {
        return "cancelled";
    }

    return "scheduled";
}

export { WEEKDAY_LABELS };
