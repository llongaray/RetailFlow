# RetailFlow

Plataforma de varejo e crédito para uma rede de lojas. O vendedor localiza o cliente, consulta o estoque da filial e fecha a venda à vista ou abre uma proposta de financiamento. A análise segue alçada. Só depois da aprovação o sistema gera contrato, parcelas e baixa o estoque.

## Arquitetura

Monólito modular em NestJS. Vue 3 no painel. SQL Server é o banco da operação. Redis e BullMQ drenam uma fila de saída para um adaptador Oracle, hoje simulado. A decisão está nos ADRs em `docs/adr`.

```text
Vue 3 → REST / GraphQL → NestJS → SQL Server
                              ├── Redis / BullMQ
                              └── adaptador Oracle (mock)
```

GraphQL existe só para o consolidado gerencial. O restante da operação é REST. Abrir `http://localhost:3000` redireciona para `/api/docs`.

## Estrutura

`base_dir`: raiz do repositório.

| Subpasta | Conteúdo |
| --- | --- |
| `apps/api` | API NestJS, Prisma e testes de domínio |
| `apps/web` | Painel Vue 3 |
| `packages/types` | Contratos compartilhados entre API e painel |
| `docs/adr` | Decisões de arquitetura |
| `docs/architecture` | Visão técnica e mapa das pastas da API e do painel |
| `docs/business-rules` | Regras RN001–RN014 e onde o código as implementa |
| `docs/images` | Capturas do ponto de venda, da fila de crédito e do contrato |
| `e2e` | Playwright do fluxo financiado, só local |
| `scripts` | Atalho do Prisma com o `.env` da raiz |
| `.github/workflows` | CI: lint, testes de domínio e build |

Na raiz também ficam `docker-compose.yml` (SQL Server e Redis), `package.json` (workspaces), `eslint.config.js` e `playwright.config.ts`.

## Subir localmente

1. Docker Desktop em execução.
2. Copie `.env.example` para `.env`.
3. `npm install`
4. `docker compose up -d`
5. `npm run db:setup`
6. `npm run dev:api` e, em outro terminal, `npm run dev:web`
7. Abra `http://localhost:5173`

Senha de todos os usuários de demonstração: `RetailFlow#2026`

| Papel | E-mail |
| --- | --- |
| Vendedor Porto Alegre | lucas.ferreira@retailflow.local |
| Vendedora Canoas | ana.martins@retailflow.local |
| Analista de crédito | camila.nogueira@retailflow.local |
| Gerente Porto Alegre | ricardo.almeida@retailflow.local |
| Financeiro | sofia.ribeiro@retailflow.local |
| Atendimento | bruno.teixeira@retailflow.local |
| Administração | helena.prado@retailflow.local |

## Fluxo

À vista: localizar o cliente, montar o carrinho e confirmar. Venda, pagamento e baixa de estoque entram na mesma transação.

Financiado: a proposta nasce `SUBMITTED` e o estoque continua intacto. O analista assume a análise e aprova até R$ 5.000. De R$ 5.001 a R$ 15.000 a aprovação é do gerente. Acima disso, o gerente confirma a política adicional. Quem criou a proposta não a aprova. Com o crédito aprovado, a geração do contrato baixa o estoque e grava parcelas imutáveis.

O cliente João Silva (`529.982.247-25`) e a geladeira de R$ 3.500 estão no seed para esse roteiro. Porto Alegre começa com 12 unidades.

## O que o código cobre

- CPF único, usuário e loja ativos, auditoria de limite, cancelamento e eventos financeiros.
- Estoque por filial, sem saldo negativo, salvo permissão administrativa explícita.
- Pagamento idempotente por `externalTransactionId`.
- Outbox para Oracle, com BullMQ quando o Redis responde e agendador interno quando não responde.
- Tickets de atendimento, dashboard com inadimplência e estoque baixo, logs com `requestId` e métricas em `/api/v1/metrics`.

## Testes

```text
npm test
npm run test:integration --workspace=@retailflow/api
npx playwright test
```

Os testes de integração e o Playwright precisam do SQL Server, da API e do painel no ar. O GitHub Actions roda os testes de domínio, o lint e o build.

## Imagens

![Ponto de venda](docs/images/ponto-de-venda.png)

![Fila de crédito](docs/images/fila-credito.png)

![Contrato](docs/images/contrato.png)

Sistema feito com auxilio de IA (Este é um projeto que demonstra as habilidade em vue e node.js a ia foi usada apenas para agilizar o processo).
