# ADR 0002 — Venda e estoque na mesma transação

Os endereços do painel, do admin e da API estão em [Acessos](../../README.md#acessos).

A baixa de estoque acontece somente quando a venda é concluída: à vista no mesmo pedido, financiada depois da contratação. A atualização usa `updateMany` com `quantity >= quantidade`. Se o pagamento ou o contrato falha, a transação desfaz a baixa.

Proposta ainda não aprovada não reserva saldo. Se o item acabar antes da contratação, a geração do contrato falha com RN004 em vez de vender o que a filial não tem.
