CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    _user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
$$;

REVOKE ALL ON FUNCTION private.has_role(UUID, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) TO authenticated;

DO $policy_migration$
DECLARE
  policy_row RECORD;
  using_clause TEXT;
  check_clause TEXT;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE coalesce(qual, '') LIKE '%has_role(%'
       OR coalesce(with_check, '') LIKE '%has_role(%'
  LOOP
    using_clause := CASE
      WHEN policy_row.qual IS NULL THEN ''
      ELSE format(
        ' USING (%s)',
        regexp_replace(
          replace(policy_row.qual, 'public.has_role(', 'private.has_role('),
          '(^|[^.])has_role\(',
          '\1private.has_role(',
          'g'
        )
      )
    END;
    check_clause := CASE
      WHEN policy_row.with_check IS NULL THEN ''
      ELSE format(
        ' WITH CHECK (%s)',
        regexp_replace(
          replace(policy_row.with_check, 'public.has_role(', 'private.has_role('),
          '(^|[^.])has_role\(',
          '\1private.has_role(',
          'g'
        )
      )
    END;

    EXECUTE format(
      'ALTER POLICY %I ON %I.%I%s%s',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename,
      using_clause,
      check_clause
    );
  END LOOP;
END
$policy_migration$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

DROP FUNCTION public.has_role(UUID, public.app_role);

-- Public buckets serve known object URLs without a broad SELECT policy. Removing
-- these policies prevents anonymous clients from listing every stored object.
DROP POLICY IF EXISTS "Generated arts are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view moldes files" ON storage.objects;
