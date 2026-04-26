# AGENDO - Decision de planes, valor actual y propuesta de empaquetado

**Fecha:** 26 de abril de 2026  
**Objetivo:** dejar un documento util para producto, programacion y devops sobre:

- todas las features que hoy existen en AGENDO;
- el valor real que aportan;
- que conviene dejar en cada plan;
- donde conviene dejar dolor sano para empujar upgrade sin bajar calidad;
- que ya se puede limitar hoy y que todavia requiere trabajo tecnico de entitlement.

---

## 1. Resumen ejecutivo

AGENDO ya no es solo agenda. Hoy el producto tiene 6 capas de valor bastante claras:

1. **Capa SaaS real:** signup, trial, cuenta multi-tenant, roles, limites por plan.
2. **Capa operativa:** reservas, calendario, historial, pacientes, sucursales, salas y usuarios internos.
3. **Capa administrativa:** configuraciones por cuenta, moneda, horarios, politica procedural.
4. **Capa financiera:** facturacion procedural, confirmacion posterior de pago, historico pagado/no pagado y PDF imprimible.
5. **Capa de inventario:** catalogo, stock por sucursal, movimientos y consumo en procedimientos.
6. **Capa analitica:** dashboard por rol con KPIs operativos y gerenciales.

### Lectura comercial rapida

- **Basico** debe vender orden operativo real, no una demo.
- **Premium** debe sentirse como "la version que ya resuelve la clinica de verdad".
- **Enterprise** hoy necesita mejor diferenciacion funcional o comercial; si no, se ve como solo "mas capacidad".
- El **add-on de WhatsApp** ya esta bien posicionado comercialmente y debe vivir como mejora opcional desde `Premium`.

### Recomendacion madre

La mejor separacion hoy no es castigar el flujo base.  
La mejor separacion es esta:

- **Basico:** operacion central
- **Premium:** operacion + finanzas + inventario + mas control
- **Enterprise:** Premium + escala multi-sucursal + lectura gerencial mas profunda + atencion comercial asistida

---

## 2. Estado real del producto hoy

### Lo que ya existe de verdad en codigo

- landing publica
- login
- signup publico
- trial automatico de 14 dias
- planes `Basico`, `Premium`, `Enterprise`
- pricing publico en `HomeView`
- add-on comercial `Asistente Operativo de Citas por WhatsApp`
- auth con cuenta, sucursal y rol
- reservas activas
- calendario de reservas
- historial de reservas
- pacientes
- sucursales
- usuarios internos
- configuraciones de cuenta
- finanzas operativas
- inventario operativo con stock y movimientos
- dashboard con KPIs por rol

### Lo que existe solo a nivel comercial/preparado, no como capacidad productiva completa

- el add-on de WhatsApp existe en pricing, seleccion comercial y elegibilidad por plan, **pero no esta implementado todavia como integracion viva de mensajeria**
- `Enterprise` existe comercialmente y en limites, pero **todavia no tiene una identidad funcional tan fuerte como deberia**

### Lo que no se debe vender como hecho

- checkout publico del SaaS
- pagos online del paciente
- CRM conectado desde el formulario publico
- historia clinica
- inventario legal tipo kardex/ERP

---

## 3. Inventario completo de features y valor

## 3.1. Capa publica y comercial

| Area | Feature actual | Valor que aporta | Estado real hoy | Comentario comercial |
|---|---|---|---|---|
| Landing | HomeView institucional | Presenta AGENDO como SaaS serio y orientado a clinicas | Activo | Buena base de conversion |
| Pricing | Seccion `Precios` en HomeView | Hace comprensible el modelo comercial | Activo | Muy importante para conversion |
| Pricing | 3 planes publicos visibles | Ordena la oferta y reduce confusion | Activo | `Enterprise` necesita mas fuerza |
| Add-on | WhatsApp como add-on opcional | Introduce expansion de ticket sin forzar | Activo a nivel comercial | No esta vivo aun como feature operativa |
| CTA comercial | Conexion de plan con signup | Reduce friccion de arranque | Activo | Bien alineado con trial |
| Signup | Registro publico por plan | Convierte interesados en cuentas reales | Activo | Solo `Basico` y `Premium` autoservicio |
| Trial | 14 dias automativos | Baja barrera de prueba | Activo | Excelente para adquisicion |

## 3.2. Capa SaaS y control de cuenta

| Area | Feature actual | Valor que aporta | Estado real hoy | Comentario de producto |
|---|---|---|---|---|
| Cuenta | Multi-tenancy por `workspace` | Aisla datos por clinica | Activo | Base correcta para SaaS |
| Roles | owner/admin, recepcionista, doctor | Permite experiencia por rol | Activo | Muy valioso para orden operativo |
| Suscripcion | Plan, estado comercial, trial y limites | Sostiene logica SaaS | Activo | Solo parte de los limites se fuerza hoy |
| Limites | max usuarios, max salas, max reservas/mes | Crea escalado comercial real | Activo | Ya existen como estructura y parte de enforcement |
| Sucursal en sesion | branchId y branchName en auth | Permite scoping real | Activo | Muy importante para seguridad y operacion |

## 3.3. Operacion clinica central

| Area | Feature actual | Valor que aporta | Estado real hoy | Potencia comercial |
|---|---|---|---|---|
| Dashboard | Vista principal por rol | Ahorra tiempo de lectura diaria | Activo | Muy buen valor percibido |
| Reservas | Crear, editar, eliminar | Ordena la agenda diaria | Activo | Es el corazon del producto |
| Reservas | Estados `pendiente`, `confirmada`, `cancelada` | Mejora seguimiento operativo | Activo | Muy util para recepcion |
| Reservas | Resultado operativo `atendida`, `no_show`, etc. | Alimenta KPIs y cierre operativo | Activo | Diferenciador silencioso |
| Reservas | Vista `Lista / Calendario` | Mejora lectura segun preferencia del usuario | Activo | Alto valor de UX |
| Calendario | Mes, semana, dia | Permite lectura temporal real | Activo | Muy valioso para doctores y recepcion |
| Validaciones | Choques, horarios, operacion por tipo | Reduce errores humanos | Activo | Calidad fuerte del producto |
| Historial | Modulo separado de reservas pasadas | Evita contaminar agenda operativa | Activo | Muy importante |
| Historial | Pago visible en reservas pasadas | No deja que lo pagado "desaparezca" | Activo | Buen criterio contable/operativo |
| Pacientes | CRUD rapido + busqueda | Reutiliza datos y evita retrabajo | Activo | Core de toda operacion |
| Sucursales | CRUD con conteos | Permite operar por sede | Activo | Muy relevante desde Premium |
| Salas | Gestion operativa ligada a reservas | Ordena capacidad fisica | Activo | Parte del dolor principal que alivia AGENDO |
| Usuarios internos | Crear admin, recepcionista, doctor | Hace multiusuario la operacion | Activo | Muy importante para upsell por volumen |
| Settings | Horarios, timezone, moneda, tiempos de referencia | Ajusta producto a cada clinica | Activo | Calidad base, no lujo |

## 3.4. Finanzas operativas

| Area | Feature actual | Valor que aporta | Estado real hoy | Potencia comercial |
|---|---|---|---|---|
| Facturacion procedural | Emitir factura por procedimiento | Da cierre administrativo real | Activo | Diferenciador fuerte |
| Flujo de cobro | Factura primero, pago despues | Se parece a operacion real de clinica | Activo | Muy valioso para recepcion |
| Estados financieros | por facturar, pendiente, pagado | Da visibilidad de caja operativa | Activo | Fuerte para direccion |
| Historico pagado | Pagadas visibles en finanzas e historial | Permite revisar cierre de dia/mes | Activo | Muy importante para duen@ |
| PDF | Factura imprimible | Formaliza el cobro y da soporte operativo | Activo | Muy buena percepcion de seriedad |
| Exoneracion | Control de exonerado | Ordena excepciones | Activo | Valor administrativo alto |
| Monedas | Moneda por cuenta y por caso | Facilita LATAM | Activo | Valor comercial real |
| Reportes financieros | cobrados, pendientes, exonerados, salas, usuarios, margen | Permite leer numeros | Activo | Muy premium por naturaleza |

## 3.5. Inventario operativo

| Area | Feature actual | Valor que aporta | Estado real hoy | Potencia comercial |
|---|---|---|---|---|
| Catalogo | Crear insumos por cuenta | Flexibilidad por clinica | Activo | Bien resuelto |
| Alcance | Global o por sucursal | Control realista por sede | Activo | Valor alto para operaciones crecientes |
| Tipo | Desechable o reusable | Mejor modelado operativo | Activo | Bueno para procesos |
| Stock | Stock actual y minimo por sucursal | Control practico sin ERP complejo | Activo | Muy buen diferenciador |
| Movimientos | entrada, salida, ajuste, consumo, devolucion | Trazabilidad basica real | Activo | Muy valioso |
| Consumo procedural | Descuento automatico desde procedimiento | Une operacion clinica con inventario | Activo | Diferenciador serio |
| Alertas | bajo stock, agotado, inactivo | Ayuda a prevenir faltantes | Activo | Muy bueno para admin |
| Reportes | consumo por sala, sucursal, procedimiento, fecha, usuario | Permite lectura de uso y costo | Activo | Claro material de upsell |

## 3.6. KPIs y analitica

| Area | Feature actual | Valor que aporta | Estado real hoy | Potencia comercial |
|---|---|---|---|---|
| Dashboard admin | KPIs gerenciales y financieros | Da lectura ejecutiva del negocio | Activo | Muy valioso para Premium/Enterprise |
| Dashboard recepcion | KPIs operativos y cobranza basica | Ayuda a manejar el dia a dia | Activo | Valor real para operacion |
| Dashboard doctor | Vista personal | Ordena agenda propia | Activo | Bueno como valor complementario |
| KPIs | ocupacion, no-show, cancelacion, ticket, ingreso, margen, leakage | Ayuda a tomar decisiones | Activo | Muy fuerte comercialmente |
| Filtros | fecha, sucursal, sala, medico, estado, moneda, granularidad | Hace util la analitica | Activo | Muy importante para cuentas maduras |
| Alertas | no-show alto, baja ocupacion, pendiente alto, etc. | Convierte datos en accion | Activo | Diferenciador claro |

---

## 4. Features que hoy mas venden valor

Estas son las features que hoy mas ayudan a justificar upgrade o mejor posicionamiento:

1. **Reservas + calendario + validacion operativa**
2. **Multiusuario por rol**
3. **Historial limpio con estado de pago**
4. **Facturacion procedural interna**
5. **PDF imprimible**
6. **Inventario con stock y movimientos**
7. **KPIs gerenciales**
8. **Moneda por cuenta + LATAM**
9. **Multi-sucursal**
10. **Add-on de WhatsApp como futura capa de automatizacion**

---

## 5. Que cosas no deben sacrificarse nunca, ni en Basico

Si se dañan estas, el producto se sentira "capado" y no "premiumizable":

- estabilidad del login y del signup
- confiabilidad de reservas y calendario
- validacion de choques y horarios
- UX clara en agenda
- CRUD de pacientes usable
- roles correctos
- seguridad de datos por cuenta
- responsive serio

**Regla:** el dolor del plan inferior debe venir por **alcance, automatizacion, lectura gerencial y control avanzado**, no por romper el flujo base.

---

## 6. Lo que ya se puede limitar hoy vs lo que requiere trabajo tecnico

## 6.1. Ya se puede limitar o encauzar casi de inmediato

| Control | Estado |
|---|---|
| Usuarios maximos por plan | Ya existe en modelo |
| Salas maximas por plan | Ya existe en modelo |
| Reservas por mes por plan | Ya existe en modelo |
| Signup publico solo para `Basico` y `Premium` | Ya existe |
| WhatsApp solo desde `Premium` y `Enterprise` | Ya existe en pricing comercial |

## 6.2. Requiere nueva capa de entitlement / feature flags

| Control sugerido | Requiere trabajo |
|---|---|
| Ocultar o bloquear modulo Finanzas por plan | Si |
| Ocultar o bloquear Inventario por plan | Si |
| Habilitar KPIs solo en ciertos planes | Si |
| Limitar numero de sucursales por plan | Si |
| Limitar reportes avanzados por plan | Si |
| Limitar PDF / factura procedural por plan | Si |
| Persistir add-ons activos por cuenta | Si |
| Medir uso de mensajes de WhatsApp | Si |

### Recomendacion tecnica

No meter esta logica como `if` sueltos en vistas.  
Conviene una capa central tipo:

- `planCapabilities.js` compartido
- verificacion backend por capability
- frontend que solo renderiza lo permitido
- futura tabla `subscription_addons`
- futura tabla `subscription_entitlements` si la estrategia crece

---

## 7. Reparto recomendado por plan

## 7.1. Plan Basico - debe resolver la operacion base, pero dejar hambre

### Que deberia incluir

- dashboard operativo simple
- reservas completas
- calendario completo
- historial de reservas
- pacientes
- salas
- sucursal principal
- usuarios internos
- configuraciones base
- trial de 14 dias
- 3 usuarios, 3 salas, 500 reservas/mes

### Que no deberia incluir

- add-on de WhatsApp
- facturacion procedural completa
- inventario operativo con stock y movimientos
- KPIs gerenciales y financieros avanzados
- comparativas por sala/sucursal/usuario
- control multi-sucursal real

### Dolor sano que deja

- recepcion y direccion siguen ordenadas, pero sin cierre financiero dentro del sistema
- la clinica crece y empieza a extrañar:
  - cobro interno estructurado
  - control de insumos
  - lectura de numeros
  - automatizacion operativa

### Comentario estrategico

**Mi recomendacion fuerte:** Basico debe ser "operacion ordenada", no "operacion + administracion completa".  
Si le das tambien finanzas, inventario y KPIs, `Premium` pierde demasiado peso.

---

## 7.2. Plan Premium - debe sentirse como la version completa para la mayoria

### Que deberia incluir

Todo lo de Basico, mas:

- finanzas operativas completas
- emitir factura procedural
- confirmar pago despues
- historial pagado / no pagado
- PDF imprimible
- moneda por cuenta y por caso
- inventario clinico
- stock por sucursal
- movimientos de inventario
- consumo automatico en procedimientos
- reportes financieros operativos
- dashboard con KPIs para admin y recepcion
- acceso al add-on de WhatsApp
- 10 usuarios, 10 salas, 3000 reservas/mes

### Que dolor deja hacia Enterprise

- cuentas con varias sedes empiezan a querer mas acompanamiento
- operaciones mas complejas quieren gobierno multi-sucursal mas fino
- direccion puede querer comparativas y lectura ejecutiva mas profunda
- cuentas grandes van a querer trato comercial y activacion mas guiada

### Comentario estrategico

`Premium` debe ser el plan que haga que la clinica diga:  
**"Aqui ya puedo operar en serio."**

Si `Premium` no incluye finanzas + inventario + analitica util, el gap contra `Basico` no justifica bien el salto de precio.

---

## 7.3. Plan Enterprise - hoy necesita mejor personalidad

### Lo que hoy puede prometer honestamente

- todo lo de Premium
- mas capacidad
- venta asistida
- posibilidad de negociacion comercial
- add-on de WhatsApp negociable o agregado

### Problema actual

Hoy `Enterprise` esta mas definido por:

- limites altos
- flujo comercial asistido

que por una **diferencia funcional realmente fuerte**.

### Recomendacion para que Enterprise no se vea vacio

Si quieres que Enterprise tenga peso, conviene dejarle al menos una de estas capas como exclusivas o reforzadas:

- comparativas multi-sucursal mas profundas
- reportes gerenciales avanzados
- ventanas historicas mas largas
- soporte de onboarding asistido
- ajustes comerciales o de rollout por cuenta

### Nota honesta

Parte de esto ultimo no esta completamente codificado hoy como capability propia de Enterprise.  
Se puede vender solo si el equipo decide envolverlo tambien con servicio, no solo con features.

---

## 7.4. Add-on: Asistente Operativo de Citas por WhatsApp

### Estado real hoy

- existe en pricing y flujo comercial
- no existe todavia como integracion viva

### Reglas comerciales correctas

- **No disponible en Basico**
- **Disponible en Premium**
- **Disponible o negociable en Enterprise**

### Precio definido hoy

- `USD 19/mes`
- incluye `500 mensajes`
- excedente: `USD 0.04` por mensaje enviado o recibido

### Valor que vende

- confirmar cita
- cancelar cita
- solicitar reprogramacion
- consultar fecha/hora
- reducir carga a recepcion
- bajar llamadas repetitivas

### Comentario estrategico

Este add-on esta muy bien para:

- subir ticket sin ensuciar el core del plan
- diferenciar a Premium sin regalar todo en Basico
- preparar expansion futura hacia automatizacion conversacional

---

## 8. Mi propuesta concreta de empaquetado

| Capa / Feature | Basico | Premium | Enterprise | WhatsApp Add-on |
|---|---|---|---|---|
| Signup + trial | Si | Si | Venta asistida | No aplica |
| Reservas + calendario | Si | Si | Si | No aplica |
| Historial de reservas | Si | Si | Si | No aplica |
| Pacientes | Si | Si | Si | No aplica |
| Salas | Si | Si | Si | No aplica |
| Usuarios internos | Si | Si | Si | No aplica |
| Sucursales | Solo base / 1 activa sugerida | Si | Si | No aplica |
| Dashboard operativo | Si | Si | Si | No aplica |
| KPIs gerenciales | No | Si | Si reforzado | No aplica |
| Facturacion procedural | No | Si | Si | No aplica |
| PDF imprimible | No | Si | Si | No aplica |
| Moneda por caso | No | Si | Si | No aplica |
| Inventario con stock | No | Si | Si | No aplica |
| Movimientos de inventario | No | Si | Si | No aplica |
| Reportes financieros | No o muy basicos | Si | Si reforzados | No aplica |
| Reportes de inventario | No | Si | Si | No aplica |
| Comparativas multi-sucursal profundas | No | Parcial o no | Si | No aplica |
| Asistente por WhatsApp | No | Opcional | Opcional / negociable | Si |

---

## 9. Donde conviene dejar dolor para empujar upgrade

### Dolor correcto para sacar de Basico

- no tener facturacion procedural
- no tener inventario con stock
- no tener reportes financieros
- no tener dashboard gerencial
- no tener WhatsApp
- limite real de escala por usuarios, salas y reservas

### Dolor correcto para dejar entre Premium y Enterprise

- capacidad y volumen
- comparativas multi-sucursal mas profundas
- capa comercial mas asistida
- configuracion especial o acompanamiento

### Dolor incorrecto que NO conviene dejar

- una agenda inestable
- mala UX en reservas
- bugs en calendario
- pacientes capados de forma absurda
- lentitud fuerte
- seguridad debil

---

## 10. Riesgos y contradicciones que el equipo debe mirar

### 1. Enterprise hoy tiene mas discurso que diferencia funcional

Si no se refuerza, puede verse como:

- Premium con numero mas alto
- contacto de ventas sin una razon poderosa

### 2. El add-on de WhatsApp ya se vende antes de existir operacionalmente

Eso no es malo si se maneja como:

- interes comercial
- activacion futura coordinada

Pero **no** debe venderse como si ya estuviera plenamente operativo.

### 3. El briefing viejo de marketing se quedo atras en inventario

Hoy el producto **si** tiene inventario operativo con stock y movimientos.  
Ese valor ya merece ser empaquetado como diferenciador de plan.

### 4. Los KPIs por rol ya son un asset fuerte

Eso puede ser premiumizable con mucho sentido.  
No conviene regalar toda la lectura gerencial en el plan mas barato.

---

## 11. Recomendacion final para programacion y devops

## Producto

Adoptar esta narrativa:

- **Basico = orden operativo**
- **Premium = operacion + control administrativo real**
- **Enterprise = escala + lectura ejecutiva + trato asistido**

## Programacion

La siguiente fase deberia ser una capa de `capabilities` por plan, no condicionales sueltos.  
Orden sugerido:

1. capability map compartido
2. bloqueo backend por capability
3. ocultamiento frontend por capability
4. add-ons persistidos por cuenta
5. medicion de consumo del add-on

## DevOps / medicion

Conviene empezar a medir desde ya:

- cuentas creadas por plan
- conversion trial -> activa
- uso real de reservas por cuenta
- uso de finanzas por cuenta
- uso de inventario por cuenta
- uso de dashboard KPI por cuenta
- interes comercial por add-on de WhatsApp

---

## 12. Cierre

Si tuviera que resumir la mejor decision de planes hoy en una sola frase, seria esta:

> **No le quiten a Basico la capacidad de resolver el dia a dia; quitenle la capacidad de cerrar y leer el negocio completo.**

Eso deja un producto digno en entrada, un `Premium` claramente superior y un `Enterprise` que todavia puede crecer con mejor identidad.
