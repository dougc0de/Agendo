<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppointmentCalendar from "../components/appointments/AppointmentCalendar.vue";
import AppointmentDayPanel from "../components/appointments/AppointmentDayPanel.vue";
import AppointmentFilters from "../components/appointments/AppointmentFilters.vue";
import AppointmentForm from "../components/appointments/AppointmentForm.vue";
import AppointmentTable from "../components/appointments/AppointmentTable.vue";
import BaseButton from "../components/base/BaseButton.vue";
import BaseModal from "../components/base/BaseModal.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import RoomForm from "../components/rooms/RoomForm.vue";
import { useAppointments } from "../composables/useAppointments.js";
import { getAppointmentCalendar } from "../services/appointmentApi.js";
import { getBranches } from "../services/branchApi.js";
import { createPatient } from "../services/patientApi.js";
import { createRoom, getRooms } from "../services/roomApi.js";
import { getAccountSettings } from "../services/settingsApi.js";
import { buildPrivateNavLinks } from "../shared/privateNavigation.js";
import { isAdministrativeUser } from "../shared/roles.js";
import { useAuthStore } from "../stores/authStore.js";
import {
    addDays,
    addMonths,
    getScaleRange,
    getTodayDateKey,
    groupAppointmentsByDate,
    mapSummaryByDate,
    parseDateKey
} from "../utils/appointmentCalendar.js";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const {
    appointments,
    loading,
    saving,
    error,
    totalAppointments,
    pendingAppointments,
    confirmedAppointments,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    updateAppointmentStatus,
    deleteAppointment
} = useAppointments();

const modalOpen = ref(false);
const roomModalOpen = ref(false);
const modalMode = ref("create");
const currentAppointment = ref({});
const rooms = ref([]);
const branches = ref([]);
const accountSettings = ref({
    consultationDurationEnabled: false,
    consultationDurationMinutes: 30,
    procedureDurationEnabled: false,
    procedureDurationMinutes: 60,
    consultationOpenTime: "08:00",
    consultationCloseTime: "17:00",
    consultationNoClosing: false,
    procedureOpenTime: "08:00",
    procedureCloseTime: "17:00",
    procedureNoClosing: false,
    timeZone: "America/Costa_Rica",
    procedurePricingPolicy: "bloqueado",
    defaultProcedurePricingMode: "solo_sala"
});
const feedback = ref("");
const modalError = ref("");
const roomModalError = ref("");
const roomSaving = ref(false);
const pageError = ref("");
const shouldOpenReservationAfterRoomCreate = ref(false);
const calendarLoading = ref(false);
const calendarError = ref("");
const calendarSummary = ref([]);
const calendarItems = ref([]);
const selectedCalendarDate = ref("");
const calendarDetailModalOpen = ref(false);
const filters = ref({
    search: "",
    status: "todos"
});

const fullMomentFormatter = new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short"
});
const PAST_RESERVATION_ERROR_MESSAGE =
    "La fecha u hora de la reserva ya transcurrieron. Revisalas una vez mas.";

function toAppointmentDate(appointment) {
    const fecha = String(appointment?.fecha ?? "").trim();
    const hora = String(appointment?.horaInicio ?? "00:00").trim().slice(0, 5);

    if (!fecha) {
        return null;
    }

    const value = new Date(`${fecha}T${hora || "00:00"}`);
    return Number.isNaN(value.getTime()) ? null : value;
}

function formatAppointmentMoment(appointment) {
    const appointmentDate = toAppointmentDate(appointment);

    if (!appointmentDate) {
        return "Fecha no disponible";
    }

    return fullMomentFormatter.format(appointmentDate);
}

function getCurrentZonedDateTime(timeZone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
    const partMap = {};

    for (const part of formatter.formatToParts(new Date())) {
        if (part.type !== "literal") {
            partMap[part.type] = part.value;
        }
    }

    return {
        date: `${partMap.year}-${partMap.month}-${partMap.day}`,
        time: `${partMap.hour}:${partMap.minute}`
    };
}

function compareAppointmentStartToNow(appointment, timeZone) {
    const fecha = String(appointment?.fecha ?? "").trim().slice(0, 10);
    const horaInicio = String(appointment?.horaInicio ?? "").trim().slice(0, 5);

    if (!fecha || !horaInicio) {
        return 1;
    }

    const current = getCurrentZonedDateTime(timeZone);
    const appointmentKey = `${fecha}T${horaInicio}`;
    const currentKey = `${current.date}T${current.time}`;

    if (appointmentKey < currentKey) {
        return -1;
    }

    if (appointmentKey > currentKey) {
        return 1;
    }

    return 0;
}

function validarReservaNoIniciadaEnPasado(appointment) {
    return (
        compareAppointmentStartToNow(
            appointment,
            accountSettings.value.timeZone || "America/Costa_Rica"
        ) >= 0
    );
}

function updateRouteQuery(patch) {
    const nextQuery = {
        ...route.query,
        ...patch
    };

    Object.keys(nextQuery).forEach((key) => {
        const value = nextQuery[key];

        if (value === undefined || value === null || value === "") {
            delete nextQuery[key];
        }
    });

    router.replace({
        query: nextQuery
    });
}

function isMobileCalendarLayout() {
    return typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches;
}

function createEmptyCalendarSummary(dateKey) {
    return {
        date: dateKey,
        total: 0,
        pending: 0,
        confirmed: 0,
        cancelled: 0,
        inProgress: 0
    };
}

const modalTitle = computed(() =>
    modalMode.value === "edit" ? "Editar reserva" : "Nueva reserva"
);

const isAdminUser = computed(() =>
    isAdministrativeUser({
        membershipRole: authStore.membershipRole,
        userRole: authStore.user?.rol
    })
);

const navLinks = computed(() =>
    buildPrivateNavLinks({
        membershipRole: authStore.membershipRole,
        userRole: authStore.user?.rol
    })
);

const activeBranchOptions = computed(() =>
    branches.value.filter((branch) => branch.estado === "activa")
);

const roomModalDescription = computed(() => {
    const maxRooms = Number(authStore.subscription?.maxRooms ?? 0);

    if (maxRooms > 0) {
        return `Crea una sala activa para usarla en reservas. Tu plan actual permite hasta ${maxRooms} salas.`;
    }

    return "Crea una sala activa para usarla en reservas.";
});

function isReservableRoom(room) {
    return room?.estado === "activa" && room?.disponibilidad === "disponible";
}

const reservableRooms = computed(() => rooms.value.filter((room) => isReservableRoom(room)));

const appointmentRoomOptions = computed(() => {
    const currentRoomId = Number(currentAppointment.value?.salaId ?? 0) || null;

    return rooms.value.filter((room) => {
        if (isReservableRoom(room)) {
            return true;
        }

        return currentRoomId !== null && Number(room.id) === currentRoomId;
    });
});

const filteredAppointments = computed(() => {
    const searchValue = String(filters.value.search ?? "").trim().toLowerCase();

    return appointments.value.filter((appointment) => {
        const matchesStatus =
            filters.value.status === "todos" ||
            appointment.estado === filters.value.status;

        const haystack = [
            appointment.descripcion,
            appointment.tipoConsulta,
            appointment.salaNombre,
            appointment.pacienteNombre,
            appointment.pacienteCorreo,
            appointment.fecha,
            `sala ${appointment.salaId}`,
            `paciente ${appointment.pacienteId}`
        ]
            .join(" ")
            .toLowerCase();

        return matchesStatus && (!searchValue || haystack.includes(searchValue));
    });
});

const nextVisibleAppointment = computed(() =>
    [...filteredAppointments.value]
        .sort((left, right) => {
            const leftDate = toAppointmentDate(left)?.getTime() ?? 0;
            const rightDate = toAppointmentDate(right)?.getTime() ?? 0;
            return leftDate - rightDate;
        })[0] ?? null
);

const canceledAppointments = computed(
    () => appointments.value.filter((appointment) => appointment.estado === "cancelada").length
);

const statCards = computed(() => [
    {
        label: "Total",
        value: totalAppointments.value
    },
    {
        label: "Pendientes",
        value: pendingAppointments.value
    },
    {
        label: "Confirmadas",
        value: confirmedAppointments.value
    },
    {
        label: "Canceladas",
        value: canceledAppointments.value
    }
]);

const viewMode = computed(() =>
    String(route.query.view ?? "").toLowerCase() === "calendar" ? "calendar" : "list"
);

const calendarScale = computed(() => {
    const scale = String(route.query.scale ?? "").toLowerCase();
    return ["month", "week", "day"].includes(scale) ? scale : "month";
});

const calendarDate = computed(() => {
    const queryDate = String(route.query.date ?? "");

    if (parseDateKey(queryDate)) {
        return queryDate;
    }

    return getTodayDateKey(accountSettings.value.timeZone);
});

const calendarRange = computed(() =>
    getScaleRange(calendarScale.value, calendarDate.value)
);

const calendarSummaryMap = computed(() => mapSummaryByDate(calendarSummary.value));
const calendarItemsByDate = computed(() => groupAppointmentsByDate(calendarItems.value));

const activeCalendarAppointments = computed(() =>
    selectedCalendarDate.value
        ? calendarItemsByDate.value[selectedCalendarDate.value] ?? []
        : []
);

const activeCalendarSummary = computed(() =>
    selectedCalendarDate.value
        ? calendarSummaryMap.value[selectedCalendarDate.value] ??
          createEmptyCalendarSummary(selectedCalendarDate.value)
        : createEmptyCalendarSummary("")
);

const panelTitle = computed(() =>
    viewMode.value === "calendar" ? "Agenda visual de la cuenta" : "Agenda de la cuenta"
);

const panelDescription = computed(() =>
    viewMode.value === "calendar"
        ? "Revisa reservas por mes, semana o dia y abre el detalle del dia con un clic."
        : "Usa los filtros para localizar una reserva antes de editarla."
);

const showCalendarDetailAside = computed(
    () =>
        viewMode.value === "calendar" &&
        Boolean(selectedCalendarDate.value) &&
        !isMobileCalendarLayout()
);

const calendarDetailTitle = computed(() =>
    selectedCalendarDate.value ? "Reservas de la fecha" : "Detalle del dia"
);

async function fetchCalendarData() {
    calendarLoading.value = true;
    calendarError.value = "";

    try {
        const response = await getAppointmentCalendar(calendarRange.value);
        calendarSummary.value = response.data?.summaryByDate ?? [];
        calendarItems.value = response.data?.items ?? [];
    } catch (requestError) {
        calendarSummary.value = [];
        calendarItems.value = [];
        calendarError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible cargar el calendario de reservas.";
    } finally {
        calendarLoading.value = false;
    }
}

function openCreateModal() {
    pageError.value = "";
    modalMode.value = "create";
    modalError.value = "";

    if (!reservableRooms.value.length) {
        if (isAdminUser.value) {
            shouldOpenReservationAfterRoomCreate.value = true;
            openCreateRoomModal(
                "Primero crea una sala para poder agendar una reserva en esta cuenta."
            );
        } else {
            pageError.value =
                "Aun no hay salas disponibles. Solicita a un administrador que cree una sala antes de reservar.";
        }

        return;
    }

    currentAppointment.value = {
        estado: "pendiente",
        usuarioId: authStore.user?.id ?? null,
        salaId: reservableRooms.value[0]?.id ?? null
    };
    modalOpen.value = true;
}

function openEditModal(appointment) {
    pageError.value = "";
    modalMode.value = "edit";
    modalError.value = "";
    currentAppointment.value = {
        ...appointment
    };
    modalOpen.value = true;
}

function closeModal() {
    modalOpen.value = false;
    modalError.value = "";
    currentAppointment.value = {};
}

function openCreateRoomModal(message = "") {
    if (!isAdminUser.value) {
        pageError.value = "Solo un administrador puede crear salas.";
        return;
    }

    roomModalError.value = message;
    roomModalOpen.value = true;
}

function closeRoomModal() {
    roomModalOpen.value = false;
    roomModalError.value = "";
    shouldOpenReservationAfterRoomCreate.value = false;
}

async function fetchRooms() {
    try {
        const response = await getRooms();
        rooms.value = response.data ?? [];
    } catch (requestError) {
        rooms.value = [];
        pageError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible cargar las salas.";
    }
}

async function fetchBranches() {
    if (!isAdminUser.value) {
        branches.value = [];
        return;
    }

    try {
        const response = await getBranches();
        branches.value = response.data ?? [];
    } catch (requestError) {
        branches.value = [];
        pageError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible cargar las sucursales.";
    }
}

async function fetchAccountSettings() {
    try {
        const response = await getAccountSettings();
        accountSettings.value = {
            consultationDurationEnabled: Boolean(response.data?.consultationDurationEnabled),
            consultationDurationMinutes:
                Number(response.data?.consultationDurationMinutes ?? 30) || 30,
            procedureDurationEnabled: Boolean(response.data?.procedureDurationEnabled),
            procedureDurationMinutes:
                Number(response.data?.procedureDurationMinutes ?? 60) || 60,
            consultationOpenTime: response.data?.consultationOpenTime ?? "08:00",
            consultationCloseTime: response.data?.consultationCloseTime ?? "17:00",
            consultationNoClosing: Boolean(response.data?.consultationNoClosing),
            procedureOpenTime: response.data?.procedureOpenTime ?? "08:00",
            procedureCloseTime: response.data?.procedureCloseTime ?? "17:00",
            procedureNoClosing: Boolean(response.data?.procedureNoClosing),
            timeZone: response.data?.timeZone ?? "America/Costa_Rica",
            procedurePricingPolicy: response.data?.procedurePricingPolicy ?? "bloqueado",
            defaultProcedurePricingMode:
                response.data?.defaultProcedurePricingMode ?? "solo_sala"
        };
    } catch (requestError) {
        accountSettings.value = {
            consultationDurationEnabled: false,
            consultationDurationMinutes: 30,
            procedureDurationEnabled: false,
            procedureDurationMinutes: 60,
            consultationOpenTime: "08:00",
            consultationCloseTime: "17:00",
            consultationNoClosing: false,
            procedureOpenTime: "08:00",
            procedureCloseTime: "17:00",
            procedureNoClosing: false,
            timeZone: "America/Costa_Rica",
            procedurePricingPolicy: "bloqueado",
            defaultProcedurePricingMode: "solo_sala"
        };

        if (!pageError.value) {
            pageError.value =
                requestError.response?.msg ||
                requestError.message ||
                "No fue posible cargar la configuracion de tiempos.";
        }
    }
}

function handleViewModeChange(nextMode) {
    if (nextMode === "calendar") {
        updateRouteQuery({
            view: "calendar",
            scale: calendarScale.value,
            date: calendarDate.value
        });
        return;
    }

    selectedCalendarDate.value = "";
    calendarDetailModalOpen.value = false;
    updateRouteQuery({
        view: undefined,
        scale: undefined,
        date: undefined
    });
}

function handleCalendarScaleChange(nextScale) {
    updateRouteQuery({
        view: "calendar",
        scale: nextScale,
        date: calendarDate.value
    });

    if (nextScale === "day" && !selectedCalendarDate.value) {
        selectedCalendarDate.value = calendarDate.value;
    }
}

function handleCalendarNavigate(step) {
    let nextDate = calendarDate.value;

    if (calendarScale.value === "month") {
        nextDate = addMonths(calendarDate.value, step);
    } else if (calendarScale.value === "week") {
        nextDate = addDays(calendarDate.value, step * 7);
    } else {
        nextDate = addDays(calendarDate.value, step);
    }

    updateRouteQuery({
        view: "calendar",
        scale: calendarScale.value,
        date: nextDate
    });
}

function handleCalendarToday() {
    const todayKey = getTodayDateKey(accountSettings.value.timeZone);

    updateRouteQuery({
        view: "calendar",
        scale: calendarScale.value,
        date: todayKey
    });
}

function handleCalendarSelectDate(dateKey) {
    selectedCalendarDate.value = dateKey;
    updateRouteQuery({
        view: "calendar",
        scale: calendarScale.value,
        date: dateKey
    });

    if (isMobileCalendarLayout()) {
        calendarDetailModalOpen.value = true;
    }
}

function closeCalendarDetail() {
    selectedCalendarDate.value = "";
    calendarDetailModalOpen.value = false;
}

function normalizeComparableAppointment(source = {}) {
    return {
        fecha: String(source.fecha ?? "").trim(),
        horaInicio: String(source.horaInicio ?? "").slice(0, 5),
        horaFin: String(source.horaFin ?? "").slice(0, 5),
        descripcion: String(source.descripcion ?? "").trim(),
        tipoAtencion: String(source.tipoAtencion ?? "consulta").trim().toLowerCase(),
        tipoConsulta: String(source.tipoConsulta ?? "").trim(),
        pacienteId: Number(source.pacienteId ?? 0) || null,
        salaId: Number(source.salaId ?? 0) || null,
        estado: String(source.estado ?? "pendiente").trim().toLowerCase()
    };
}

function shouldUseStatusOnlyUpdate(nextPayload) {
    if (modalMode.value !== "edit" || !currentAppointment.value.id) {
        return false;
    }

    const currentComparable = normalizeComparableAppointment(currentAppointment.value);
    const nextComparable = normalizeComparableAppointment(nextPayload);

    return (
        currentComparable.estado !== nextComparable.estado &&
        currentComparable.fecha === nextComparable.fecha &&
        currentComparable.horaInicio === nextComparable.horaInicio &&
        currentComparable.horaFin === nextComparable.horaFin &&
        currentComparable.descripcion === nextComparable.descripcion &&
        currentComparable.tipoAtencion === nextComparable.tipoAtencion &&
        currentComparable.tipoConsulta === nextComparable.tipoConsulta &&
        currentComparable.pacienteId === nextComparable.pacienteId &&
        currentComparable.salaId === nextComparable.salaId
    );
}

function openAppointmentFromCalendar(appointment) {
    calendarDetailModalOpen.value = false;
    openEditModal(appointment);
}

async function handleCalendarRefresh() {
    await Promise.all([fetchAppointments(), fetchCalendarData()]);
}

async function handleSaveAppointment(payload) {
    pageError.value = "";
    modalError.value = "";

    if (!validarReservaNoIniciadaEnPasado(payload)) {
        modalError.value = PAST_RESERVATION_ERROR_MESSAGE;
        return;
    }

    let patientId = Number(payload?.paciente?.pacienteId);
    let createdPatient = null;

    if (payload?.paciente?.mode === "new") {
        try {
            const patientResponse = await createPatient({
                nombre: payload.paciente.nombre,
                telefono: payload.paciente.telefono,
                correo: payload.paciente.correo,
                fechaNacimiento: payload.paciente.fechaNacimiento,
                observaciones: payload.paciente.observaciones,
                tipoProcedimiento: payload.paciente.tipoProcedimiento ?? payload.tipoConsulta
            });

            createdPatient = patientResponse.data ?? null;
            patientId = Number(createdPatient?.id);
        } catch (requestError) {
            modalError.value =
                requestError.response?.msg ||
                requestError.message ||
                "No fue posible crear el paciente.";
            return;
        }
    }

    const appointmentPayload = {
        fecha: payload.fecha,
        horaInicio: payload.horaInicio,
        horaFin: payload.horaFin,
        descripcion: payload.descripcion,
        estado: payload.estado,
        tipoAtencion: payload.tipoAtencion,
        tipoConsulta: payload.tipoConsulta,
        usuarioId: Number(payload.usuarioId || authStore.user?.id || 0) || null,
        pacienteId: patientId,
        salaId: Number(payload.salaId)
    };

    const isStatusOnlyUpdate = shouldUseStatusOnlyUpdate(appointmentPayload);
    const result =
        modalMode.value === "edit" && currentAppointment.value.id
            ? isStatusOnlyUpdate
                ? await updateAppointmentStatus(
                      currentAppointment.value.id,
                      appointmentPayload.estado
                  )
                : await updateAppointment(currentAppointment.value.id, appointmentPayload)
            : await createAppointment(appointmentPayload);

    if (result.ok) {
        feedback.value = result.msg;
        closeModal();

        if (viewMode.value === "calendar") {
            await fetchCalendarData();
        }

        return;
    }

    if (createdPatient) {
        currentAppointment.value = {
            ...currentAppointment.value,
            ...appointmentPayload,
            pacienteId: patientId,
            pacienteNombre: createdPatient.nombre,
            pacienteTelefono: createdPatient.telefono,
            pacienteCorreo: createdPatient.correo
        };
    }

    modalError.value = createdPatient
        ? `${result.msg} El paciente ya fue creado y podras reutilizarlo en el siguiente intento.`
        : result.msg;
}

async function handleCreateRoom(payload) {
    roomSaving.value = true;
    roomModalError.value = "";

    try {
        const response = await createRoom(payload);
        const createdRoom = response.data ?? null;
        const shouldResumeReservation = shouldOpenReservationAfterRoomCreate.value;

        roomModalOpen.value = false;
        roomModalError.value = "";
        shouldOpenReservationAfterRoomCreate.value = false;
        pageError.value = "";
        feedback.value = response.msg;

        await Promise.all([fetchRooms(), fetchBranches()]);

        if (shouldResumeReservation) {
            modalMode.value = "create";
            modalError.value = "";
            currentAppointment.value = {
                estado: "pendiente",
                usuarioId: authStore.user?.id ?? null,
                salaId: createdRoom?.id ?? reservableRooms.value[0]?.id ?? null
            };
            modalOpen.value = true;
        }
    } catch (requestError) {
        roomModalError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible crear la sala.";
    } finally {
        roomSaving.value = false;
    }
}

async function handleDeleteAppointment(appointment) {
    const accepted = window.confirm(
        `Se eliminara la reserva ${appointment.id}. Deseas continuar?`
    );

    if (!accepted) {
        return;
    }

    const result = await deleteAppointment(appointment.id);
    feedback.value = result.msg;

    if (result.ok && viewMode.value === "calendar") {
        await fetchCalendarData();
    }
}

function clearFilters() {
    filters.value = {
        search: "",
        status: "todos"
    };
}

function logout() {
    authStore.logout();
    router.push("/login");
}

async function bootstrapAppointments() {
    pageError.value = "";

    if (!authStore.isHydrated) {
        await authStore.hydrate();
    }

    if (!authStore.isAuthenticated) {
        router.replace("/login");
        return;
    }

    await Promise.all([
        fetchAppointments(),
        fetchRooms(),
        fetchBranches(),
        fetchAccountSettings()
    ]);

    if (viewMode.value === "calendar") {
        await fetchCalendarData();
    }
}

watch(
    () => calendarDate.value,
    (nextDate) => {
        if (selectedCalendarDate.value) {
            selectedCalendarDate.value = nextDate;
        }
    }
);

watch(
    [() => viewMode.value, () => calendarScale.value],
    ([nextMode, nextScale]) => {
        if (nextMode !== "calendar") {
            calendarDetailModalOpen.value = false;
            return;
        }

        if (nextScale === "day" && !selectedCalendarDate.value) {
            selectedCalendarDate.value = calendarDate.value;
        }
    }
);

watch(
    [() => viewMode.value, () => calendarScale.value, () => calendarDate.value],
    async ([nextMode]) => {
        if (nextMode === "calendar" && authStore.isAuthenticated) {
            await fetchCalendarData();
        }
    }
);

onMounted(() => {
    bootstrapAppointments();
});
</script>

<template>
  <div class="appointments-view page-view">
    <div class="appointments-shell page-shell">
      <AppNavbar
        :links="navLinks"
        brand-href="/dashboard"
        action-label="Cerrar Sesion"
        :show-profile-icon="true"
        @action="logout"
      />

      <main class="appointments-main section-shell">
        <section v-reveal class="appointments-hero">
          <div>
            <span class="appointments-eyebrow">Operacion diaria</span>
            <h1>Reservas y disponibilidad</h1>
            <p>
              Trabaja la agenda desde una lista tradicional o desde un calendario visible
              por mes, semana y dia sin salir del mismo modulo.
            </p>
          </div>

          <div class="appointments-hero__actions">
            <BaseButton @click="openCreateModal">
              Agendar reserva
            </BaseButton>
            <BaseButton variant="ghost" @click="router.push('/appointments/past')">
              Historial de Reservas
            </BaseButton>
          </div>
        </section>

        <section class="appointments-stats stats-strip">
          <article
            v-for="card in statCards"
            :key="card.label"
            v-reveal="{ delay: 60 }"
            class="appointments-stat-card"
          >
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </article>
        </section>

        <section
          class="appointments-layout"
          :class="{ 'appointments-layout--calendar': viewMode === 'calendar' }"
        >
          <div class="appointments-content">
            <article v-reveal class="appointments-panel">
              <div class="appointments-panel__header">
                <div>
                  <span class="appointments-panel__eyebrow">Panel principal</span>
                  <h2>{{ panelTitle }}</h2>
                  <p>{{ panelDescription }}</p>
                </div>

                <div class="appointments-panel__tools">
                  <BaseButton
                    v-if="isAdminUser"
                    size="sm"
                    variant="ghost"
                    @click="openCreateRoomModal()"
                  >
                    Crear sala
                  </BaseButton>

                  <div class="appointments-panel__view-switch">
                    <button
                      type="button"
                      class="appointments-panel__view-button"
                      :class="{ 'is-active': viewMode === 'list' }"
                      @click="handleViewModeChange('list')"
                    >
                      Lista
                    </button>
                    <button
                      type="button"
                      class="appointments-panel__view-button"
                      :class="{ 'is-active': viewMode === 'calendar' }"
                      @click="handleViewModeChange('calendar')"
                    >
                      Calendario
                    </button>
                  </div>
                </div>
              </div>

              <p v-if="feedback" class="appointments-feedback">{{ feedback }}</p>
              <p
                v-if="pageError && !modalOpen && !roomModalOpen"
                class="appointments-error"
              >
                {{ pageError }}
              </p>
              <p v-if="error && !modalOpen && viewMode === 'list'" class="appointments-error">
                {{ error }}
              </p>

              <template v-if="viewMode === 'list'">
                <AppointmentFilters
                  :search="filters.search"
                  :status="filters.status"
                  @update:search="filters.search = $event"
                  @update:status="filters.status = $event"
                  @clear="clearFilters"
                />

                <AppointmentTable
                  :appointments="filteredAppointments"
                  :loading="loading"
                  :show-user="true"
                  :show-outcome="false"
                  :show-payment="true"
                  @edit="openEditModal"
                  @delete="handleDeleteAppointment"
                />
              </template>

              <template v-else>
                <AppointmentCalendar
                  :scale="calendarScale"
                  :active-date="calendarDate"
                  :summary-by-date="calendarSummary"
                  :items="calendarItems"
                  :loading="calendarLoading"
                  :error="calendarError"
                  @navigate="handleCalendarNavigate"
                  @today="handleCalendarToday"
                  @change-scale="handleCalendarScaleChange"
                  @select-date="handleCalendarSelectDate"
                  @select-appointment="openAppointmentFromCalendar"
                  @refresh="handleCalendarRefresh"
                />
              </template>
            </article>
          </div>

          <aside class="appointments-side">
            <template v-if="viewMode === 'calendar'">
              <article
                v-if="showCalendarDetailAside"
                v-reveal="100"
                class="appointments-side__card appointments-side__card--calendar"
              >
                <AppointmentDayPanel
                  :date-key="selectedCalendarDate"
                  :appointments="activeCalendarAppointments"
                  :summary="activeCalendarSummary"
                  :title="calendarDetailTitle"
                  @close="closeCalendarDetail"
                  @open-appointment="openAppointmentFromCalendar"
                />
              </article>

              <article
                v-else
                v-reveal="120"
                class="appointments-side__card appointments-side__card--calendar-hint"
              >
                <span class="appointments-panel__eyebrow">Selecciona un dia</span>
                <h3>Abre el detalle del calendario</h3>
                <p>Elige una fecha para ver las reservas del dia sin salir del modulo.</p>
              </article>
            </template>

            <template v-else>
              <article v-reveal="100" class="appointments-side__card">
                <span class="appointments-panel__eyebrow">Proxima visible</span>
                <template v-if="nextVisibleAppointment">
                  <h3>{{ nextVisibleAppointment.pacienteNombre || `Paciente #${nextVisibleAppointment.pacienteId}` }}</h3>
                  <p>{{ formatAppointmentMoment(nextVisibleAppointment) }}</p>
                  <div class="appointments-side__meta">
                    <span>{{ nextVisibleAppointment.salaNombre || `Sala #${nextVisibleAppointment.salaId}` }}</span>
                    <span>{{ nextVisibleAppointment.tipoConsulta }}</span>
                    <span>{{ nextVisibleAppointment.estado }}</span>
                  </div>
                </template>
                <template v-else>
                  <h3>No hay reservas futuras con los filtros actuales</h3>
                  <p>Prueba limpiando filtros o crea una nueva reserva.</p>
                </template>
              </article>

            </template>
          </aside>
        </section>
      </main>

      <AppFooter />
    </div>

    <BaseModal
      :open="modalOpen"
      :title="modalTitle"
      description="Completa la informacion para guardar la reserva."
      @close="closeModal"
    >
      <AppointmentForm
        :initial-value="currentAppointment"
        :submitting="saving"
        :mode="modalMode"
        :error-message="modalError"
        :current-user-id="authStore.user?.id ?? 0"
        :rooms="appointmentRoomOptions"
        @submit="handleSaveAppointment"
        @cancel="closeModal"
      />
    </BaseModal>

    <BaseModal
      :open="roomModalOpen"
      title="Crear sala"
      :description="roomModalDescription"
      @close="closeRoomModal"
    >
      <RoomForm
        :branch-options="activeBranchOptions"
        :submitting="roomSaving"
        :error-message="roomModalError"
        @submit="handleCreateRoom"
        @cancel="closeRoomModal"
      />
    </BaseModal>

    <BaseModal
      :open="calendarDetailModalOpen && Boolean(selectedCalendarDate)"
      :title="calendarDetailTitle"
      description="Revisa la ocupacion del dia y abre cualquier reserva para verla en el flujo actual."
      @close="closeCalendarDetail"
    >
      <AppointmentDayPanel
        :date-key="selectedCalendarDate"
        :appointments="activeCalendarAppointments"
        :summary="activeCalendarSummary"
        :title="calendarDetailTitle"
        @close="closeCalendarDetail"
        @open-appointment="openAppointmentFromCalendar"
      />
    </BaseModal>
  </div>
</template>

<style scoped>
.appointments-main {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.appointments-hero,
.appointments-panel,
.appointments-side__card {
  position: relative;
  overflow: hidden;
  border-radius: 26px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: var(--hero-surface);
  box-shadow: 0 28px 60px rgba(16, 38, 44, 0.08);
}

.appointments-hero::before,
.appointments-panel::before,
.appointments-side__card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: linear-gradient(90deg, rgba(17, 184, 159, 0.88), rgba(31, 80, 120, 0.74));
}

.appointments-stat-card {
  border-radius: 26px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  box-shadow: 0 28px 60px rgba(16, 38, 44, 0.08);
}

.appointments-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.45rem;
  background: var(--hero-surface-strong);
}

.appointments-eyebrow,
.appointments-panel__eyebrow {
  display: inline-flex;
  padding: 0.38rem 0.78rem;
  border-radius: 999px;
  background: var(--hero-chip-bg);
  color: var(--primary-dark);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.appointments-hero h1,
.appointments-panel__header h2,
.appointments-side__card h3 {
  margin: 0.7rem 0 0;
}

.appointments-hero p,
.appointments-panel__header p,
.appointments-side__card p {
  margin: 0.55rem 0 0;
  color: var(--text-soft);
}

.appointments-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  justify-content: flex-end;
}

.appointments-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.appointments-stat-card {
  padding: 1.1rem 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.appointments-stat-card span,
.appointments-stat-card small {
  color: var(--text-soft);
}

.appointments-stat-card strong {
  font-size: 2rem;
  color: var(--primary-dark);
}

.appointments-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.85fr);
  gap: 1rem;
  align-items: start;
}

.appointments-layout--calendar {
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.9fr);
}

.appointments-content {
  min-width: 0;
}

.appointments-panel,
.appointments-side__card {
  padding: 1.2rem;
}

.appointments-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.appointments-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.appointments-panel__tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.7rem;
}

.appointments-panel__view-switch {
  display: inline-flex;
  padding: 0.24rem;
  border-radius: 999px;
  background: var(--hero-surface-alt);
  border: 1px solid rgba(17, 184, 159, 0.12);
}

.appointments-panel__view-button {
  border: none;
  background: transparent;
  color: var(--text-soft);
  font: inherit;
  font-weight: 700;
  padding: 0.5rem 0.88rem;
  border-radius: 999px;
  cursor: pointer;
}

.appointments-panel__view-button.is-active {
  background: linear-gradient(135deg, rgba(17, 47, 71, 0.96), rgba(31, 80, 120, 0.92));
  color: #fff;
}

.appointments-feedback,
.appointments-error {
  margin: 0;
  padding: 0.95rem 1rem;
  border-radius: 18px;
}

.appointments-feedback {
  background: #eaf7f3;
  color: var(--primary-dark);
}

.appointments-error {
  background: rgba(235, 85, 69, 0.12);
  color: #b8392d;
}

.appointments-side {
  display: grid;
  gap: 1rem;
}

.appointments-side__card--calendar {
  position: sticky;
  top: 1rem;
}

.appointments-side__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.9rem;
}

.appointments-side__meta span {
  padding: 0.45rem 0.72rem;
  border-radius: 999px;
  background: #f2f7f8;
  border: 1px solid rgba(17, 184, 159, 0.1);
  color: var(--text-soft);
}

.appointments-side__list {
  margin: 0.9rem 0 0;
  padding-left: 1rem;
  color: var(--text-soft);
  display: grid;
  gap: 0.7rem;
}

@media (max-width: 980px) {
  .appointments-layout,
  .appointments-layout--calendar {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .appointments-hero,
  .appointments-panel__header {
    flex-direction: column;
    align-items: stretch;
  }

  .appointments-hero__actions,
  .appointments-panel__tools,
  .appointments-panel__view-switch {
    width: 100%;
  }

  .appointments-hero__actions {
    justify-content: stretch;
  }

  .appointments-hero__actions :deep(.base-button) {
    width: 100%;
  }

  .appointments-panel__view-button {
    flex: 1;
  }

  .appointments-layout--calendar .appointments-side {
    display: none;
  }
}
</style>
