# Site público

O site é outro aplicativo. Ele não usa o menu, a busca nem o login do painel. Abra http://localhost:5175 sem entrar em conta nenhuma.

![Landing publicada](../images/site.png)

## O que o visitante vê

A home mostra o hero publicado: título, subtítulo e o botão. As seções com estado `PUBLISHED` aparecem abaixo. O rascunho guardado no modal não aparece aqui. Só Publicar, no painel, troca o que esta página lê.

O website também registra `/sobre` e `/contato`. Na v6 as três rotas usam o mesmo conteúdo publicado.

## Como a empresa é escolhida

Antes de buscar o conteúdo, o site manda o host do navegador. `localhost` e `127.0.0.1` resolvem para a empresa `company`, a mesma do YAML em `site.host`. Um host desconhecido não ganha uma empresa inventada. A página responde que não está publicada.

Desative o website em Addons e recarregue http://localhost:5175. A mesma URL deixa de entregar o hero. Ative de novo e o hero publicado volta. As tabelas continuam no banco.

## Onde isso mora

| Peça | Caminho |
| --- | --- |
| Aplicativo | `apps/site` |
| Rotas do pacote | `addons/website/site/index.ts` |
| Página | `addons/website/site/HomePage.vue` |
| Resolução do host | `resolveTenantHost` em `apps/api/src/domain/addon.rules.ts` |
| Conteúdo | Tabelas `addon_website_settings` e `addon_website_sections` |

O `/` do painel continua o dashboard. O `/` do site é a landing. São portas diferentes.

Próximo: [Motor de addons](06-motor.md).
