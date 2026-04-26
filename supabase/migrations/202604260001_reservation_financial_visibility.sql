alter table public.reservation_charges
    add column if not exists patient_phone_snapshot text;

update public.reservation_charges rc
set patient_phone_snapshot = p.telefono
from public.pacientes p
where rc.patient_id = p.id
  and rc.workspace_id = p.workspace_id
  and rc.patient_phone_snapshot is null;
