# STATUS — TelemetriaF1

Projeto iniciado em 2026-07-03. Harness SDD instalado.

## Em andamento

- (nada) — próximas features priorizadas via `specs/ROADMAP.md` (plano de
  implementação das 8 ideias do BACKLOG, em 5 fases). Cada uma ainda passa
  pelo ciclo spec → aprovação → implementação.

## Concluído

- 2026-07-03 — `specs/f1-telemetry-interface.md` — **Implementado**. Site no
  ar em https://nickolasnfd.github.io/Telemetriaf1/ (deploy automático a cada
  push na main). Validado pelo usuário com API real.
- 2026-07-03 — `specs/battery-estimate.md` — **Implementado**. Canal "Bateria
  (estimativa)" na aba Telemetria (PR #5). Validado pelo usuário ("tudo
  funcionou"). Correção do tooltip de 2 pilotos veio junto (PR #5 + PR #6, ver
  LEARNINGS).

## Decisões recentes

- 2026-07-03 — Dados: somente pós-sessão (histórico gratuito OpenF1); ao vivo
  descartado por exigir conta paga.
- 2026-07-03 — Stack: Vite + React + TS, sem backend/banco; deploy GitHub Pages.
- 2026-07-03 — Prioridade v1: telemetria do carro, tempos de volta/stints,
  clima/direção de prova. Posições/gaps ficou para o backlog.
