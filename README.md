# NOVA Operations

An authenticated operations dashboard with work orders, priorities, state transitions, recent telemetry, filters, and export.

## Run

Requirements: JavaScript, TypeScript, Vercel Functions, and Supabase.

```sh
npm ci
npm test
npm run typecheck
npm run dev
```

## Behavior

Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Users create an account and confirm their email when required. Work orders follow open → acknowledged → closed. RLS policies isolate records by user; the operations archive uses the same account.

## Optional report archive

Export a JSON report, then run `python cloud/sync.py enqueue result.json --project painel-admin-aposta` and `python cloud/sync.py sync`. Synchronization requires `BRUNNODEV_ACCESS_TOKEN` and the external operations API; the local outbox retains unacknowledged reports.

## License

Original source and documentation are MIT licensed; see [LICENSE](LICENSE). Third-party dependencies and media retain their respective terms. Maintained by [Brunno Dev](https://brunnodev.store).
