create policy "deny direct client access to PIN credentials"
on public.user_pin_credentials
for all
to anon, authenticated
using (false)
with check (false);

