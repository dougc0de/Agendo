import { createRouter, createWebHistory } from "vue-router";
import LoginView from "../views/LoginView.vue";
import DashboardView from "../views/DashboardView.vue";

function hasSession() {
    return Boolean(localStorage.getItem("agendo-token"));
}

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: "/",
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

    if (to.name === "login" && authenticated) {
        return { name: "dashboard" };
    }

    return true;
});

export default router;
