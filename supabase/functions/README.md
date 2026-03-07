# Supabase Edge Functions

## delete-case-assets

Purpose: delete all `case-photos` storage objects associated with a case before the case row is removed.

### Deploy

```bash
supabase functions deploy delete-case-assets
```

### Required secrets

The function uses default Supabase runtime secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If needed, set them explicitly:

```bash
supabase secrets set SUPABASE_URL="https://<project-ref>.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

### Local invoke example

```bash
supabase functions serve delete-case-assets
curl -i -X POST "http://127.0.0.1:54321/functions/v1/delete-case-assets" \
  -H "Content-Type: application/json" \
  -d '{"caseId":"EVAL-20260307-001-王小明"}'
```
