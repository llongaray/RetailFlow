# Addons do RetailFlow

Especificação da v6.0. O core conhece o motor e não conhece um addon pelo nome. A descoberta lê `addons/*/manifest.json` e o entrypoint declarado ali.

`ecommerce` e `whatsapp` são exemplos de addons futuros. Esta versão não cria pastas vazias para eles.

## Pastas

```
addons/<nome>/
  manifest.json
  backend/index.ts
  dist/backend/index.js
  frontend/index.ts
  site/index.ts
  migrations/*.sql
  config/*.yaml
```

`frontend/` e `site/` existem quando o addon tem painel ou página pública. `frontend/components/` só existe quando a função não cabe num componente de `@retailflow/ui`.

O arquivo de produção do backend é o caminho do manifesto, em geral `./dist/backend/index.js`. O motor não adivinha o arquivo. O build do monorepo, e a subida da API quando o `dist` ainda não existe, compilam `backend/index.ts` para esse `dist`.

## Manifesto

O manifesto descreve o pacote. Não tem `enabled`. O estado fica na instalação.

| Campo | Uso |
| --- | --- |
| `schemaVersion` | `1` |
| `name` | identificador estável, minúsculo |
| `displayName`, `description` | texto de apresentação |
| `version` | versão disponível na pasta |
| `retailflowVersion` | intervalo, por exemplo `>=6.0.0 <7.0.0` |
| `license` | licença do pacote |
| `author` | `name` e `url` |
| `entrypoints` | `backend`, e opcionalmente `frontend` e `site` |
| `dependencies` | mapa de addon para intervalo de versão |
| `permissions` | permissões que o pacote declara |
| `capabilities` | `backend`, `panel`, `public-site`, `migrations` e, quando registra slot, `ui-extensions` |

Na subida, manifesto inválido, versão fora do intervalo ou dependência ausente grava `ERROR` ou `INCOMPATIBLE`. A API continua. O erro aparece em `/addons`.

## AddonContext

O ponto de entrada é `defineAddon((context) => { ... })`, de `@retailflow/addon-sdk`. O addon não importa Prisma, guards nem serviços internos. O core entrega:

- `addon.name`, `addon.version`, `addon.path`, `addon.capabilities`
- `database.execute()`
- `http.route()` e `http.publicRoute()`
- `permissions.register()`
- `menu.register()`
- `events.on()` e `events.emit()`
- `audit.log()`
- `tenant.id` e `tenant.current()`
- `config.get()`
- `logger.info()`, `warn()` e `error()`
- `ui.extend(slot, item)`

`database.execute()` é fronteira de arquitetura, não sandbox. O addon é código confiável no mesmo processo. Um `index.js` carregado pode comprometer a aplicação. Só se instala addon de confiança. Processo isolado, worker ou container fica fora da v6.

Conflito de rota ou de permissão marca o addon como `ERROR` e não substitui o que já existe. `SUPERUSER` continua fora das permissões de papel.

`context.ui.override` não existe nesta versão. Slots: `sidebar.items`, `settings.sections`, `page.header.actions`, `dashboard.widgets`, `customer.details.tabs`, `sale.details.actions`. A ordem na tela é componente oficial, depois extensão, depois componente exclusivo do addon.

## Versão disponível e versão instalada

A `version` do manifesto é a versão disponível na pasta. `addon_installations.installed_version` é a versão aplicada naquela empresa. A diferença permite, depois, mostrar atualização sem mudar o modelo.

`tenant_id` é o id da empresa. O único é `(tenant_id, addon_name)`. Estados: `INSTALLED`, `ACTIVE`, `INACTIVE`, `ERROR`, `INCOMPATIBLE`. Desativar não apaga dados. Enquanto a instalação daquela empresa não estiver `ACTIVE`, a rota do addon responde 404.

## Migration global e dado por empresa

Criar tabela é estrutura do banco, uma vez, não uma vez por empresa. `addon_migrations` não tem `tenant_id`: `addon_name`, `addon_version`, `migration_name`, `checksum`, `executed_at`, único em `(addon_name, migration_name)`.

Os arquivos SQL ficam em `migrations/` e rodam em ordem de nome na primeira ativação de qualquer empresa. O nome novo executa e grava o checksum. Na ativação de outra empresa, o nome já existe: checksum igual não executa de novo e só grava `addon_installations`; checksum diferente marca `ERROR` e não reaplica. As linhas de negócio levam `tenant_id`. O prefixo da tabela é `addon_<nome>_`. Essas tabelas não entram no `schema.prisma`.

## Frontend no build

`import.meta.glob` em `apps/web` e `apps/site` lê os entrypoints `frontend` e `site` que já existem na pasta quando o Vite constrói. O código do core não cita o nome do addon.

Colocar um addon novo com frontend exige rebuild e redeploy dos apps afetados. Ativar ou desativar um addon já presente no build não exige rebuild. Module Federation fica fora desta versão.

O menu do painel soma os itens registrados no slot `sidebar.items` pelos addons ativos para a empresa da sessão.

## RetailFlow UI

O addon não cria um design system próprio.

- `@retailflow/ui` publica os componentes oficiais
- `@retailflow/icons` reexporta os ícones Lucide já usados no painel
- `@retailflow/addon-sdk` publica os tipos do manifesto, do `defineAddon` e de `context.ui`

Cores, tipo, espaço, borda, raio e sombra saem de `docs/design/paleta.md` e das fontes Fraunces e Manrope. A v6 não cria seletor de tema. Se o core passar a ter modo claro e escuro, o addon acompanha o token.

O addon não importa caminho interno de `apps/web/src`, não copia CSS global e não edita arquivo do core. A contribuição entra por `context.ui.extend`.

## Host

`apps/site` serve as rotas públicas. Antes de renderizar, resolve a empresa pelo `Host`. A v6 mapeia o host configurado, `localhost` e `127.0.0.1` para a única empresa. A página lê só o conteúdo publicado daquela empresa. Rascunho não aparece. Domínio por loja entra depois pela mesma interface, sem o addon conhecer o mapa de hosts.

## YAML

A prioridade é variável de ambiente, depois `config/retailflow.yaml`, depois o padrão interno. O `.env` guarda segredo. Cada addon pode ter `config/*.yaml` para padrão. O conteúdo editável da landing fica no banco.

## Fora desta versão

Processo isolado, Module Federation, `context.ui.override`, seletor de tema e marketplace.
