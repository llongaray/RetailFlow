# Motor de addons

Esta página explica o carregamento. A lista completa de campos, slots e limites está em [addons/README.md](../../addons/README.md). O website é o exemplo que já existe na pasta. `ecommerce` e `whatsapp` aparecem só como nome de pacote futuro. Não há pasta vazia para eles.

## O que o core vê

Na subida, a API lista `addons/*/manifest.json`. O manifesto descreve o pacote. Ele não tem `enabled`. O estado mora em `addon_installations`, uma linha por empresa e por nome.

O backend carregado é o caminho declarado, `./dist/backend/index.js`. A fonte fica em `addons/website/backend/index.ts`. Se o `dist` ainda não existe, a subida compila esse arquivo. O motor não procura outro nome.

O painel e o site usam `import.meta.glob` na hora do build do Vite. O glob lê `addons/*/frontend` e `addons/*/site`. Nenhum arquivo de `apps/` escreve a palavra `website`.

## O que o addon recebe

O entrypoint chama `defineAddon` com um contexto. Por esse contexto o pacote executa o SQL da própria pasta, registra rota, permissão, menu, evento, auditoria e um slot de tela. Ele não importa Prisma, guard nem serviço interno.

`database.execute()` separa o addon do acesso direto ao Prisma. Não é uma caixa isolada. O arquivo roda no mesmo processo da API. Só se instala pacote de confiança. Processo separado, worker e container ficam fora desta versão.

Se duas rotas ou duas permissões coincidem, o segundo addon fica `ERROR` e a rota antiga permanece.

## Migration e dado

Criar tabela é estrutura do banco, uma vez. `addon_migrations` não tem empresa. Na primeira ativação de qualquer empresa, o arquivo novo executa e o checksum fica gravado. Na empresa seguinte, o mesmo checksum não executa de novo. Um checksum diferente marca `ERROR` e não reaplica o arquivo.

As linhas de conteúdo levam `tenant_id`. O nome da tabela começa com `addon_website_`.

Arquivos do website, nesta ordem: `0001_create_settings.sql`, `0002_create_sections.sql`, `0003_create_media.sql` e o seed `0004_seed.sql`.

## Tela

O addon importa `@retailflow/ui`, `@retailflow/icons` e `@retailflow/addon-sdk`. As cores e as fontes são as da [paleta](../design/paleta.md) e das [fontes](../design/fontes.md): Fraunces no título, Manrope na interface. Não há seletor de tema.

A contribuição de menu entra pelo slot `sidebar.items`. Outros slots desta versão: `settings.sections`, `page.header.actions`, `dashboard.widgets`, `customer.details.tabs` e `sale.details.actions`. A tela do core desenha o componente oficial e, depois, o que foi registrado. Não existe `context.ui.override`.

## Fora desta versão

Module Federation, tema claro e escuro, marketplace e processo isolado. Exigência extra de um marketplace futuro fica num documento próprio, quando esse documento existir.

A licença do RetailFlow está em [LICENSE](../../LICENSE). O registro da escolha está em [ADR 0005](../adr/0005-agpl.md).
