import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router/index.js";
import "./style.css";

const app = createApp(App);

app.directive("reveal", {
    mounted(el, binding) {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const delay = Number(binding?.value?.delay ?? binding?.value ?? 0);

        el.classList.add("reveal-on-scroll");

        if (delay > 0) {
            el.style.setProperty("--reveal-delay", `${delay}ms`);
        }

        if (reducedMotion || typeof IntersectionObserver === "undefined") {
            el.classList.add("is-visible");
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                });
            },
            {
                threshold: 0.12,
                rootMargin: "0px 0px -8% 0px"
            }
        );

        el.__revealObserver = observer;
        observer.observe(el);
    },
    unmounted(el) {
        el.__revealObserver?.disconnect();
        delete el.__revealObserver;
    }
});

app.use(createPinia());
app.use(router);
app.mount("#app");
