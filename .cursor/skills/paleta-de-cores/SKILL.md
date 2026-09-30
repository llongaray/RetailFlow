---
name: paleta-de-cores
description: >-
  Padroniza as cores do RetailFlow a partir de docs/design/paleta.md. Use ao
  alterar CSS, temas, botões, status, modais ou qualquer cor de interface.
---

# Paleta de cores

A lista fechada está em [docs/design/paleta.md](../../../docs/design/paleta.md).

## Regra

- Componente e folha de estilo usam `var(--token)`.
- Cor nova entra primeiro na tabela da paleta, com valor e uso, e só depois no CSS.
- Não introduza hex, rgb ou cor de biblioteca de UI fora dessa tabela.
