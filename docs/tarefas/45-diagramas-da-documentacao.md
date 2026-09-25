# 45 — Diagramas da documentação

**Situação:** Pendente

## Problema

A documentação técnica descreve em texto corrido três coisas que são, por natureza, desenhos:

- **a arquitetura de produção** — quatro serviços em três plataformas, cada um com seu papel
  (`backend/DEPLOY.md`);
- **o ciclo de backup** — diário, espelho de arquivos, semanal e mensal, com retenções
  diferentes (`backend/BACKUP_E_RESTAURACAO.md`);
- **o caminho de uma requisição autenticada** — do token à permissão do módulo
  (`backend/AUTENTICACAO.md` e `backend/RBAC.md`).

O único diagrama existente, `docs/produto/diagrama-der.png`, é imagem: não versiona diferença,
não se corrige sem a ferramenta que o gerou e ninguém sabe se ainda reflete o banco.

Há um motivo prático além da estética: `BACKUP_E_RESTAURACAO.md` estabelece que **uma segunda
pessoa precisa saber restaurar o sistema**. Um desenho é o que faz esse documento ser entendido
por quem não escreveu o código.

## Escopo

Três diagramas em **SVG escrito à mão, versionado em `docs/diagramas/`**, referenciados a
partir dos documentos correspondentes.

## Decisões

- **SVG e não PNG**, justamente pelo problema do DER: SVG é texto, aparece no `git diff`, e se
  corrige com um editor comum.
- **Sem dependência de ferramenta de diagramação** (Mermaid, draw.io): o SVG é lido direto pelo
  GitHub na renderização do Markdown, sem build nem plugin.
- **Legível nos dois temas.** O GitHub renderiza Markdown em claro ou escuro conforme a
  preferência de quem lê; um diagrama com fundo transparente e traço escuro some no tema
  escuro. Cada diagrama carrega seu próprio fundo.

## Concluído quando

- Os três diagramas existem em `docs/diagramas/`, citados de dentro dos documentos que eles
  explicam.
- Cada um é legível em tema claro e escuro, e em largura de celular.
- O conteúdo confere com o sistema real — nomes de serviço, prefixos de bucket, retenções e
  permissões conferidos contra o código e os workflows, não de memória.
