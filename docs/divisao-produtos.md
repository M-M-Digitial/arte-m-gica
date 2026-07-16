# Divisao em dois produtos

Este projeto passa a nascer como uma base compartilhada para dois produtos comerciais:

## 1. Gerador de Moldes Automaticos

Foco: ajudar a artesa a gerar arte pronta para imprimir, recortar e montar.

Inclui:
- Compositor de kits em `/editor`
- Criacao com IA em `/criar`
- Biblioteca de moldes em `/moldes`
- Modelos prontos em `/modelos-prontos`
- Temas em `/temas`
- Admin de upload de moldes em `/admin/moldes`
- Edge Functions `gerar-arte`, `gerar-mockup`, `upload-moldes-zip` e listagens de storage/modelos

Rodar localmente:

```bash
npm run dev:gerador
```

Build:

```bash
npm run build:gerador
```

## 2. Escola de Agentes

Foco: ajudar a artesa no negocio inteiro, nao apenas na arte: vendas, preco, atendimento, producao, agenda, Instagram, pos-venda e acabamento.

Inclui:
- Trilhas praticas em `/trilhas`
- Lista de agentes em `/agentes`
- Chat com agentes em `/agentes/:agentId`
- Admin de assinaturas em `/admin/assinaturas`
- Edge Function `chat-agente`

Rodar localmente:

```bash
npm run dev:escola
```

Build:

```bash
npm run build:escola
```

## Base compartilhada

Por enquanto os dois produtos continuam no mesmo repositório para acelerar a separacao sem duplicar UI, auth, assinatura, Supabase e componentes.

A selecao do produto fica em `src/config/products.ts`, usando `VITE_PRODUCT`:

- `gerador-moldes`
- `escola-agentes`
- sem variavel: modo `suite`, com tudo habilitado

Quando os fluxos estiverem maduros, podemos extrair para dois repositorios ou para um monorepo com `apps/gerador-moldes`, `apps/escola-agentes` e pacotes compartilhados.

## Proximos passos sugeridos

1. Renomear textos e dominios comerciais de cada produto.
2. Criar landing/app shell proprio para cada um.
3. Separar planos de assinatura e cotas por produto.
4. Revisar banco/Supabase para separar dados de geracao de moldes e dados da escola.
5. Evoluir a Escola de Agentes com aulas, tarefas, historico de progresso e templates de negocio.
