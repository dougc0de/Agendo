drop view if exists public.reservas_vigentes;
drop view if exists public.reservas_historial;
drop view if exists public.reservas_visibilidad;

create view public.reservas_visibilidad as
select
    r.*,
    s.clinica_id,
    s.sucursal_id,
    coalesce(ws.time_zone, 'America/Costa_Rica') as time_zone,
    to_char((r.fecha::timestamp + r.hora_inicio), 'YYYY-MM-DD"T"HH24:MI') as start_key,
    to_char((r.fecha::timestamp + r.hora_fin), 'YYYY-MM-DD"T"HH24:MI') as end_key,
    to_char(
        timezone(coalesce(ws.time_zone, 'America/Costa_Rica'), now()),
        'YYYY-MM-DD"T"HH24:MI'
    ) as now_key,
    (
        coalesce(lower(r.estado), '') <> 'cancelada'
        and (r.fecha::timestamp + r.hora_fin) >= timezone(
            coalesce(ws.time_zone, 'America/Costa_Rica'),
            now()
        )
    ) as es_vigente,
    case
        when coalesce(lower(r.estado), '') = 'cancelada' then 'historial'
        when (r.fecha::timestamp + r.hora_fin) >= timezone(
            coalesce(ws.time_zone, 'America/Costa_Rica'),
            now()
        ) then 'vigente'
        else 'historial'
    end as visibility_bucket
from public.reservas r
inner join public.salas s
    on s.id = r.sala_id
   and s.workspace_id = r.workspace_id
left join public.workspace_settings ws
    on ws.workspace_id = r.workspace_id;

create view public.reservas_vigentes as
select *
from public.reservas_visibilidad
where es_vigente = true;

create view public.reservas_historial as
select *
from public.reservas_visibilidad
where es_vigente = false;
