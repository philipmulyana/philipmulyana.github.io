begin;

alter table public.mayar_verified_payments
  drop constraint mayar_verified_payments_amount_check;

alter table public.mayar_verified_payments
  add constraint mayar_verified_payments_amount_check check (amount >= 0);

comment on table public.mayar_verified_payments is
  'Minimum non-PII record of verified Dana Kuliah access, including completed voucher redemptions.';

commit;