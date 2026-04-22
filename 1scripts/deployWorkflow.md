# Flujo De Deploy Y Publicacion De Cambios En Agendo

## 1. Mapa del proyecto

Agendo no se publica como una sola pieza. Hoy tiene cuatro capas operativas:

1. **Codigo local**
   - tu maquina
   - donde haces los cambios primero

2. **Codigo remoto**
   - GitHub
   - donde queda la historia del proyecto

3. **Servicios desplegados**
   - **Vercel** para el frontend
   - **Render** para el backend

4. **Base de datos**
   - **Supabase**
   - schema, datos y migraciones

## 2. La regla mas importante

Antes de desplegar cualquier cambio, clasificalo.

### A. Cambios de frontend
Ejemplos:
- `src/views`
- `src/components`
- `src/router`
- `src/stores`
- `src/services/api.js`

Viaje normal:

```bash
git add .
git commit -m "..."
git push origin TU_RAMA
```

Luego:
- Vercel debe tomar esa rama
- `VITE_API_URL` debe seguir correcta

### B. Cambios de backend
Ejemplos:
- `src/server/routes`
- `src/server/services`
- `src/server/repositories`
- `src/server/middleware`

Viaje normal:

```bash
git add .
git commit -m "..."
git push origin TU_RAMA
```

Luego:
- Render debe tomar esa rama
- las variables de entorno deben seguir correctas

### C. Cambios de base de datos
Ejemplos:
- `supabase/migrations/*.sql`

Viaje normal:

```bash
git add .
git commit -m "..."
git push origin TU_RAMA
npm run supabase:status
npm run supabase:push
npm run supabase:status
```

**Esto no se arregla solo con `git push`.**

### D. Cambios de variables de entorno
Ejemplos:
- `.env` local
- env vars de Vercel
- env vars de Render

No viajan por Git.  
Se cambian en los paneles de cada servicio.

## 3. Flujo senior de release

Usa siempre este orden.

### Paso 1. Revisa qué cambiaste
```bash
git status
```

### Paso 2. Verifica que compile
```bash
npm run build
```

### Paso 3. Guarda el codigo en Git
```bash
git add .
git commit -m "mensaje claro"
git push origin TU_RAMA
```

### Paso 4. Si tocaste migraciones, empuja schema a Supabase
```bash
npm run supabase:status
npm run supabase:push
npm run supabase:status
```

### Paso 5. Revisa despliegues
- Vercel debe haber tomado la rama correcta
- Render debe haber tomado la rama correcta
- Supabase debe mostrar migraciones alineadas

### Paso 6. Smoke test
- la home abre
- `/login` carga
- `/signup` carga
- login responde
- signup responde
- el navegador no intenta llamar `http://localhost:3000`

## 4. Checklist local antes de publicar

- `git status` entendido
- `npm run build` sin error
- si cambiaste auth, prueba login local
- si cambiaste signup, prueba signup local
- si cambiaste migraciones, confirma que el archivo nuevo existe

## 5. Checklist remoto despues de publicar

- GitHub tiene el commit correcto
- Vercel desplego la rama correcta
- Render desplego la rama correcta
- Supabase tiene la migracion aplicada
- Insomnia responde bien en:
  - `POST /auth/login`
  - `POST /auth/signup`
  - `GET /auth/me`

## 6. Como leer problemas comunes

### Caso 1. GitHub si cambio, Vercel no
Probables causas:
- Vercel esta viendo otra rama
- fallo el build
- falta una env var de frontend

### Caso 2. GitHub si cambio, Render no
Probables causas:
- Render esta viendo otra rama
- fallo el arranque del backend
- falta una env var del backend

### Caso 3. Codigo nuevo, base vieja
Sintoma:
- signup o login fallan raro
- backend nuevo espera tablas o columnas que Supabase no tiene

Causa frecuente:
- faltó correr:
```bash
npm run supabase:push
```

### Caso 4. Produccion intenta llamar localhost
Sintoma:
- en DevTools aparece `http://localhost:3000`

Causa:
- `VITE_API_URL` no esta bien configurada en Vercel

## 7. Regla de trazabilidad

No hagas cambios estructurales solo desde dashboards si luego quieres mantener control del sistema.

Defaults recomendados:
- schema: mediante migraciones en `supabase/migrations`
- datos de prueba: en `seed.sql` o SQL guardado
- secretos: solo en paneles, nunca en Git
- cambios urgentes hechos a mano en remoto: luego se reflejan en una migracion o documento

## 8. Estado actual de Agendo

Puntos importantes del proyecto hoy:

- el login ya no vive en `/`
- la home vive en `/`
- el login vive en `/login`
- el signup vive en `/signup`
- el backend sigue siendo **Express**
- Supabase es la **base de datos**, no la API

## 9. Comandos utiles

### Frontend
```bash
npm run dev
```

### Backend
```bash
npm run dev:api
```

### Build
```bash
npm run build
```

### Revisar migraciones
```bash
npm run supabase:status
```

### Empujar migraciones
```bash
npm run supabase:push
```

## 10. Mini ritual que debes repetir siempre

Si quieres evitar que algo quede solo en local, repite este ritual:

```bash
git status
npm run build
git add .
git commit -m "..."
git push origin TU_RAMA
```

Y si cambiaste base de datos:

```bash
npm run supabase:status
npm run supabase:push
npm run supabase:status
```

Si no haces el segundo bloque cuando cambias `supabase/migrations`, el proyecto queda desalineado aunque GitHub si tenga el codigo nuevo.
