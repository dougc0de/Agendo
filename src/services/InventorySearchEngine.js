import Fuse from "fuse.js";

const DEFAULT_LIMIT = 8;

export class InventorySearchEngine {
    constructor(items = []) {
        this.setItems(items);
    }

    setItems(items = []) {
        this.items = Array.isArray(items) ? [...items] : [];
        this.itemMap = new Map(
            this.items.map((item) => [Number(item.id), item]).filter(([id]) => Number.isInteger(id))
        );
        this.fuse = new Fuse(this.items, {
            includeScore: true,
            shouldSort: true,
            threshold: 0.32,
            ignoreLocation: true,
            minMatchCharLength: 2,
            keys: [
                { name: "nombre", weight: 0.55 },
                { name: "descripcion", weight: 0.2 },
                { name: "categoria", weight: 0.3 },
                { name: "unidad", weight: 0.1 }
            ]
        });
    }

    findById(itemId) {
        const normalizedId = Number(itemId);
        return Number.isInteger(normalizedId) ? this.itemMap.get(normalizedId) ?? null : null;
    }

    search(query, options = {}) {
        const {
            selectedItemId = null,
            activeOnly = true,
            limit = DEFAULT_LIMIT
        } = options;

        const selectedItem = this.findById(selectedItemId);
        const normalizedQuery = String(query ?? "").trim().toLowerCase();

        const predicate = (item) => {
            if (!item) {
                return false;
            }

            if (Number(item.id) === Number(selectedItemId)) {
                return true;
            }

            return !activeOnly || item.estado === "activo";
        };

        let matches = [];

        if (!normalizedQuery) {
            matches = this.items.filter(predicate);
        } else if (normalizedQuery.length < 2) {
            matches = this.items.filter((item) => {
                if (!predicate(item)) {
                    return false;
                }

                return [item.nombre, item.categoria, item.unidad]
                    .concat(item.descripcion ?? "")
                    .join(" ")
                    .toLowerCase()
                    .includes(normalizedQuery);
            });
        } else {
            matches = this.fuse.search(normalizedQuery).map((entry) => entry.item).filter(predicate);
        }

        if (selectedItem && !matches.some((item) => Number(item.id) === Number(selectedItem.id))) {
            matches.unshift(selectedItem);
        }

        return matches.slice(0, limit);
    }
}

export default InventorySearchEngine;
