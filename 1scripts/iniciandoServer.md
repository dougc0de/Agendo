# Levantar Agendo en local

Usa dos terminales separadas. No cierres una para abrir la otra.

## Terminal 1 - Frontend
```bash
npm run dev
```

## Terminal 2 - Backend
```bash
npm run dev:api
```

## Si solo quieres arrancar el backend manualmente
```bash
node src/server/index.js
```

## Regla rapida
- `npm run dev` sirve el frontend en Vite
- `npm run dev:api` levanta Express
- si cierras la terminal del frontend, el navegador local deja de responder
