# ADR 0004 — Outbox e adaptador Oracle

A integração com o legado não participa da resposta HTTP. A mesma transação da venda, do contrato, do pagamento ou do ajuste de estoque grava um `IntegrationJob`.

Um worker BullMQ drena essa fila quando o Redis está disponível. Sem Redis, um agendador interno faz o mesmo trabalho, com trava de `PENDING` para `PROCESSING`. O adaptador Oracle desta versão só registra o payload: o driver `oracledb` entra no mesmo método `sync` quando houver credencial de homologação.

O catálogo de conectores (anúncio, IA e legado) é outra tabela. Ligar um item no admin guarda o segredo e não dispara chamada externa.
