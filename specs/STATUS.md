# STATUS — TelemetriaF1

Projeto iniciado em 2026-07-03. Harness SDD instalado.

## Em andamento

- `specs/battery-estimate.md` — **Aprovado**, implementação concluída
  (3 passos ✅, 32 testes). Falta: merge na main → deploy automático →
  usuário confere o canal com uma volta real → status vira `Implementado`.

## Concluído

- 2026-07-03 — `specs/f1-telemetry-interface.md` — **Implementado**. Site no
  ar em https://nickolasnfd.github.io/Telemetriaf1/ (deploy automático a cada
  push na main). Validado pelo usuário com API real.

## Decisões recentes

- 2026-07-03 — Dados: somente pós-sessão (histórico gratuito OpenF1); ao vivo
  descartado por exigir conta paga.
- 2026-07-03 — Stack: Vite + React + TS, sem backend/banco; deploy GitHub Pages.
- 2026-07-03 — Prioridade v1: telemetria do carro, tempos de volta/stints,
  clima/direção de prova. Posições/gaps ficou para o backlog.
