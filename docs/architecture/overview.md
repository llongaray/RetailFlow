# Arquitetura

O RetailFlow é um monólito modular. Os módulos de negócio ficam em `apps/api/src/modules`. As regras que não dependem de banco ficam em `apps/api/src/domain` e têm teste unitário. Prisma fala com o SQL Server. Redis e BullMQ processam a tabela `integration_jobs`. O painel Vue consome REST; o dashboard também consulta GraphQL.

A baixa de estoque e a gravação da venda ou do contrato ocorrem na mesma transação. Detalhes nas ADRs em `docs/adr`.

A v2 mantém o monólito modular de `docs/adr/0001-monolito-modular.md`. O painel ganhou paleta, fontes e modal, e a API ganhou cabeçalhos de segurança. Nenhum módulo virou serviço separado.

## API

`base_dir`: `apps/api`.

| Subpasta | Conteúdo |
| --- | --- |
| `prisma` | Schema, migrations e seed |
| `src/domain` | Regras puras: CPF, RBAC, estoque, venda, crédito, contrato e pagamento |
| `src/modules` | `auth`, `users`, `stores`, `customers`, `products`, `inventory`, `sales`, `credit`, `contracts`, `payments`, `support`, `audit`, `dashboard`, `integrations`, `metrics`, `health` |
| `src/infrastructure/database` | Cliente Prisma |
| `src/infrastructure/audit` | Gravação de `audit_logs` na mesma transação |
| `src/infrastructure/integrations` | Outbox, worker BullMQ e mock Oracle |
| `src/infrastructure/logging` | Métricas e OpenTelemetry opcional |
| `src/common` | Guards JWT e RBAC, filtro de erro, interceptors e acesso por filial |

## Painel

`base_dir`: `apps/web/src`.

| Subpasta | Conteúdo |
| --- | --- |
| `components` | Modal flutuante dos formulários |
| `views` | Login |
| `layouts` | Casca do painel |
| `router` | Rotas e permissão de tela |
| `stores` | Sessão Pinia |
| `services` | Cliente HTTP |
| `modules` | `customers`, `products`, `sales`, `credit`, `support`, `audit`, `integrations`, `dashboard` |
| `utils` | Formatação de moeda, CPF e status |
