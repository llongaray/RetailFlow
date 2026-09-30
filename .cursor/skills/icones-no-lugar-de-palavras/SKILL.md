---
name: icones-no-lugar-de-palavras
description: >-
  Troca controles compactos do RetailFlow por ícone, sem palavra visível. Use
  ao criar ou alterar menu recuado, alternância de lista e quadro, botões de
  modo, atalhos e qualquer controle do painel ou do admin que caiba num ícone.
---

# Ícones no lugar de palavras

tem que ser icone e não palavras, em todo front oque mudar usar icone e não palavras deve usar.

## Quando é ícone

- Menu recuado e o botão que abre ou fecha esse menu.
- Alternância de modo, como lista e quadro.
- Atalho cujo significado cabe num desenho repetido.

A palavra some da face do controle. O nome continua em `aria-label` e em `title`, para o leitor de tela e para o Playwright (`getByRole` com o nome antigo).

## Quando a palavra fica

Título, rótulo de campo, coluna, célula e ação de negócio: Cadastrar, Aprovar, Receber, Confirmar, Buscar. Menu lateral aberto também mostra o nome.

## Como desenhar

- Um SVG de `viewBox="0 0 24 24"`, classe `nav-icon`, traço `currentColor`. Sem preenchimento colorido.
- O botão compacto usa a classe `icon`.
- Cor só de `docs/design/paleta.md`. Não invente hex.
- Reutilize `NavIcon.vue` no menu e `ViewSwitch.vue` na troca de lista e quadro. Não repita o mesmo SVG em cada tela.
