# ADR 0001 — Monólito modular

Os endereços do painel, do admin e da API estão em [Acessos](../../README.md#acessos).

O RetailFlow começa como um monólito NestJS com módulos de domínio separados. O fluxo de venda, estoque, crédito e contrato precisa da mesma transação de banco. Microsserviços acrescentariam rede, consistência eventual e operação sem um ganho correspondente neste estágio.

Cada módulo tem controller, serviço e regras puras testáveis. A fronteira física pode ser extraída depois se um módulo passar a ter ciclo de vida próprio.

O admin é outro aplicativo Vue na mesma API. Não é um serviço separado.
