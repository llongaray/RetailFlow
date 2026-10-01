# Subir o ambiente

No fim desta página a API, o painel, o admin e o site respondem na máquina, com a empresa de demonstração e o addon website ativo.

## O que cada arquivo guarda

| Arquivo | Guarda |
| --- | --- |
| `.env` | Segredo: banco, Redis, JWT, senhas e tokens. Nasce de `.env.example`. |
| `config/retailflow.yaml` | Porta, origem e modo. Não leva senha. |
| Banco | Clientes, vendas, contratos e o conteúdo publicado da landing |

A prioridade é esta: variável de ambiente, depois o YAML, depois o padrão interno. Se `NUVEMSHOP_MODE` existir no ambiente, ela vence o `demo` escrito no YAML.

| Serviço | Endereço no YAML |
| --- | --- |
| API | http://localhost:3000 |
| Painel | http://localhost:5173 |
| Admin | http://localhost:5174 |
| Site | http://localhost:5175 |

Com `mode: demo` em Nuvemshop, Mercado Pago e fiscal, conectar a loja, cobrar e emitir nota ficam dentro do RetailFlow. Trocar o modo liga o mesmo código no serviço correspondente.

## Passo a passo

1. Deixe o Docker Desktop em execução.
2. Na raiz do repositório, copie `.env.example` para `.env`.
3. Rode `npm install`.
4. Rode `docker compose up -d`. Sobe o SQL Server na porta 1433 e o Redis na 6379.
5. Rode `npm run db:setup`. Aplica as migrations do Prisma e o seed.
6. Em terminais separados: `npm run dev:api`, `npm run dev:web`, `npm run dev:admin` e `npm run dev:site`.

A senha de todos os usuários de demonstração, inclusive o superusuário, é `RetailFlow#2026`.

Na primeira subida a API lê `addons/*/manifest.json`. O website compatível é ativado para a empresa `company`. As tabelas `addon_website_*` nascem nessa ativação. Elas não fazem parte do `schema.prisma`.

## Onde isso mora

| Peça | Caminho |
| --- | --- |
| YAML | `config/retailflow.yaml` |
| Leitura em camadas | `apps/api/src/infrastructure/config/layered-config.ts` |
| Compose | `docker-compose.yml` |
| Seed | `apps/api/prisma/seed.ts` |
| Descoberta do addon | `apps/api/src/modules/addons/addon.engine.ts` |

Próximo: [Entrar](02-entrar.md).
