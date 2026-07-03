# SPEC — Interface de telemetria de F1 (v1)

**Status:** Aprovado
**Criado em:** 2026-07-03
**Projeto:** TelemetriaF1
**Substitui/depende de:** —

---

## FASE 1 — ESPECIFICAR

### 1. Problema
Os dados de telemetria e de sessão da F1 existem gratuitamente na OpenF1 API,
mas só em formato de API crua (JSON). Hoje não há como explorá-los sem escrever
código a cada consulta. O custo: cada curiosidade pós-corrida ("onde o piloto X
ganhou tempo?") morre sem resposta ou exige montar scripts manualmente.

### 2. Critério de sucesso
Usuário abre a URL pública, seleciona ano → GP → sessão já encerrada, escolhe
um piloto e uma volta, e vê o gráfico de velocidade/acelerador/freio/marcha/DRS
daquela volta em menos de 10 segundos. (sim/não)

### 3. Escopo

**Dentro do escopo:**
- Seletor de sessão: ano → GP (meeting) → sessão (treinos/quali/sprint/corrida)
- Telemetria do carro por volta (velocidade, acelerador, freio, marcha, DRS),
  com comparação lado a lado de até 2 pilotos na mesma volta
- Tempos de volta: gráfico de evolução por piloto + stints de pneu e pit stops
- Painel da sessão: clima (temperatura pista/ar, chuva, vento) e mensagens da
  direção de prova (bandeiras, safety car, investigações)
- Interface em pt-BR, funcional no celular

**Fora do escopo (explicitamente NÃO incluído — ideias vão para BACKLOG.md):**
- Posições/gaps durante a corrida
- Rádio de equipe
- Dados ao vivo
- Classificação do campeonato
- Comparação entre corridas
- Login/contas

### 4. Restrições
- **Técnicas:** stack travada no AGENTS.md seção 2 (Vite+React+TS, sem backend,
  GitHub Pages). Todas as chamadas saem do navegador → a API precisa aceitar
  CORS. SUPOSIÇÃO EXPLÍCITA: OpenF1 aceita CORS (a documentação oficial usa
  exemplos de `fetch()` no navegador; não foi possível confirmar no código-fonte).
  Mitigação se falhar: verificado no passo 2 do plano, antes de qualquer UI.
- **De ambiente:** o sandbox remoto de desenvolvimento NÃO acessa
  `api.openf1.org` (política de rede). Verificação durante a implementação usa
  fixtures gravadas; a validação final com API real é feita pelo usuário no
  navegador (ou liberando o domínio nas configurações do ambiente).
- **De dados:** somente OpenF1 (endpoints: meetings, sessions, drivers, laps,
  stints, pit, car_data, weather, race_control). Sem chave. Dados disponíveis
  só após a sessão. Nenhuma migration (não há banco).
- **Dependências:** nenhuma feature anterior; primeiro spec do projeto.

---

## FASE 2 — PLANEJAR

### 5. Decisões de design
> Escolhas de implementação que valem registrar ANTES de codificar: estrutura de dados, endpoints, componentes, fluxo. Se há duas abordagens viáveis, listar ambas com tradeoffs e marcar a escolhida. NEVER escolher silenciosamente.

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Biblioteca de gráficos | Recharts (SVG, React-nativo) vs Apache ECharts (canvas) | **ECharts** | Telemetria exige zoom/pan (dataZoom nativo no ECharts) e milhares de pontos (2 pilotos × 5 canais × ~330 amostras/volta); Recharts em SVG degrada com esse volume e não tem zoom nativo. Custo: bundle maior. |
| Wrapper React p/ ECharts | echarts-for-react (dep extra) vs wrapper fino próprio | **Wrapper próprio** (~40 linhas) | Uma dependência a menos; controle total do ciclo de vida do chart. |
| Busca de dados | fetch manual + useState vs TanStack Query | **TanStack Query** | Cache por chave (sessão/piloto/volta), deduplicação e estados loading/error prontos. Dados históricos são imutáveis → `staleTime: Infinity`, zero re-fetch. |
| Telemetria por volta | (a) baixar `car_data` da sessão inteira e fatiar no cliente vs (b) consultar com `date >= lap.date_start` e `date < date_start + lap_duration` | **(b) filtro por janela da volta** | Respostas pequenas (~330 amostras/piloto/volta); (a) violaria a regra do AGENTS.md §9 de nunca consultar `car_data` sem filtro. |
| Navegação/estado | React Router vs página única + query params | **Query params** (`session_key`, `drivers`, `lap`, `view`) | App é uma tela com abas; URL compartilhável sem dependência de router. |
| Estilo | Tailwind vs CSS modules (nativo do Vite) | **CSS modules** | Menor mudança que resolve; sem tooling extra. Tema escuro único (padrão em dashboards de telemetria). |

### 6. Plano de implementação
> Passos numerados, cada um com verificação binária. Um passo = uma unidade validável antes de seguir. Máximo ~8 passos — acima disso, dividir em dois specs.

1. Scaffold do app: Vite + React + TS via `npm create vite`, estrutura de pastas (`src/api`, `src/components`, `src/views`) → verificar: `npm run build` completa sem erro e `npm run dev` serve a página placeholder.
2. Camada de API OpenF1: types TS dos 9 endpoints, client com base URL, TanStack Query configurado, fixtures reais gravadas em `src/api/fixtures/` (JSON de uma corrida de referência) → verificar: testes do client (vitest) passam contra as fixtures; suposição de CORS confirmada pelo usuário com 1 fetch no console do navegador.
3. Seletor de sessão: ano → GP (meetings) → sessão (sessions) → pilotos (drivers), com cores de equipe → verificar: com fixtures, o fluxo popula os 4 níveis e a seleção define `session_key` na URL.
4. Aba "Voltas": gráfico de evolução dos tempos de volta por piloto + faixas de stint (composto de pneu) + marcação das voltas de pit → verificar: renderiza a fixture da corrida de referência com pits visíveis nas voltas corretas.
5. Aba "Telemetria": seletor de volta, fetch de `car_data` fatiado pela janela da volta, gráfico com 5 canais (velocidade, acelerador, freio, marcha, DRS) e comparação de 2 pilotos sobreposta → verificar: curvas da fixture renderizam com zoom/pan funcionando e canais alternáveis.
6. Painel "Sessão": série de clima (pista/ar/chuva/vento) + lista cronológica de mensagens da direção de prova com badges de bandeira/SC → verificar: fixture exibe eventos em ordem cronológica com horários.
7. Robustez e polimento: estado completo restaurável pela URL, estados de erro/vazio em pt-BR com "Tentar novamente", layout responsivo → verificar: reload restaura a mesma visualização; erro de API simulado exibe a mensagem; layout usável a 375 px.
8. Deploy: workflow GitHub Actions + `base` do Vite para Pages — REQUER aprovação explícita na hora (AGENTS.md §6) → verificar: URL pública carrega e o critério de sucesso do spec (seção 2) é atingido de ponta a ponta com a API real.

### 7. Perguntas em aberto
> O spec NEVER pode receber status `Aprovado` com perguntas abertas sem resposta.

- [x] Biblioteca de gráficos → decidida na seção 5 (ECharts, com tradeoffs). Nenhuma pergunta em aberto.

### 8. Critérios de aceite (formato EARS)
> Sintaxe: QUANDO <gatilho>, O SISTEMA DEVE <resposta observável>.
> Cada critério deve ser testável por uma pessoa sem ler o código.

- QUANDO o usuário seleciona ano, GP e uma sessão já encerrada, O SISTEMA DEVE listar os pilotos da sessão em até 5 segundos.
- QUANDO o usuário escolhe um piloto e uma volta na aba Telemetria, O SISTEMA DEVE exibir velocidade, acelerador, freio, marcha e DRS daquela volta em até 10 segundos.
- QUANDO um segundo piloto é adicionado à comparação, O SISTEMA DEVE sobrepor as curvas dos dois pilotos na mesma volta com cores distintas e legenda.
- QUANDO o usuário abre a aba Voltas, O SISTEMA DEVE exibir o gráfico de tempos de volta com os stints (composto de pneu) e as voltas de pit stop marcadas.
- QUANDO o usuário abre o painel Sessão, O SISTEMA DEVE exibir o clima e as mensagens da direção de prova em ordem cronológica.
- QUANDO a URL contém parâmetros de sessão/piloto/volta, O SISTEMA DEVE restaurar a mesma visualização ao carregar.
- QUANDO a OpenF1 API falha ou não retorna dados (entrada inválida/erro), O SISTEMA DEVE exibir mensagem de erro em pt-BR com opção "Tentar novamente", sem travar a interface.

### Ações destrutivas ou irreversíveis nesta feature?
[x] Não (deploy/Pages entra na lista de aprovação do AGENTS.md seção 6)
[ ] Sim

---

## FASE 3 — APROVAÇÃO

**Aprovado por:** Nickolas (nickolasnfd)
**Data:** 2026-07-03
**Observações da revisão:** aprovado sem alterações. Passo 8 (deploy) exige
nova aprovação explícita na hora da execução (AGENTS.md §6).

---

## FASE 5 — VALIDAÇÃO (preencher após implementar)

### 9. Registro de validação

Validação executada em 2026-07-03 com o dataset de fixtures (`?mock=1`) via
Playwright/Chromium, pois o sandbox não acessa `api.openf1.org`. Critérios que
dependem da API real ficam ⏳ até a validação do usuário na URL pública.

| Critério de aceite | Resultado | Como foi testado |
|--------------------|-----------|------------------|
| Seleção ano→GP→sessão lista pilotos ≤5s | ✅ (fixture) ⏳ (API real) | Playwright: 4 níveis populados, chips com cor de equipe |
| Telemetria da volta ≤10s (5 canais) | ✅ (fixture) ⏳ (API real) | Playwright: 5 gráficos renderizados, ~330 amostras/piloto |
| 2º piloto sobreposto com cores e legenda | ✅ | Screenshot: SIL × COS com legenda e cores CVD-validadas |
| Aba Voltas: tempos + stints + pits | ✅ | Screenshot: pits voltas 9/11, SC 11–13, stints S→M / M→H |
| Painel Sessão em ordem cronológica | ✅ | Playwright: 7 mensagens ordenadas; chuva sombreada no clima |
| URL restaura a visualização | ✅ | Teste unitário round-trip + reload no Playwright |
| Erro de API → mensagem pt-BR + retry | ✅ | Sem mock, API inacessível: "Tentar novamente" exibido |
| Critério de sucesso (seção 2) ponta a ponta | ⏳ | Requer merge na main + Pages ativo + API real (usuário) |

**Regressões verificadas:** n/a — primeira feature do projeto; suíte de 24
testes unitários passa em todos os passos.
**Desvios do plano:** (1) fixtures são sintéticas e rotuladas como fictícias,
não gravadas da API real — a política de rede do sandbox bloqueia
`api.openf1.org`; (2) a suposição de CORS segue não confirmada em código, será
confirmada na validação do usuário.
**Aprendizados → LEARNINGS.md:** template Vite com `erasableSyntaxOnly`
(registrado).
