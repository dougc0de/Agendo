insert into public.reservation_charge_payments (
    workspace_id,
    charge_id,
    amount,
    currency_code,
    payment_method,
    paid_at,
    notes,
    registered_by_user_id
)
select
    rc.workspace_id,
    rc.id,
    coalesce(rc.total_billed_amount, rc.amount, 0)::numeric(12, 2),
    upper(coalesce(rc.currency_code, 'CRC')),
    coalesce(rc.payment_method, 'otro'),
    coalesce(rc.paid_at, rc.updated_at, rc.created_at, now()),
    'Pago reparado desde estado legacy pagado sin ledger.',
    coalesce(rc.registered_by_user_id, r.usuario_id)
from public.reservation_charges rc
left join public.reservas r
    on r.id = rc.reservation_id
   and r.workspace_id = rc.workspace_id
where rc.payment_status = 'pagado'
  and rc.charge_decision = 'cobrable'
  and coalesce(rc.total_billed_amount, rc.amount, 0) > 0
  and coalesce(rc.registered_by_user_id, r.usuario_id) is not null
  and not exists (
      select 1
      from public.reservation_charge_payments rcp
      where rcp.charge_id = rc.id
        and rcp.workspace_id = rc.workspace_id
  );
