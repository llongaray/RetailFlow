# Addon website

Página pública da loja. O manifesto declara os entrypoints. O core não importa este nome.

O painel do addon fica em `/admin/website` e usa os componentes de `@retailflow/ui`. O site público, em `apps/site`, lê só o conteúdo publicado da empresa resolvida pelo Host.

As tabelas `addon_website_*` nascem das migrations desta pasta na primeira ativação. Desativar a instalação não apaga os dados.
