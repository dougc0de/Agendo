alter table public.workspace_settings
    add column if not exists consultation_duration_enabled boolean not null default false,
    add column if not exists procedure_duration_enabled boolean not null default false,
    add column if not exists procedure_pricing_policy varchar(30) not null default 'bloqueado';

update public.workspace_settings
set
    consultation_duration_enabled = coalesce(consultation_duration_enabled, false),
    procedure_duration_enabled = coalesce(procedure_duration_enabled, false),
    procedure_pricing_policy = coalesce(procedure_pricing_policy, 'bloqueado');

alter table public.workspace_settings
    drop constraint if exists chk_workspace_settings_procedure_pricing_policy;

alter table public.workspace_settings
    add constraint chk_workspace_settings_procedure_pricing_policy
    check (procedure_pricing_policy in ('bloqueado'));
