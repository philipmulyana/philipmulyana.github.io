begin;

delete from public.mayar_verified_payments newer
using public.mayar_verified_payments older
where newer.product_id = older.product_id
  and newer.amount = older.amount
  and newer.paid_at = older.paid_at
  and newer.verified_at > older.verified_at;

create unique index mayar_verified_access_identity_idx
  on public.mayar_verified_payments (product_id, amount, paid_at);

commit;