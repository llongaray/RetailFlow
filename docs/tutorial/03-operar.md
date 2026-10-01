# Operar a loja

Entre como `helena.prado@retailflow.local` para ver o caminho inteiro. Um vendedor percorre a venda. Quem analisa o crédito é outra pessoa.

## Painel

http://localhost:5173 mostra o consolidado da empresa: cartões, gráfico por loja e a série das vendas já listadas. Não há meta, score nem comparação com o período anterior.

![Painel com cartões, gráfico por loja e pendências](../images/painel.png)

O sino do topo aponta crédito em análise, tickets abertos e estoque baixo. A busca do topo abre a lista de clientes.

## Clientes

Em Clientes, a lista traz resumo, ordenação, filtro, paginação e CSV no navegador. O quadro organiza a etapa: `LEAD`, `ATIVO`, `INADIMPLENTE`, `INATIVO`. O olho abre compras e tickets já gravados. Novo cliente abre um modal com nome, CPF e telefone.

![Lista de clientes](../images/clientes.png)

O seed traz João Silva, CPF `529.982.247-25`, limite de R$ 8.000. O CPF identifica um único cliente.

## Venda à vista

Em Nova venda:

1. Localize o cliente pelo nome ou CPF. Se não existir, cadastre no modal.
2. Escolha a filial. No seed, a Loja Porto Alegre começa com 12 geladeiras. Adicione a Frost 450L, de R$ 3.500.
3. Escolha À vista, PIX ou Cartão à vista.
4. Revisar abre o modal. Confirmar grava a venda, o pagamento e a baixa de estoque na mesma transação.

![Ponto de venda](../images/ponto-de-venda.png)

O estoque é da filial. Sem a permissão `inventory.override`, o saldo não fica negativo. Cancelar uma venda pede justificativa.

## Crédito

No pagamento Financiado, Confirmar cria a proposta `SUBMITTED`. O estoque permanece. O vendedor não aprova a própria proposta.

![Fila de crédito](../images/fila-credito.png)

Em Crédito, o analista assume a análise e aprova até R$ 5.000. De R$ 5.001 a R$ 15.000 a aprovação é do gerente. Acima disso, o gerente confirma a política adicional. Rejeitar encerra a proposta sem baixar estoque.

## Contrato

Com a proposta aprovada, a venda mostra Gerar contrato. Essa ação baixa o estoque e grava as parcelas. Parcela contratada não se edita. Uma renegociação abre outra proposta. O contrato efetivado não é apagado.

![Contrato na venda](../images/contrato.png)

## Atendimento e o resto do menu

Atendimento abre e acompanha tickets. Auditoria lista os eventos financeiros. Integrações mostra conectores e a fila de saída para o Oracle simulado. Catálogo lista o estoque da filial.

Pedido da Nuvemshop, cobrança e nota fiscal usam o modo do YAML. Em `demo`, o fluxo fecha dentro do RetailFlow.

## Onde isso mora

| Peça | Caminho |
| --- | --- |
| Painel | `apps/web/src/modules/dashboard/DashboardView.vue` |
| Clientes | `apps/web/src/modules/customers/CustomersView.vue` |
| Nova venda | `apps/web/src/modules/sales/SaleWizardView.vue` |
| Crédito | `apps/web/src/modules/credit/CreditView.vue` |
| Contrato na venda | `apps/web/src/modules/sales/SaleDetailView.vue` |
| Regras puras | `apps/api/src/domain` |

A venda e a baixa de estoque na mesma transação estão em [ADR 0002](../adr/0002-transacao-venda-estoque.md). A fila de saída está em [ADR 0004](../adr/0004-outbox-oracle.md).

Próximo: [Addons no painel](04-addons.md).
