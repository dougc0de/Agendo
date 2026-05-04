# Arquitectura actual de Agendo

Agendo opera hoy con esta estructura:

- **Frontend**: Vue 3 + Vite
- **Backend**: Node + Express
- **Acceso a datos**: `src/server/repositories`
- **Base de datos**: PostgreSQL administrado en Supabase
- **Autenticacion**: JWT y refresh tokens propios del backend

## Que significa "usar Supabase" aqui

En este proyecto, Supabase se usa como:

- base PostgreSQL administrada
- host de schema, datos y migraciones

No se usa hoy como:

- `supabase-js` en frontend para queries de negocio
- Supabase Auth como proveedor principal de login
- reemplazo del backend Express

## Flujo real de datos

```txt
Frontend Vue
-> API Express
-> Services del backend
-> Repositories SQL
-> PostgreSQL en Supabase
```

## Contrato tecnico de entorno

El runtime activo depende de estas variables:

- `SUPABASE_DB_URL`
- `PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `REFRESH_TOKEN_EXPIRES_IN`
- `AUTH_COOKIE_NAME`
- `AUTH_COOKIE_SECURE`
- `FRONTEND_ORIGIN`
- `VITE_API_URL` o `VITE_API_PROXY_TARGET` segun el entorno

`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y `DB_PORT` son legado y no deben considerarse fuente de verdad del sistema actual.

## Fuente de verdad del schema

La fuente de verdad del schema actual esta en:

- `supabase/migrations/`

Los archivos marcados como historicos en `docs/legacy/` no representan el runtime vigente.

## Flujo oficial de migraciones remotas

Para este repo, el flujo oficial de migraciones es remoto y usa `SUPABASE_DB_URL`:

- `npm run db:push:remote:dry`
- `npm run db:push:remote`

Esto evita depender de `supabase login` y de tener Supabase local levantado solo para empujar cambios al proyecto hospedado.

Cuando se quiera trabajar contra un stack local de Supabase, el prerequisito es levantarlo primero con `supabase start`. Ese flujo no reemplaza el push remoto oficial del repositorio.
