-- ============================================================
-- KopaAlert: Atomic Business Database Deletion
-- ============================================================

create or replace function public.delete_business_data(
  p_business_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_exists boolean;
  v_customers integer := 0;
  v_debts integer := 0;
  v_payments integer := 0;
  v_notifications integer := 0;
  v_notification_queue integer := 0;
  v_financial_transactions integer := 0;
  v_notification_templates integer := 0;
  v_business_settings integer := 0;
  v_subscription_payments integer := 0;
  v_system_errors integer := 0;
  v_activity_logs integer := 0;
  v_users integer := 0;
  v_business_requests integer := 0;
begin
  if p_business_id is null then
    raise exception 'Business ID is required';
  end if;

  select exists(
    select 1
    from public.businesses
    where id = p_business_id
  )
  into v_business_exists;

  if not v_business_exists then
    raise exception 'Business not found';
  end if;

  -- Capture counts before deletion.
  select count(*) into v_customers
  from public.customers
  where business_id = p_business_id;

  select count(*) into v_debts
  from public.debts
  where business_id = p_business_id;

  select count(*) into v_payments
  from public.payments
  where business_id = p_business_id;

  select count(*) into v_notifications
  from public.notifications
  where business_id = p_business_id;

  select count(*) into v_notification_queue
  from public.notification_queue
  where business_id = p_business_id;

  select count(*) into v_financial_transactions
  from public.financial_transactions
  where business_id = p_business_id;

  select count(*) into v_notification_templates
  from public.notification_templates
  where business_id = p_business_id;

  select count(*) into v_business_settings
  from public.business_settings
  where business_id = p_business_id;

  select count(*) into v_subscription_payments
  from public.subscription_payments
  where business_id = p_business_id;

  select count(*) into v_system_errors
  from public.system_errors
  where business_id = p_business_id;

  select count(*) into v_activity_logs
  from public.activity_logs
  where business_id = p_business_id;

  select count(*) into v_users
  from public.users
  where business_id = p_business_id;

  select count(*)
  into v_business_requests
  from public.business_requests br
  where br.status = 'approved'
    and br.email = (
      select email
      from public.businesses
      where id = p_business_id
    )
    and br.business_name = (
      select business_name
      from public.businesses
      where id = p_business_id
    );

  -- ==========================================================
  -- Delete child/dependent records first.
  -- Any failure automatically rolls back the whole transaction.
  -- ==========================================================

  delete from public.notification_queue
  where business_id = p_business_id;

  delete from public.payments
  where business_id = p_business_id;

  delete from public.financial_transactions
  where business_id = p_business_id;

  delete from public.debts
  where business_id = p_business_id;

  delete from public.customers
  where business_id = p_business_id;

  delete from public.notifications
  where business_id = p_business_id;

  delete from public.notification_templates
  where business_id = p_business_id;

  delete from public.business_settings
  where business_id = p_business_id;

  delete from public.subscription_payments
  where business_id = p_business_id;

  delete from public.system_errors
  where business_id = p_business_id;

  delete from public.activity_logs
  where business_id = p_business_id;

  delete from public.users
  where business_id = p_business_id;

  -- Delete the matching approved request.
  delete from public.business_requests
  where status = 'approved'
    and email = (
      select email
      from public.businesses
      where id = p_business_id
    )
    and business_name = (
      select business_name
      from public.businesses
      where id = p_business_id
    );

  -- Finally delete the business itself.
  delete from public.businesses
  where id = p_business_id;

  return jsonb_build_object(
    'customers', v_customers,
    'debts', v_debts,
    'payments', v_payments,
    'notifications', v_notifications,
    'notification_queue', v_notification_queue,
    'financial_transactions', v_financial_transactions,
    'notification_templates', v_notification_templates,
    'business_settings', v_business_settings,
    'subscription_payments', v_subscription_payments,
    'system_errors', v_system_errors,
    'activity_logs', v_activity_logs,
    'users', v_users,
    'business_requests', v_business_requests
  );
end;
$$;

revoke all on function public.delete_business_data(uuid)
from public;

revoke all on function public.delete_business_data(uuid)
from anon;

revoke all on function public.delete_business_data(uuid)
from authenticated;

grant execute on function public.delete_business_data(uuid)
to service_role;
