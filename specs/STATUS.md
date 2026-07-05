# STATUS — TelemetriaF1

Projeto iniciado em 2026-07-03. Harness SDD instalado.

## Em andamento

- `specs/fase-e-brake-pressure.md` — implementação concluída (4 passos ✅,
  110 testes); **aguardando validação do usuário** no site com dados reais.
  Toggle "On/Off ⇄ Pressão" no canal de Freio da Telemetria, pressão
  estimada calibrada pelo pico de frenagem da própria volta. **Fecha a
  sequência original do ROADMAP** (Fases A–E) — o que restar vira backlog.

## Concluído

- 2026-07-05 — `specs/fase-f-team-radio.md` — **Implementado**. Aba nova
  "Rádio" com os clipes de `team_radio` (PR #20 + #21, 4 passos, 105
  testes). Validado pelo usuário com dados reais: metadado (piloto/horário)
  correto; áudio confirmado como **limitação externa** — o CDN da F1
  (`livetiming.formula1.com`) bloqueia acesso ao arquivo (403 CloudFront)
  mesmo fora do app, sem solução client-side possível. UI atualizada com
  aviso explícito + link "Abrir em nova aba" (ver LEARNINGS).
- 2026-07-05 — `specs/fase-d4-mini-sectors.md` — **Implementado**. 3ª
  granularidade "Mini-setor" (~20 trechos de tamanho igual) no traçado
  colorido, a partir de imagem de referência do usuário (PR #20, 3 passos,
  104 testes). Validado pelo usuário com dados reais ("Deu certo").
- 2026-07-05 — `specs/fase-d3-track-labels.md` — **Implementado**.
  Marcadores T1..Tn/S1-S3 sobre o traçado (em qualquer modo, 0/1/2 pilotos)
  + legenda "Empate" para o trecho neutro (PR #18, 5 passos, 101 testes).
  Validado pelo usuário com dados reais ("Testado e aprovado").
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

- 2026-07-05 — Harness extraído para `harness-template/`: versão genérica e
  portável (AGENTS, VISION, PROMPTS, specs/*) com placeholders + README de
  instalação, para replicar a estrutura SDD em qualquer projeto novo.

- 2026-07-03 — Dados: somente pós-sessão (histórico gratuito OpenF1); ao vivo
  descartado por exigir conta paga.
- 2026-07-03 — Stack: Vite + React + TS, sem backend/banco; deploy GitHub Pages.
- 2026-07-03 — Prioridade v1: telemetria do carro, tempos de volta/stints,
  clima/direção de prova. Posições/gaps ficou para o backlog.
