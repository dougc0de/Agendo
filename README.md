# Agendo

Agendo es una aplicacion web para gestionar salas, pacientes y reservas.

Hoy el proyecto esta dividido en tres capas tecnicas:

- **Frontend**: Vue 3 + Vite
- **Backend API**: Express
- **Base de datos**: Supabase Postgres

En despliegue, eso normalmente significa:

- **Vercel** sirve el frontend
- **Render** ejecuta el backend
- **Supabase** guarda schema y datos

## Levantar el proyecto en local

Usa dos terminales separadas.

### Frontend
```bash
npm run dev
```

### Backend
```bash
npm run dev:api
```

## Scripts utiles

```bash
npm run build
npm run dev:api
npm run db:push:remote
npm run db:push:remote:dry
npm run supabase:status
npm run supabase:push
```

## Documentacion interna

- [iniciandoServer.md](./1scripts/iniciandoServer.md)
- [deployWorkflow.md](./1scripts/deployWorkflow.md)
- [responsive.md](./1scripts/responsive.md)
- [creacionSala.md](./1scripts/creacionSala.md)

## Regla importante

No todos los cambios se publican igual:

- cambios de **frontend** -> `git push` -> Vercel
- cambios de **backend** -> `git push` -> Render
- cambios de **schema en Supabase** -> `npm run db:push:remote`

Si cambias `supabase/migrations` y no haces `db push`, el codigo y la base quedan desalineados.

## Flujo oficial de migraciones

El flujo oficial del repo para empujar migraciones remotas es:

```bash
npm run db:push:remote:dry
npm run db:push:remote
```

Ese wrapper:

- carga `SUPABASE_DB_URL` desde `.env`
- evita depender de `supabase login`
- usa un `DOCKER_CONFIG` local al repo para no leer el perfil global de Docker

`supabase:push` y `supabase:status` quedan como alias compatibles de ese mismo flujo.
