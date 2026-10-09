# NOVA Operations

Painel autenticado de ordens de serviço, prioridade, transição de estado, telemetria recente, filtros e exportação.

## Executar

Requisitos: JavaScript, TypeScript, Vercel Functions e Supabase.

```sh
npm ci
npm test
npm run typecheck
npm run dev
```

## Funcionamento

Configure `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`. Usuários criam sua conta e confirmam o e-mail quando solicitado. Ordens seguem open → acknowledged → closed. Os registros são isolados por políticas RLS e compartilhados com o arquivo de operações da mesma conta.

## Persistência de resultados

O arquivo de operações está em [vercel-home-telemetry-api.vercel.app](https://vercel-home-telemetry-api.vercel.app/laboratory.html?project=painel-admin-aposta). As migrações Supabase estão no [repositório da API](https://github.com/brunnojob/vercel-home-telemetry-api/tree/main/supabase/migrations).

```sh
python cloud/sync.py enqueue resultado.json --project painel-admin-aposta
python cloud/sync.py sync
```

Defina `BRUNNODEV_ACCESS_TOKEN` com sua sessão. A fila SQLite conserva os relatórios até confirmação do servidor; o mesmo conteúdo não gera registros duplicados. Tokens não são gravados no código.
