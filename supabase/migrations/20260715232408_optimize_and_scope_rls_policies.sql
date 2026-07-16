DO $policy_optimization$
DECLARE
  policy_row RECORD;
  optimized_qual TEXT;
  optimized_check TEXT;
  using_clause TEXT;
  check_clause TEXT;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE coalesce(qual, '') ~ 'auth\.(uid|jwt|role)\(\)|private\.has_role\('
       OR coalesce(with_check, '') ~ 'auth\.(uid|jwt|role)\(\)|private\.has_role\('
  LOOP
    optimized_qual := replace(
      replace(
        replace(policy_row.qual, 'auth.uid()', '(SELECT auth.uid())'),
        'auth.jwt()',
        '(SELECT auth.jwt())'
      ),
      'auth.role()',
      '(SELECT auth.role())'
    );
    optimized_check := replace(
      replace(
        replace(policy_row.with_check, 'auth.uid()', '(SELECT auth.uid())'),
        'auth.jwt()',
        '(SELECT auth.jwt())'
      ),
      'auth.role()',
      '(SELECT auth.role())'
    );

    using_clause := CASE
      WHEN optimized_qual IS NULL THEN ''
      ELSE format(' USING (%s)', optimized_qual)
    END;
    check_clause := CASE
      WHEN optimized_check IS NULL THEN ''
      ELSE format(' WITH CHECK (%s)', optimized_check)
    END;

    EXECUTE format(
      'ALTER POLICY %I ON %I.%I TO authenticated%s%s',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename,
      using_clause,
      check_clause
    );
  END LOOP;
END
$policy_optimization$;
