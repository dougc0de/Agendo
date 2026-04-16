insert into public.clinicas (
    nombre,
    direccion,
    telefono,
    hora_apertura,
    hora_cierre,
    dias_laborales,
    estado
)
select
    'Clinica Estetica Saenz',
    'Parque de los Poetas, 2 cuadras al norte',
    '89134973',
    '07:00:00',
    '22:00:00',
    'lunes,martes,miercoles,jueves,viernes,sabado',
    'activa'
where not exists (
    select 1
    from public.clinicas
    where nombre = 'Clinica Estetica Saenz'
      and telefono = '89134973'
);

insert into public.salas (
    nombre,
    tipo,
    descripcion,
    estado,
    capacidad,
    disponibilidad,
    clinica_id
)
select
    'Sala 1',
    'Procedimiento',
    'Realizacion de Tratamientos Esteticos',
    'activa',
    2,
    'disponible',
    c.id
from public.clinicas c
where c.nombre = 'Clinica Estetica Saenz'
  and not exists (
      select 1
      from public.salas s
      where s.nombre = 'Sala 1'
        and s.clinica_id = c.id
  );

insert into public.usuarios (
    nombre,
    correo,
    contrasena,
    rol,
    estado
)
values (
    'Admin',
    'admin@agendo.com',
    '$2b$10$.HMD/xhUI848kNo0H6UVqON07mHqjKdVtZhLSmA71S1LGWiVdpeJa',
    'admin',
    'activo'
)
on conflict (correo) do nothing;

insert into public.pacientes (
    nombre,
    fecha_nacimiento,
    telefono,
    correo,
    observaciones,
    estado,
    tipo_procedimiento
)
select
    'Juan Perez',
    '1995-04-10',
    '555-9999',
    'juan@test.com',
    'Sin observaciones',
    'activo',
    'consulta'
where not exists (
    select 1
    from public.pacientes
    where correo = 'juan@test.com'
);
