# 43 — Tokens de cor e contraste acessível

**Situação:** Concluído

## Problema

Duas medições de contraste WCAG reprovaram na paleta em uso:

| Uso | Cores | Contraste | Exigido |
|---|---|---|---|
| Ícones de seção, de sucesso e de indicador | `#004922` sobre `#0F1210` | **1,77:1** | 3:1 (elemento gráfico) |
| Textos auxiliares (`text-xs`) | `#727A74` sobre `#181D1A` | **3,86:1** | 4,5:1 (texto pequeno) |

O primeiro é um defeito visível: o verde institucional é escuro e, usado como cor de traço
sobre fundo quase preto, o ícone praticamente some. São 9 ocorrências, incluindo o título das
telas de Membros, Projetos e Beneficiários e o ícone de sucesso dos avisos. O verde funciona
como **fundo** de botão com texto branco (10,63:1) — o erro foi reaproveitá-lo como primeiro
plano.

O segundo afeta dezenas de textos de apoio espalhados pelo sistema.

## Causa de fundo

`src/index.css` **já define** os tokens da paleta em `@theme` (`--color-acpb-green`,
`--color-text-muted`, `--color-surface-card`…), mas os componentes não os usam: há cerca de
830 ocorrências de hex literal em classes utilitárias (`text-[#AEB5B0]`, `bg-[#181D1A]`).

Isso é o que transforma "clarear um cinza" em 53 edições espalhadas, e é por isso que a
correção de contraste e a adoção dos tokens são a mesma tarefa: sem os tokens, a próxima
mudança de cor repete o mesmo trabalho manual.

## Escopo

1. Acrescentar ao `@theme` os tokens que faltam, com valores medidos:
   - verde legível sobre escuro, para primeiro plano;
   - cinza auxiliar que passe em AA.
2. Migrar as ocorrências de hex literal para os tokens correspondentes, em todo o `src/`.
3. Registrar a paleta, o papel de cada cor e os contrastes medidos em
   `docs/produto/descricao-da-ui.md`, que hoje descreve a identidade visual sem citar as cores.

## Concluído quando

- Nenhuma cor de primeiro plano em uso fica abaixo de 4,5:1 sobre as duas superfícies do tema
  (`#0F1210` e `#181D1A`).
- `grep` por hex literal em classes utilitárias no `src/` não retorna nada.
- O CSS gerado pelo build contém as mesmas cores de antes, exceto as duas corrigidas de
  propósito — ou seja, a migração para tokens não mudou nenhuma aparência sem intenção.
- A paleta está documentada com os números de contraste.
