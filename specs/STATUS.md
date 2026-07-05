# STATUS — TelemetriaF1

Projeto iniciado em 2026-07-03. Harness SDD instalado.

## Em andamento

- `specs/fase-d3-track-labels.md` — implementação concluída (5 passos ✅,
  101 testes); **aguardando validação do usuário** no site com dados reais.
  Rótulos de curva/setor no traçado (em qualquer modo, 0/1/2 pilotos) +
  legenda "Empate" para o trecho neutro. A partir de feedback do usuário no
  site pós-D.2.

## Concluído

- 2026-07-05 — `specs/fase-d2-track-coloring.md` — **Implementado**.
  Coloração do traçado por piloto mais rápido por trecho, seletor Setor ⇄
  Curva (PR #17, 6 passos, 97 testes). Validado pelo usuário com dados
  reais (British GP 2026, BOR vs VER). **Fecha o item D1 do ROADMAP** —
  resta só E (pressão de freio) no backlog.

- 2026-07-05 — `specs/fase-d1-track-map.md` — **Implementado**. Endpoint
  novo `location`, `trackMap.ts` (normalização + path SVG) e aba "Traçado"
  em cor neutra, visível já com 1 piloto selecionado (PR #15, 5 passos, 87
  testes). Validado pelo usuário com dados reais (British GP 2026, LIN,
  volta 29 — contorno reconhecível da pista). Primeiro incremento da Fase D;
  a coloração por piloto (D.2) fica para o próximo spec.
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
