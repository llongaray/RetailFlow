# Regras de negócio

Os endereços do painel, do admin e da API estão em [Acessos](../../README.md#acessos).

`base_dir`: `apps/api/src/domain`.

Não há subpastas. Cada regra mora num arquivo ao lado do teste:

| Arquivo | Cobre |
| --- | --- |
| `cpf.ts` | RN001, dígitos e normalização |
| `sale.rules.ts` | RN002, RN010 e RN011 |
| `inventory.rules.ts` | RN003 e RN004 |
| `credit.rules.ts` | RN005, RN006, RN007 e RN014 |
| `contract.rules.ts` | RN009 e RN012 |
| `payment.rules.ts` | RN008 no estorno e RN013 |
| `permissions.ts` | Papéis e permissões granulares da loja |
| `logo.rules.ts` | Recortes 1:1, faixa 6:1 e 9:16 |

| ID | Regra |
| --- | --- |
| RN001 | CPF identifica um único cliente. |
| RN002 | Venda exige usuário ativo, loja ativa e a filial do vendedor. |
| RN003 | Estoque é por filial. |
| RN004 | Estoque não fica negativo sem `inventory.override`. |
| RN005 | Crédito segue rascunho, envio, análise, aprovação ou rejeição, e contratação. |
| RN006 | Quem criou a proposta não analisa nem aprova. |
| RN007 | Analista até R$ 5.000, gerente até R$ 15.000, acima disso com política adicional. |
| RN008 | Alteração financeira gera auditoria. |
| RN009 | Contrato efetivado não é apagado. |
| RN010 | Cancelamento exige justificativa. |
| RN011 | Venda financiada só conclui com crédito aprovado. |
| RN012 | Parcela contratada não é editada. Renegociação abre outra proposta. |
| RN013 | Pagamento duplicado é rejeitado pelo identificador externo. |
| RN014 | Mudança da política de crédito exige confirmação de validação antes do deploy. |
