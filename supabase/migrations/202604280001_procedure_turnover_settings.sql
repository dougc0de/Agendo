alter table public.workspace_settings
    add column if not exists procedure_turnover_enabled boolean not null default false,
    add column if not exists procedure_turnover_minutes integer not null default 15;

update public.workspace_settings
set
    procedure_turnover_enabled = coalesce(procedure_turnover_enabled, false),
    procedure_turnover_minutes = coalesce(procedure_turnover_minutes, 15);

alter table public.workspace_settings
    drop constraint if exists chk_workspace_settings_procedure_turnover_minutes;

alter table public.workspace_settings
    add constraint chk_workspace_settings_procedure_turnover_minutes
    check (procedure_turnover_minutes between 5 and 480);
