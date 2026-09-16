begin;

create table public.mayar_verified_payments (
  transaction_id text primary key check (char_length(transaction_id) between 16 and 100),
  product_id uuid not null,
  amount integer not null check (amount > 0),
  payment_status text not null check (payment_status = 'paid'),
  paid_at timestamptz not null,
  verified_at timestamptz not null default now()
);

comment on table public.mayar_verified_payments is
  'Minimum non-PII record of Dana Kuliah payments verified by Mayar readback.';

alter table public.mayar_verified_payments enable row level security;
revoke all on public.mayar_verified_payments from anon;
revoke all on public.mayar_verified_payments from authenticated;

create index mayar_verified_payments_paid_at_idx
  on public.mayar_verified_payments (paid_at desc);

create or replace function public.get_dana_kuliah_purchase_stats()
returns table (paid_count_7d bigint, latest_purchase_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where paid_at >= now() - interval '7 days') as paid_count_7d,
    max(paid_at) as latest_purchase_at
  from public.mayar_verified_payments
  where product_id = 'c06b0cd6-1e96-4f3f-b9b1-9e041410bac8'::uuid;
$$;

revoke all on function public.get_dana_kuliah_purchase_stats() from public;
revoke all on function public.get_dana_kuliah_purchase_stats() from anon;
revoke all on function public.get_dana_kuliah_purchase_stats() from authenticated;
grant execute on function public.get_dana_kuliah_purchase_stats() to service_role;

commit;
