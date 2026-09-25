# 44 — Gráficos do dashboard financeiro

**Situação:** Pendente

## Problema

O back-end calcula três agregações que **nenhuma tela desenha**:

| Endpoint | Devolve | Usado hoje |
|---|---|---|
| `GET /dashboard/financeiro/evolucao` | `{ano, mes, receitas, despesas}` por mês | Não |
| `GET /dashboard/financeiro/por-categoria` | Total por categoria e tipo | Não |
| `GET /dashboard/financeiro/resumo-periodo` | Resumo com filtro de data | Não |
| `GET /dashboard/financeiro/despesas-por-projeto` | Total por projeto | Só na tela de Projetos |

É o mesmo padrão dos anexos financeiros antes da tarefa anterior: a API está pronta, a
interface não chega até ela. O dashboard financeiro hoje são cartões de número, uma barra de
percentual montada à mão com `div` e `width: X%`, e tabelas.

A evolução de receitas contra despesas mês a mês é exatamente o que uma diretoria pede em
prestação de contas, e está a uma requisição de distância.

## Escopo

1. Serviço de front-end para os endpoints de agregação que faltam.
2. Gráficos no dashboard financeiro:
   - **evolução mensal** de receitas e despesas;
   - **composição por categoria**, para receitas e para despesas.
3. Filtro de período, que os endpoints já aceitam (`data_inicio`, `data_fim`).

## Decisões

- **SVG inline, sem biblioteca de gráficos.** São três formas simples; uma biblioteca
  acrescentaria ~100 KB a um bundle que já avisa sobre tamanho. Em troca, tooltip e
  responsividade ficam por nossa conta.
- **Barra ordenada em vez de pizza** para composição por categoria: comparar comprimento é mais
  preciso que comparar ângulo, e a lista de categorias da associação é grande demais para
  fatias legíveis.
- Os gráficos usam os tokens de cor da tarefa 43 e precisam ser legíveis sem depender só de
  cor — quem imprime a prestação de contas em preto e branco continua conseguindo ler.

## Concluído quando

- O dashboard financeiro mostra a evolução mensal e a composição por categoria, com dados
  reais da API.
- Os gráficos funcionam em tela de celular sem rolagem horizontal.
- Estado vazio tratado: associação sem lançamentos no período não vê um gráfico quebrado.
- Serviço coberto por teste.
