# SPEC — Fase A: legenda clicável, cards de resumo e exportação ZIP

**Status:** Em revisão
**Criado em:** 2026-07-04
**Projeto:** TelemetriaF1
**Substitui/depende de:** `specs/ROADMAP.md` (Fase A: itens A1, A2, A3) ·
depende de `specs/f1-telemetry-interface.md` e `specs/battery-estimate.md`
(Implementados)

---

## FASE 1 — ESPECIFICAR

### 1. Problema
Três fricções na análise entre 2 pilotos hoje: (a) não dá para isolar a linha
de um piloto — com curvas sobrepostas, fica difícil ler uma delas; (b) as
comparações de resumo (velocidade máxima, média, quantas frenagens) o usuário
tem que fazer de cabeça olhando os gráficos; (c) não há como levar os dados
para fora do app (planilha, outra ferramenta).

### 2. Critério de sucesso
Na aba Telemetria de uma volta real: (a) clicar no chip de um piloto oculta a
linha dele nos 6 canais de uma vez e novo clique restaura; (b) cards mostram
velocidade máxima, velocidade média, nº de frenagens e % da volta em
acelerador pleno para cada piloto; (c) o botão "Exportar dados (ZIP)" baixa um
.zip com os JSONs da seleção atual. (sim/não para cada um)

### 3. Escopo

**Dentro do escopo (itens A1–A3 do ROADMAP):**
- A1 — Toggle de visibilidade por piloto nos 6 canais da aba Telemetria
- A2 — Cards de resumo por piloto (vel. máxima, vel. média, nº de frenagens,
  % de acelerador pleno) na aba Telemetria
- A3 — Botão de exportação ZIP com os dados já buscados da seleção atual
  (sessão, voltas, car_data por piloto, stints, pits, clima, direção de prova)

**Fora do escopo (→ ROADMAP fases B–E):**
- Eixo por distância, delta, insights, mapa da pista, pressão de freio
- Exportar CSV (v1 do export é JSON; CSV pode ser refinamento futuro)

### 4. Restrições
- **Técnicas:** stack travada (AGENTS.md §2). Regras invariantes do ROADMAP:
  tudo aditivo; lógica nova em `src/lib/*` puro com testes; nenhuma mudança de
  comportamento padrão nas telas existentes (o toggle A1 nasce com todos os
  pilotos visíveis — estado atual).
- **De dados:** somente dados já buscados; nenhuma chamada nova à OpenF1.
- **Dependências:** 1 dependência nova client-side para gerar o ZIP (decisão
  na seção 5). Nenhuma outra.

---

## FASE 2 — PLANEJAR

### 5. Decisões de design

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Mecanismo do toggle A1 | (a) legenda interativa nativa do ECharts sincronizada via `connect` vs (b) estado React (`hiddenDrivers`) nos chips de piloto existentes, filtrando as séries passadas aos gráficos | **(b) estado React nos chips** | Determinístico e testável; a sincronização de seleção de legenda via `connect` entre 6 charts é comportamento pouco documentado do ECharts (aprendemos com o tooltip a não confiar em comportamento implícito dele). Os chips de tempo de volta já existem e viram botões. |
| Interação com o tooltip | — | Piloto oculto sai da caixa de valores (não vira "sem dado") | A caixa reflete o que está desenhado; "sem dado" ficaria ambíguo. |
| Resumo A2 | calcular no componente vs módulo puro | **`src/lib/lapSummary.ts` puro** | Padrão do projeto (batteryModel, tooltip): testável sem DOM. |
| Nº de frenagens | contar amostras com `brake=100` vs contar transições 0→100 | **Transições 0→100** | "6 frenagens" = 6 eventos, não 6 amostras; robusto à amostragem ~3,7 Hz. |
| Lib de ZIP | `jszip` (3.10, difundida) vs `fflate` (0.8, moderna) | **`fflate`** | Tree-shakeable (só `zipSync` entra no bundle, ~8 kB gz vs ~30 kB do jszip), API síncrona simples, mantida. |
| Conteúdo do ZIP | sessão inteira vs seleção atual | **Seleção atual** (sessão + voltas + car_data das voltas/pilotos selecionados + stints/pits/clima/direção de prova) | É o que já está em memória — export instantâneo, zero requisição extra (respeita rate limit). Nome: `telemetriaf1_<session_key>_volta<N>.zip`. |

### 6. Plano de implementação

1. `src/lib/lapSummary.ts` puro (velocidade máxima/média, transições de
   frenagem, % de acelerador pleno) + testes unitários → verificar: `npm test`
   verde com os casos novos (incl. array vazio).
2. A1: estado `hiddenDrivers` na TelemetryView; chips de piloto viram botões
   de toggle (estilo esmaecido quando oculto); traces ocultos saem das séries
   e do tooltip dos 6 canais → verificar: Playwright — ocultar reflete nos 6
   canais e a caixa lista só o piloto visível; restaurar volta ao estado
   atual.
3. A2: componente `SummaryCards` na aba Telemetria consumindo `lapSummary` →
   verificar: Playwright — cards renderizam com a fixture e os valores batem
   com o esperado calculado dos mesmos dados.
4. A3: dependência `fflate` + `src/lib/exportZip.ts` + botão "Exportar dados
   (ZIP)" na aba Telemetria (desabilitado sem dados) → verificar: Playwright —
   download dispara e o ZIP contém os arquivos esperados com JSON válido.
5. Regressão e fechamento: `npm run build` + suíte completa + screenshots das
   3 abas com fixture (comparar com comportamento v1) → verificar: tudo verde;
   critérios EARS da v1 re-conferidos na fixture.

### 7. Perguntas em aberto
- [x] Nenhuma — decisões fechadas na seção 5 com tradeoffs.

### 8. Critérios de aceite (formato EARS)

- QUANDO o usuário clica no chip de um piloto na aba Telemetria, O SISTEMA
  DEVE ocultar a linha desse piloto nos 6 canais simultaneamente e removê-lo
  da caixa de valores, mantendo o outro piloto intacto.
- QUANDO o usuário clica novamente no chip de um piloto oculto, O SISTEMA
  DEVE restaurar a linha nos 6 canais.
- QUANDO uma volta com telemetria é exibida, O SISTEMA DEVE mostrar, por
  piloto: velocidade máxima, velocidade média, nº de frenagens e % da volta em
  acelerador pleno.
- QUANDO o usuário clica em "Exportar dados (ZIP)", O SISTEMA DEVE baixar um
  arquivo .zip contendo os JSONs da seleção atual em menos de 5 segundos, sem
  nenhuma requisição nova à OpenF1.
- QUANDO não há telemetria disponível (erro ou vazio — caso de erro), O
  SISTEMA DEVE ocultar os cards, manter o botão de export desabilitado e
  preservar as mensagens de erro/vazio atuais.

### Ações destrutivas ou irreversíveis nesta feature?
[x] Não
[ ] Sim

---

## FASE 3 — APROVAÇÃO

**Aprovado por:**
**Data:**
**Observações da revisão:**

---

## FASE 5 — VALIDAÇÃO (preencher após implementar)

### 9. Registro de validação

| Critério de aceite | Resultado | Como foi testado |
|--------------------|-----------|------------------|
|                    | ✅ / ❌   |                  |

**Regressões verificadas:**
**Desvios do plano:**
**Aprendizados → LEARNINGS.md:**
