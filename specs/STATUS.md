# STATUS — TelemetriaF1

Projeto iniciado em 2026-07-03. Harness SDD instalado.

## Em andamento

- (nada) — próxima feature: C2 (painel de insights automáticos), spec ainda
  não escrito.

## Concluído

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
