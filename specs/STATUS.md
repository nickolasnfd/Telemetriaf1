# STATUS — TelemetriaF1

Projeto iniciado em 2026-07-03. Harness SDD instalado.

## Em andamento

- `specs/fase-d1-track-map.md` — **Em revisão** (aguardando aprovação do
  usuário). Primeiro incremento da Fase D: traçado da pista (SVG) a partir do
  endpoint novo `location`. A coloração por piloto mais rápido (reusa o delta
  da C1) fica para um spec seguinte (D.2), respeitando o limite de ~8 passos
  do AGENTS.md §5 — mesma divisão da Fase C (C1 → C2).

## Concluído

- 2026-07-05 — `specs/fase-c2-insights.md` — **Implementado**. Painel de
  insights automáticos por regras determinísticas sobre o delta (PR #13, 4
  passos, 80 testes). Validado pelo usuário ("funcionou bem"). **Encerra a
  Fase C** do ROADMAP — restam D (mapa da pista) e E (pressão de freio).

- 2026-07-03 — `specs/f1-telemetry-interface.md` — **Implementado**. Site no
  ar em https://nickolasnfd.github.io/Telemetriaf1/ (deploy automático a cada
  push na main). Validado pelo usuário com API real.
- 2026-07-03 — `specs/battery-estimate.md` — **Implementado**. Canal "Bateria
  (estimativa)" na aba Telemetria (PR #5). Validado pelo usuário ("tudo
  funcionou"). Correção do tooltip de 2 pilotos veio junto (PR #5 + PR #6, ver
  LEARNINGS).
- 2026-07-04 — `specs/fase-a-quick-wins.md` — **Implementado**. Legenda
  clicável, cards de resumo, exportação ZIP (PR #9). Validado pelo usuário
  com dados reais.
- 2026-07-04 — `specs/fase-b-distance-axis.md` — **Implementado**. Toggle
  Tempo/Distância + marcadores de curva (PR #10). Validado pelo usuário com
  dados reais.
- 2026-07-04 — `specs/fase-b2-sector-markers.md` — **Implementado**.
  Marcadores de setor S1/S2/S3 (PR #11). Validado pelo usuário com dados
  reais.
- 2026-07-04 — `specs/fase-c1-delta-chart.md` — **Implementado**. Gráfico de
  Delta acumulado entre 2 pilotos (PR #12), sempre em distância, com
  marcadores de curva/setor e selo de confiança do alinhamento. Validado
  pelo usuário com dados reais.

## Decisões recentes

- 2026-07-03 — Dados: somente pós-sessão (histórico gratuito OpenF1); ao vivo
  descartado por exigir conta paga.
- 2026-07-03 — Stack: Vite + React + TS, sem backend/banco; deploy GitHub Pages.
- 2026-07-03 — Prioridade v1: telemetria do carro, tempos de volta/stints,
  clima/direção de prova. Posições/gaps ficou para o backlog.
