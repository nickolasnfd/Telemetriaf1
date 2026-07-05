# Spec Harness — template reutilizável de desenvolvimento guiado por spec (SDD)

Este diretório é a versão **genérica e portável** do harness usado no
TelemetriaF1. Ele transforma qualquer projeto em um ambiente onde agentes de
código (Claude Code, Antigravity, qualquer ferramenta que leia `AGENTS.md`)
trabalham com disciplina: toda feature nasce como spec, é planejada, aprovada
por você, implementada passo a passo com verificação, e validada — com memória
persistente entre sessões via arquivos.

## O que vem dentro

```
harness-template/
├── README.md                  ← este guia (não copiar para o projeto novo)
├── AGENTS.md                  ← constituição do projeto (com [PLACEHOLDERS])
├── VISION.md                  ← propósito do projeto, 1-2 parágrafos
├── PROMPTS.md                 ← prompts prontos: instalar, nova feature, retomar, encerrar
└── specs/
    ├── STATUS.md              ← estado atual: em andamento / concluído / decisões
    ├── BACKLOG.md             ← ideias fora de escopo capturadas durante o trabalho
    ├── LEARNINGS.md           ← erros recorrentes e soluções (memória entre sessões)
    ├── TOKEN-ECONOMY.md       ← regras de economia de tokens (aplicar em toda sessão)
    ├── SPEC.template.md       ← template para novas features
    └── ROADMAP.template.md    ← (opcional) visão de fases do projeto
```

## Como instalar em um projeto novo

### Opção A — automática (recomendada)

Abra uma sessão do agente na raiz do projeto novo, com este diretório
acessível (copiado, clonado ou anexado), e cole o **Prompt de Instalação** do
`PROMPTS.md` (§1). O agente copia os arquivos, entrevista você para preencher
os placeholders e confirma o resultado.

### Opção B — manual

1. Copie tudo (menos este README) para a raiz do projeto:
   `AGENTS.md`, `VISION.md`, `PROMPTS.md` e a pasta `specs/`.
2. Abra `AGENTS.md` e preencha todo `[PLACEHOLDER]`: identidade (seção 1),
   stack travada (seção 2), proibições específicas do projeto (seção 9).
3. Escreva `VISION.md` — 1-2 parágrafos honestos sobre por que o projeto existe.
4. Em `specs/TOKEN-ECONOMY.md`, ajuste os comandos de exemplo (teste, build)
   para os da sua stack.
5. Apague o que não usar (ex.: `ROADMAP.template.md` se o projeto for pequeno).
6. Commit: `chore: install spec harness`.

### Opção C — repositório template no GitHub

Crie um repo só com o conteúdo deste diretório e marque
**Settings → General → Template repository**. Todo projeto novo nasce de
"Use this template" já com o harness dentro.

## O ciclo de vida (resumo do que o AGENTS.md impõe)

| Fase | Artefato | Portão de saída |
|------|----------|-----------------|
| 1. Especificar | `specs/<feature>.md` seções 1-4 | Problema e critério de sucesso claros |
| 2. Planejar | seções 5-8 do spec | Plano numerado com verificação binária por passo |
| 3. Aprovar | status → `Aprovado` | VOCÊ escreveu "aprovado" explicitamente |
| 4. Implementar | código + `✅` por passo | Cada passo verificado antes do próximo |
| 5. Validar | seção 9 do spec | Critérios de aceite testados; `STATUS.md` atualizado |

**Regra de ouro:** implementação sem spec aprovado é a definição de bug,
mesmo que o código funcione.

## Práticas que fizeram diferença no projeto de origem

- **1 feature (spec) por sessão** — sessões longas estouram contexto e cada
  turno seguinte paga o peso inteiro. Sessão nova começa com o Prompt de
  Retomada (`PROMPTS.md` §3).
- **Specs com no máximo ~8 passos** — acima disso, dividir em dois specs.
- **LEARNINGS.md é a memória do projeto** — todo erro não-óbvio resolvido
  entra lá com data; sessões futuras leem antes de implementar e não repetem
  o erro.
- **BACKLOG.md protege o escopo** — ideia boa no meio da feature vira 1 linha
  no backlog, não código.
- **Modelo por fase**: modelo forte para especificar/planejar, intermediário
  para implementar, leve para tarefas mecânicas (retomada, docs).
- **Validação com dados reais pelo humano** fecha a feature — `Implementado`
  no STATUS só depois do seu "funcionou".
