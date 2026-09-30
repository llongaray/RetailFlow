---
name: design-formularios
description: >-
  Define que cadastro, edição e confirmação do RetailFlow abrem em modal
  flutuante. Use ao criar ou alterar formulários, telas Vue, modais ou fluxos
  de venda, cliente, crédito, pagamento e atendimento.
---

# Formulários

Forms sempre em modais flutuantes.

## Quando

Cadastro, edição e confirmação dentro do painel usam `apps/web/src/components/Modal.vue`. Login e busca ficam na página.

## Como

- Um único `Modal.vue`. Não copie `.modal-back` para a tela.
- O formulário entra no slot. O `data-testid` que o Playwright já usa permanece no mesmo controle.
- Escape e clique no fundo fecham o modal. O clique no conteúdo não fecha.
- A cor vem de `docs/design/paleta.md`. A fonte vem de `docs/design/fontes.md`.
