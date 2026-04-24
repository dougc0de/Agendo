import { computed, ref } from "vue";
import {
    createAppointment as createAppointmentRequest,
    deleteAppointment as deleteAppointmentRequest,
    getAppointments,
    updateAppointment as updateAppointmentRequest,
    updateAppointmentStatus as updateAppointmentStatusRequest
} from "../services/appointmentApi.js";

export function useAppointments() {
    const appointments = ref([]);
    const loading = ref(false);
    const saving = ref(false);
    const error = ref("");

    const totalAppointments = computed(() => appointments.value.length);
    const pendingAppointments = computed(
        () => appointments.value.filter((item) => item.estado === "pendiente").length
    );
    const confirmedAppointments = computed(
        () => appointments.value.filter((item) => item.estado === "confirmada").length
    );

    async function fetchAppointments() {
        loading.value = true;
        error.value = "";

        try {
            const response = await getAppointments();
            appointments.value = response.data ?? [];
            return response;
        } catch (requestError) {
            error.value = requestError.message;
            return {
                ok: false,
                msg: requestError.message
            };
        } finally {
            loading.value = false;
        }
    }

    async function createAppointment(payload) {
        saving.value = true;
        error.value = "";

        try {
            const response = await createAppointmentRequest(payload);

            if (response.ok) {
                await fetchAppointments();
            }

            return response;
        } catch (requestError) {
            error.value = requestError.message;
            return {
                ok: false,
                msg: requestError.message
            };
        } finally {
            saving.value = false;
        }
    }

    async function updateAppointment(id, payload) {
        saving.value = true;
        error.value = "";

        try {
            const response = await updateAppointmentRequest(id, payload);

            if (response.ok) {
                await fetchAppointments();
            }

            return response;
        } catch (requestError) {
            error.value = requestError.message;
            return {
                ok: false,
                msg: requestError.message
            };
        } finally {
            saving.value = false;
        }
    }

    async function updateAppointmentStatus(id, estado) {
        saving.value = true;
        error.value = "";

        try {
            const response = await updateAppointmentStatusRequest(id, estado);

            if (response.ok) {
                await fetchAppointments();
            }

            return response;
        } catch (requestError) {
            error.value = requestError.message;
            return {
                ok: false,
                msg: requestError.message
            };
        } finally {
            saving.value = false;
        }
    }

    async function deleteAppointment(id) {
        saving.value = true;
        error.value = "";

        try {
            const response = await deleteAppointmentRequest(id);

            if (response.ok) {
                await fetchAppointments();
            }
            return response;
        } catch (requestError) {
            error.value = requestError.message;
            return {
                ok: false,
                msg: requestError.message
            };
        } finally {
            saving.value = false;
        }
    }

    return {
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
    };
}
