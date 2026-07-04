# STATUS — TelemetriaF1

Projeto iniciado em 2026-07-03. Harness SDD instalado.

## Em andamento

- `specs/fase-a-quick-wins.md` — implementação concluída e mergeada (PR #9);
  **aguardando validação do usuário** com dados reais no site publicado.
- `specs/fase-b-distance-axis.md` — implementação concluída e mergeada (PR
  #10); aguardando validação do usuário no site.
- `specs/fase-b2-sector-markers.md` — implementação concluída e mergeada (PR
  #11); aguardando validação do usuário no site.
## Concluído

- 2026-07-03 — `specs/f1-telemetry-interface.md` — **Implementado**. Site no
  ar em https://nickolasnfd.github.io/Telemetriaf1/ (deploy automático a cada
  push na main). Validado pelo usuário com API real.
- 2026-07-03 — `specs/battery-estimate.md` — **Implementado**. Canal "Bateria
  (estimativa)" na aba Telemetria (PR #5). Validado pelo usuário ("tudo
  funcionou"). Correção do tooltip de 2 pilotos veio junto (PR #5 + PR #6, ver
  LEARNINGS).
- 2026-07-04 — `specs/fase-c1-delta-chart.md` — **Implementado**. Gráfico de
  Delta acumulado entre 2 pilotos (Fase C do ROADMAP, item C1): novo
  `src/lib/delta.ts` + painel dedicado na aba Telemetria, sempre em
  distância, com marcadores de curva/setor e selo de confiança do
  alinhamento. `npm run build` + suíte completa + regressão das 3 abas
  verificados; **aguardando validação do usuário** no site publicado. C2
  (insights automáticos) vira spec próprio a seguir.

## Decisões recentes

- 2026-07-03 — Dados: somente pós-sessão (histórico gratuito OpenF1); ao vivo
  descartado por exigir conta paga.
- 2026-07-03 — Stack: Vite + React + TS, sem backend/banco; deploy GitHub Pages.
- 2026-07-03 — Prioridade v1: telemetria do carro, tempos de volta/stints,
  clima/direção de prova. Posições/gaps ficou para o backlog.
