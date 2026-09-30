# Arquitetura

O RetailFlow é um monólito modular. Os módulos de negócio ficam em `apps/api/src/modules`. As regras que não dependem de banco ficam em `apps/api/src/domain` e têm teste unitário. Prisma fala com o SQL Server. Redis e BullMQ processam a tabela `integration_jobs`. O painel Vue consome REST; o dashboard também consulta GraphQL.

A baixa de estoque e a gravação da venda ou do contrato ocorrem na mesma transação. Detalhes nas ADRs em `docs/adr`.

A v2 mantém o monólito modular de `docs/adr/0001-monolito-modular.md`. O painel ganhou paleta, fontes e modal, e a API ganhou cabeçalhos de segurança. Nenhum módulo virou serviço separado.

A v3 acrescenta um segundo Vue, o admin, na mesma API. O painel da loja ganha menu com categorias, recuo e quadro Dragula. O catálogo `integration_providers` lista conectores possíveis e não chama Google, Meta nem modelo de IA. A fila `integration_jobs` continua sendo o outbox do Oracle simulado.

A v4 não cria endpoint. O painel passa a desenhar em cima das respostas que já existiam: Lucide no menu, TanStack Query em volta do cliente HTTP, TanStack Table nas listas, ECharts no consolidado e VeeValidate com Zod só no cadastro de cliente. O corpo do POST desse cadastro permanece `{ name, cpf, phone }`.

A v5 trata a Nuvemshop como origem de pedidos. A empresa única continua sendo o lojista e a conexão aponta para uma filial. PIX e cartão à vista concluem como o dinheiro. Pedido externo já pago vira venda `NUVEMSHOP` concluída, sem crédito. Token, chave de gateway e certificado A1 ficam cifrados com `INTEGRATION_SECRET`.

## Acessos locais

A lista completa, com Swagger, saúde, métricas, SQL Server e Redis, está em [Acessos](../../README.md#acessos).

| Acesso | Endereço |
| --- | --- |
| Painel da loja | http://localhost:5173 |
| Admin | http://localhost:5174 |
| API | http://localhost:3000 |

## API

`base_dir`: `apps/api`.

| Subpasta | Conteúdo |
| --- | --- |
| `prisma` | Schema, migrations e seed |
| `src/domain` | Regras puras: CPF, RBAC, estoque, venda, crédito, contrato, pagamento e proporção de logo |
| `src/modules` | `auth`, `users`, `stores`, `customers`, `products`, `inventory`, `sales`, `credit`, `contracts`, `payments`, `support`, `audit`, `dashboard`, `integrations`, `nuvemshop`, `billing`, `fiscal`, `metrics`, `health`, `admin`, `company`, `partner` |
| `src/infrastructure/database` | Cliente Prisma |
| `src/infrastructure/audit` | Gravação de `audit_logs` na mesma transação |
| `src/infrastructure/integrations` | Outbox, worker BullMQ e mock Oracle |
| `src/infrastructure/logging` | Métricas e OpenTelemetry opcional |
| `src/common` | Guards JWT e RBAC, filtro de erro, interceptors e acesso por filial |

## Painel

`base_dir`: `apps/web/src`.

| Subpasta | Conteúdo |
| --- | --- |
| `components` | Modal, tabela com ordenação e paginação, faixa de resumo, quadro Dragula, troca lista/quadro e ícones Lucide |
| `views` | Login e boas-vindas |
| `layouts` | Casca do painel |
| `router` | Rotas e permissão de tela |
| `stores` | Sessão Pinia |
| `services` | Cliente HTTP e o cache do TanStack Query |
| `modules` | `customers`, `products`, `sales`, `credit`, `support`, `audit`, `integrations`, `dashboard` |
| `utils` | Formatação de moeda, CPF e status |

## Admin

`base_dir`: `apps/admin`. Vite na porta 5174. A API continua na 3000 e aceita `ADMIN_ORIGIN`. O superusuário nasce do `.env` e não entra no painel da loja. Logos ficam em `uploads/`, fora do git. A chave de parceiro lê catálogo, clientes e vendas por `x-api-key` e não herda o papel da loja.
