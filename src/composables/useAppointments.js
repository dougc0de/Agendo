import { computed, ref } from "vue";
import { apiRequest } from "../services/api.js";

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
            const response = await apiRequest("/reservas");
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
            const response = await apiRequest("/reservas", {
                method: "POST",
                body: payload
            });

            if (response.data) {
                appointments.value = [response.data, ...appointments.value];
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
            const response = await apiRequest(`/reservas/${id}`, {
                method: "PUT",
                body: payload
            });

            if (response.data) {
                appointments.value = appointments.value.map((item) =>
                    item.id === response.data.id ? response.data : item
                );
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
            const response = await apiRequest(`/reservas/${id}`, {
                method: "DELETE"
            });

            appointments.value = appointments.value.filter((item) => item.id !== id);
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
        deleteAppointment
    };
}
