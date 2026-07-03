# LEARNINGS — erros resolvidos e lições (memória entre sessões)

> Registrar aqui erros novos e suas soluções ao final de cada feature
> (AGENTS.md seção 8). Ler no início de sessões de implementação.

- 2026-07-03 — OpenF1: dados são "live" (pagos) de 30 min antes até ~30 min
  depois da sessão; fora dessa janela são históricos e gratuitos, sem chave.
- 2026-07-03 — OpenF1 `car_data`: amostragem ~3,7 Hz; NUNCA consultar sem
  filtros (session_key + driver_number + janela de datas) — resposta explode.
