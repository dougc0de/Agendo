alter table public.workspace_settings
    add column if not exists default_currency_code varchar(10) not null default 'CRC';

update public.workspace_settings
set default_currency_code = upper(coalesce(default_currency_code, 'CRC'));

alter table public.workspace_settings
    drop constraint if exists chk_workspace_settings_default_currency_code;

alter table public.workspace_settings
    add constraint chk_workspace_settings_default_currency_code
    check (
        default_currency_code in (
            'USD', 'MXN', 'GTQ', 'HNL', 'NIO', 'CRC', 'PAB', 'DOP', 'COP',
            'VES', 'PEN', 'BOB', 'CLP', 'ARS', 'PYG', 'UYU', 'BRL'
        )
    );

alter table public.reservation_charges
    alter column payment_method drop not null;

alter table public.reservation_charges
    alter column payment_method drop default;

update public.reservation_charges
set payment_method = null
where payment_status = 'pendiente'
  and paid_at is null
  and payment_method = 'otro';

update public.reservation_charges
set currency_code = upper(coalesce(currency_code, 'CRC'));

alter table public.reservation_charges
    drop constraint if exists chk_reservation_charges_currency_code;

alter table public.reservation_charges
    add constraint chk_reservation_charges_currency_code
    check (
        currency_code in (
            'USD', 'MXN', 'GTQ', 'HNL', 'NIO', 'CRC', 'PAB', 'DOP', 'COP',
            'VES', 'PEN', 'BOB', 'CLP', 'ARS', 'PYG', 'UYU', 'BRL'
        )
    );
