# Arquitetura

O RetailFlow é um monólito modular. Os módulos de negócio ficam em `apps/api/src/modules`. As regras que não dependem de banco ficam em `apps/api/src/domain` e têm teste unitário. Prisma fala com o SQL Server. Redis e BullMQ processam a tabela `integration_jobs`. O painel Vue consome REST; o dashboard também consulta GraphQL.

A baixa de estoque e a gravação da venda ou do contrato ocorrem na mesma transação. Detalhes nas ADRs.
