# Tutorial da v6.0

Este conjunto explica o RetailFlow como ele funciona hoje. Cada página começa pelo que dá para fazer, segue o passo a passo e termina no lugar do código.

A licença é a GNU AGPLv3. O texto jurídico está em [LICENSE](../../LICENSE). A escolha está registrada em [ADR 0005](../adr/0005-agpl.md).

## Por onde ler

| Página | Quando abrir |
| --- | --- |
| [Subir o ambiente](01-subir.md) | Primeira vez na máquina |
| [Entrar](02-entrar.md) | Login, papéis e o que cada conta vê |
| [Operar a loja](03-operar.md) | Cliente, venda, crédito, contrato e atendimento |
| [Addons no painel](04-addons.md) | Ativar o website e editar a página |
| [Site público](05-site.md) | A landing que o visitante vê, sem login |
| [Motor de addons](06-motor.md) | Como um pacote entra no sistema |

As regras de negócio RN001 a RN014 ficam em [docs/business-rules/README.md](../business-rules/README.md). As decisões de arquitetura ficam em [docs/adr](../adr/0001-monolito-modular.md). A especificação do pacote fica em [addons/README.md](../../addons/README.md).

## Quatro portas

```text
Painel 5173 ── login da loja
Site   5175 ── página pública, sem login
Admin  5174 ── só o superusuário
API    3000 ── os três acima falam com ela
                 ├── SQL Server
                 └── Redis / BullMQ
```

O painel, o site e o admin são aplicativos Vue. A API é um monólito NestJS. Um addon é código confiável carregado por essa API e pelas telas que o Vite já construiu. O core conhece o motor. O core não cita o nome `website`.
