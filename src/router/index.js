import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import LoginView from "../views/LoginView.vue";
import DashboardView from "../views/DashboardView.vue";
import AppointmentsView from "../views/AppointmentsView.vue";
import PatientsView from "../views/PatientsView.vue";
import SignupView from "../views/SignupView.vue";

function hasSession() {
    return Boolean(localStorage.getItem("agendo-token"));
}

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: "/",
            name: "home",
            component: HomeView
        },
        {
            path: "/login",
            name: "login",
            component: LoginView
        },
        {
            path: "/dashboard",
            name: "dashboard",
            component: DashboardView,
            meta: { requiresAuth: true }
        },
        {
            path: "/appointments",
            name: "appointments",
            component: AppointmentsView,
            meta: { requiresAuth: true }
        },
        {
            path: "/patients",
            name: "patients",
            component: PatientsView,
            meta: { requiresAuth: true }
        },
        {
            path: "/signup",
            name: "signup",
            component: SignupView
        },
        {
            path: "/home",
            redirect: "/"
        },
        {
            path: "/:pathMatch(.*)*",
            redirect: "/"
        }
    ]
});

router.beforeEach((to) => {
    const authenticated = hasSession();

    if (to.meta.requiresAuth && !authenticated) {
        return { name: "login" };
    }

    if ((to.name === "login" || to.name === "signup") && authenticated) {
        return { name: "dashboard" };
    }

    return true;
});

export default router;
