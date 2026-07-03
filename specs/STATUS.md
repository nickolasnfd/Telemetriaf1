# STATUS — TelemetriaF1

Projeto iniciado em 2026-07-03. Harness SDD instalado.

## Em andamento

- `specs/f1-telemetry-interface.md` — implementação concluída (passos 1–8 ✅,
  24 testes); **aguardando validação final do usuário** com a API real:
  mergear a branch na `main` → workflow ativa o GitHub Pages → abrir a URL
  pública e conferir o critério de sucesso (seção 2 do spec). Só então o
  status vira `Implementado`.

## Concluído

- (nada ainda — ver "Em andamento")

## Decisões recentes

- 2026-07-03 — Dados: somente pós-sessão (histórico gratuito OpenF1); ao vivo
  descartado por exigir conta paga.
- 2026-07-03 — Stack: Vite + React + TS, sem backend/banco; deploy GitHub Pages.
- 2026-07-03 — Prioridade v1: telemetria do carro, tempos de volta/stints,
  clima/direção de prova. Posições/gaps ficou para o backlog.
