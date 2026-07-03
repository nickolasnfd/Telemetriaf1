# LEARNINGS — erros resolvidos e lições (memória entre sessões)

> Registrar aqui erros novos e suas soluções ao final de cada feature
> (AGENTS.md seção 8). Ler no início de sessões de implementação.

- 2026-07-03 — OpenF1: dados são "live" (pagos) de 30 min antes até ~30 min
  depois da sessão; fora dessa janela são históricos e gratuitos, sem chave.
- 2026-07-03 — OpenF1 `car_data`: amostragem ~3,7 Hz; NUNCA consultar sem
  filtros (session_key + driver_number + janela de datas) — resposta explode.
- 2026-07-03 — O sandbox remoto (Claude Code web) bloqueia `api.openf1.org`
  por política de rede: desenvolver contra fixtures gravadas e validar com a
  API real no navegador do usuário, ou liberar o domínio nas configurações do
  ambiente em claude.ai/code.
- 2026-07-03 — O template Vite react-ts atual ativa `erasableSyntaxOnly` no
  tsconfig: parameter properties de construtor TS (`constructor(readonly x)`)
  quebram o build — declarar o campo e atribuir no corpo.
- 2026-07-03 — GitHub Pages via Actions: (1) `configure-pages` com
  `enablement: true` NÃO consegue criar o site na primeira vez ("Resource not
  accessible by integration") — a primeira ativação é manual em Settings →
  Pages → Source: GitHub Actions; (2) ativar o Pages cria o environment
  `github-pages` restrito à BRANCH PADRÃO — se a padrão não for `main`, o job
  de deploy falha em ~1s sem executar passo nenhum (bloqueio de proteção).
- 2026-07-03 — Dados de bateria/ERS NÃO existem em nenhuma API pública (a F1
  não recebe esses dados das equipes de forma confiável). Só é possível
  ESTIMAR via modelo físico sobre speed/throttle/brake do car_data.
