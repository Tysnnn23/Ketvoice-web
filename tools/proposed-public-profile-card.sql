-- PROPOSED, NOT DEPLOYED. For the owner to decide (Ketvoice repository, supabase/migrations).
--
-- Why: link previews of /u/<handle> (Discord, WhatsApp, X…) are built on Vercel without a signed-in listener, and
-- 6.3 grants ketvoice_public_profile() to `authenticated` only. Until a function like this exists, a shared profile
-- link previews as « @handle sur Ketvoice » (the handle comes from the link itself, nothing from the database), and
-- the profile itself shows only to a listener signed in on /player in that browser.
--
-- What it would open to anyone, without an account: for a profile the owner made PUBLIC, its handle, its display
-- name and how many public playlists it has. Nothing else: no photo (the public-avatar bucket stays readable by
-- signed-in listeners only), no playlist contents, no « listening », no id, no e-mail. A private or unknown handle
-- answers null, the same answer, so handles cannot be probed beyond what is already public.
-- api/og-page.js calls it with the anon key (POST /rest/v1/rpc/ketvoice_public_profile_card {"handle": …}),
-- caches the answer ten minutes and at Vercel's edge for ten more; it stops asking for ten minutes on a 404.
create or replace function public.ketvoice_public_profile_card(handle text) returns jsonb
language sql stable security definer set search_path = '' as $$
  -- $1, not the parameter's name: in a SQL function an unqualified « handle » would be the column.
  select case when lower(btrim(coalesce($1, ''))) ~ '^[a-z0-9_.]{3,24}$' then (
    select jsonb_build_object(
      'handle', p.handle,
      'display_name', left(coalesce(p.display_name, ''), 60),
      'playlists', (select count(*) from public.ketvoice_public_playlists pp where pp.owner_id = p.id))
    from public.ketvoice_profiles p
    where p.handle = lower(btrim($1)) and p.is_public)
  end
$$;
revoke all on function public.ketvoice_public_profile_card(text) from public;
grant execute on function public.ketvoice_public_profile_card(text) to anon, authenticated;
