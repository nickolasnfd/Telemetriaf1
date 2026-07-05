# SPEC — Fase D.2: coloração do traçado por piloto mais rápido

**Status:** Aprovado
**Criado em:** 2026-07-05
**Projeto:** TelemetriaF1
**Substitui/depende de:** `specs/ROADMAP.md` (Fase D, item D1, segunda metade) ·
depende de `specs/fase-d1-track-map.md` (traçado neutro, Implementado) e
`specs/fase-c1-delta-chart.md` (delta entre 2 pilotos, Implementado). Fecha o
item D1 do ROADMAP.

---

## FASE 1 — ESPECIFICAR

### 1. Problema
A aba "Traçado" (D.1) já desenha o contorno da pista, mas em cor neutra —
não mostra *onde* um piloto ganhou ou perdeu tempo em relação ao outro. Essa
informação já existe (o gráfico de Delta, C1, e o painel de Insights, C2),
mas só como gráfico de linha/texto; não está localizada espacialmente no
traçado, que é a forma mais direta de responder "em que trecho da pista X
foi mais rápido que Y".

### 2. Critério de sucesso
Com 2 pilotos selecionados (mesma sessão/volta), o traçado da aba "Traçado"
aparece dividido em trechos coloridos, cada um na cor do piloto mais rápido
naquele trecho, com um seletor **Setor ⇄ Curva** trocando a granularidade da
divisão, e uma legenda indicando qual cor é qual piloto. (sim/não)

### 3. Escopo

**Dentro do escopo:**
- Mapear os pontos de `location` do piloto de referência (já buscados na
  D.1) para uma posição de distância na volta (metros), usando o mesmo
  domínio de distância do delta/curvas/setores (`distance.ts`, C1/B/B.2).
- Segmentar o traçado em trechos por **setor** (S1/S2/S3, reusa
  `sectors.ts`) OU por **curva** (reusa `corners.ts`, mesmo padrão de
  fronteiras do `segmentInsights` da C2), com um seletor visível só quando 2
  pilotos estão selecionados.
- Colorir cada trecho pela cor do piloto mais rápido nele (delta de tempo
  acumulado, reusa `computeDelta` da C1), com um trecho **neutro** (cinza,
  igual à D.1) quando a diferença é pequena demais para ser conclusiva.
- Legenda mostrando a cor de cada piloto (reusa `teamColor`, com padrão
  tracejado para o 2º piloto quando as cores de equipe coincidem, igual ao
  já usado na Telemetria).
- Com 0 ou 1 piloto selecionado, o traçado continua exatamente como na D.1
  (contorno único neutro, sem seletor nem legenda) — comportamento
  preservado.

**Fora do escopo:**
- Buscar `location` do 2º piloto — desnecessário: os dois pilotos percorrem
  praticamente a mesma linha física: o desenho usa só a do piloto de
  referência (mesma decisão da D.1), colorido por segmento conforme o
  resultado do delta (que já compara os 2). Ver decisão de design.
- Replay animado, mapa hardcoded por circuito (já fora de escopo desde D.1).
- Novas regras de insight em texto (isso é a C2; aqui é só a representação
  espacial do que o delta já diz).

### 4. Restrições
- **Técnicas:** stack travada (AGENTS.md §2). Aditivo sobre a D.1 — a aba
  "Traçado" ganha um modo colorido condicional, o modo neutro de 1 piloto
  não muda. Nenhuma dependência nova. Plano de 6 passos.
- **De dados:** nenhum endpoint novo — reusa `location` (só do piloto de
  referência, já buscado), `car_data` dos 2 pilotos (já buscado nos moldes
  da C1/Telemetria), tempos de setor da cronometragem (`Lap`).
- **Dependências:** D.1 (traçado, `normalizeTrackPoints`/`buildTrackPath`) e
  C1 (`computeDelta`) — ambos Implementados.

---

## FASE 2 — PLANEJAR

### 5. Decisões de design

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Traçado físico a colorir | 2 linhas sobrepostas (uma por piloto) vs 1 linha (referência) colorida por trecho | **1 linha, a do piloto de referência** | Os 2 pilotos correm quase o mesmo percurso (mesma razão da D.1); 2 linhas seria redundante e mais poluído visualmente. Evita buscar `location` do 2º piloto — só o delta (que já compara os 2) decide a cor de cada trecho. |
| Granularidade | só setor vs só curva vs seletor com as duas | **Seletor Setor ⇄ Curva** (decisão do usuário, ver histórico da D.1) | Setor é mais simples (3 trechos, já conhecido da Fase B.2); curva é mais granular e fiel (reusa a detecção de curvas da Fase B/C2). Sem motivo técnico para escolher só uma — o seletor dá as duas sem custo de dado extra. |
| Fronteiras por curva | fórmula nova vs reusar o padrão do `segmentInsights` (C2) | **Reusar o padrão** `[0, ...curvas.distanceM, maxM]` (mesma construção já testada em `insights.ts`, replicada aqui sem tocar naquele arquivo) | Já validado pelo usuário na C2; manter os mesmos trechos entre o painel de Insights e o traçado colorido evita uma segunda fonte de verdade divergente para "onde termina cada trecho". |
| Alinhar `location` (x/y, própria amostragem) à distância (m, derivada do `car_data`) | assumir mesma amostragem vs interpolar por tempo decorrido | **Interpolar por tempo decorrido**: para cada amostra de `location`, calcular o tempo decorrido desde o início da volta (a partir do próprio `date`) e interpolar a distância correspondente na série tempo×distância do `car_data` do piloto de referência (mesmo princípio de `timeAtDistance` do `delta.ts`, mas na direção inversa: tempo→distância) | `location` e `car_data` são feeds independentes da OpenF1, com timestamps que não coincidem exatamente amostra a amostra. Assumir mesma amostragem quebraria silenciosamente se as taxas divergirem; interpolar por tempo é robusto e já é o mesmo princípio usado no delta (C1). |
| Trecho com diferença de tempo pequena demais | forçar uma cor vs marcar como neutro (empate) | **Neutro** (cinza da D.1) abaixo de um limiar (mesmo espírito do `MIN_RELEVANT_S` da C2 — trechos "sem sinal claro" não viram afirmação categórica) | Consistente com a honestidade sobre limitação já praticada no selo de confiança (C1) e no filtro de trechos irrelevantes (C2). Colorir um trecho de ~0,01s como "vitória" de um piloto seria ruído, não informação. |
| Cor de cada piloto no traçado | paleta fixa nova vs `teamColor` de cada piloto (como o resto do app) | **`teamColor`**, com `stroke-dasharray` no 2º piloto quando as cores de equipe coincidem | Consistência com o resto do app (chips de piloto, linhas da Telemetria já usam `teamColor` + o mesmo tratamento de "mesma cor de equipe" via `dashed`). |
| Gatilho de exibição do modo colorido | sempre que a Delta existir vs exigir os 2 pilotos com telemetria | **Exigir 2 pilotos com telemetria** (mesmo gatilho do gráfico de Delta, C1) | O delta só existe com 2 pilotos; sem isso, o traçado permanece no modo neutro da D.1 (0 ou 1 piloto), sem seletor nem legenda. |

### 6. Plano de implementação

1. `src/lib/trackMap.ts`: adicionar `distanceAtTime(distances, elapsedS, targetS)`
   puro (inverso de `timeAtDistance` do `delta.ts` — mesma interpolação
   linear, buscando por tempo decorrido em vez de distância) e
   `attachDistances(locationSamples, carSamples)` → `number[]` (distância em
   metros por amostra de `location`, mesmo índice) → verificar: `npm test`
   com casos novos em `trackMap.test.ts` — perfil de velocidade constante
   sintético → distância cresce linearmente com o tempo; amostra de
   `location` fora da janela do `car_data` → resultado no limite (clamped),
   sem lançar.
2. `src/lib/trackColoring.ts` puro: `colorSegments(normalizedPoints,
   locationDistances, boundaries, delta)` → `Array<{ path: string; faster:
   0 | 1 | null }>` — fatia os pontos normalizados por faixa de distância de
   cada trecho, monta um `path` aberto (`M...L...`, sem `Z`) por trecho, e
   decide `faster` pelo sinal do delta acumulado no trecho (reusa
   `computeDelta`/o mesmo cálculo de `deltaAtDistance` do `insights.ts`,
   replicado aqui — ver decisão de design), `null` (neutro) se
   `|segGain| < 0.02s` → verificar: `trackColoring.test.ts` — caso
   sintético de 2 trechos com vencedores opostos → paths e `faster`
   corretos; trecho com diferença mínima → `faster: null`.
3. `TrackMapView`: buscar `car_data` dos 2 pilotos (reusa `lapDateWindow`,
   mesmo padrão da `TelemetryView`), calcular `computeDelta`,
   `sectorBoundaries`, `detectCorners` sobre o piloto de referência; estado
   local do seletor Setor ⇄ Curva (padrão `xAxisMode` da Telemetria) →
   verificar: `npm test` verde (sem novo teste de UI neste passo — cálculo
   isolado dos passos 1-2 já cobre a lógica).
4. Renderizar os trechos coloridos (via `colorSegments`) só quando 2
   pilotos com telemetria+`location` existem; caso contrário, manter o
   `<path>` único neutro da D.1 inalterado. Seletor Setor ⇄ Curva e legenda
   (cor por piloto, tracejado se mesma cor de equipe) aparecem só no modo
   colorido → verificar: Playwright `?mock=1` — 1 piloto → path único
   neutro (D.1 preservada); 2 pilotos, modo Setor → 3 `<path>` coloridos;
   trocar para Curva → nº de `<path>` muda para nº de curvas + 1.
5. Trechos neutros (empate) renderizam na mesma cor cinza da D.1 → verificar:
   Playwright — fixture com 2 pilotos de ritmo muito próximo tem ao menos 1
   trecho neutro visível.
6. Regressão e fechamento: `npx tsc --noEmit` + `npm run build` + suíte
   completa + `npx oxlint` + Playwright nas 4 abas (Voltas/Telemetria/Sessão
   inalteradas; Traçado com 1 piloto idêntico à D.1, com 2 pilotos nos 2
   modos do seletor) → verificar: tudo verde; EARS da D.1 re-conferidos
   (modo neutro de 1 piloto não regride).

### 7. Perguntas em aberto
- [x] Nenhuma — granularidade (seletor com as duas opções) e traçado único
  (só piloto de referência) já decididos com o usuário/na seção 5.

### 8. Critérios de aceite (formato EARS)

- QUANDO exatamente 2 pilotos com telemetria e `location` do piloto de
  referência estão selecionados, O SISTEMA DEVE colorir o traçado em
  trechos, cada um na cor do piloto mais rápido naquele trecho.
- QUANDO o usuário alterna o seletor Setor ⇄ Curva, O SISTEMA DEVE
  re-segmentar o traçado colorido na granularidade escolhida (3 trechos por
  setor; 1 trecho por curva/reta detectada).
- QUANDO a diferença de tempo num trecho é menor que o limiar mínimo
  (caso de "empate"), O SISTEMA DEVE colorir esse trecho em cinza neutro, não
  atribuindo vitória a nenhum piloto.
- QUANDO 0 ou 1 piloto está selecionado, O SISTEMA DEVE manter o traçado
  idêntico ao comportamento da D.1 (contorno único neutro, sem seletor nem
  legenda).
- QUANDO os 2 pilotos são da mesma equipe (mesma cor), O SISTEMA DEVE
  diferenciá-los visualmente no traçado e na legenda (ex: tracejado no 2º),
  consistente com o já usado na aba Telemetria.

### Ações destrutivas ou irreversíveis nesta feature?
[x] Não
[ ] Sim

---

## FASE 3 — APROVAÇÃO

**Aprovado por:** Nickolas (nickolasnfd)
**Data:** 2026-07-05
**Observações da revisão:** aprovado sem alterações.

---

## FASE 5 — VALIDAÇÃO (preencher após implementar)

### 9. Registro de validação

| Critério de aceite | Resultado | Como foi testado |
|--------------------|-----------|------------------|
| Traçado colorido por trecho com 2 pilotos | ✅ | `npm test` (`trackMap.test.ts` +3, `trackColoring.test.ts` 7 casos, 97 no total) + Playwright `?mock=1`: 2 pilotos → 3 `<path>` coloridos (SIL azul, COS laranja) no modo Setor |
| Seletor Setor ⇄ Curva re-segmenta | ✅ | Playwright: Setor → 3 `<path>`; clicar "Curva" → 7 `<path>` (6 curvas detectadas na fixture); screenshots conferem visualmente |
| Trecho com diferença mínima fica neutro (cinza) | ✅ | `trackColoring.test.ts` — caso sintético com delta <0,02s → `faster: null` em todos os trechos; visível no screenshot do Setor (trecho cinza entre os coloridos) |
| Modo neutro (0/1 piloto) inalterado | ✅ | Playwright: 1 piloto → 1 `<path>` só, sem seletor/legenda (idêntico à D.1); 0 pilotos → auto-pick + nota preservados (adendo intacto) |
| Mesma cor de equipe → diferenciação visual | — | Não testado com dado real (fixture não tem 2 pilotos da mesma equipe); lógica (`dashSecond` + `strokeDasharray`) espelha exatamente o padrão já validado em `TelemetryView` (`dashed`/`teamColor`) — risco baixo, mesmo código-caminho |

**Regressões verificadas:** `npx tsc --noEmit`, `npm run build`, `npx oxlint` limpos.
`npm test` 97/97. Playwright confirmou as 4 abas sem erros (Voltas/Telemetria/Sessão
inalteradas; Traçado com 1 piloto e 0 pilotos idêntico à D.1+adendo).

**Desvios do plano:** nenhum desvio de escopo. Adicionado um `showColored` (coloredSegments
com pelo menos 1 trecho) além do `coloringReady` original do plano — proteção contra SVG em
branco se a segmentação de um modo (ex: Setor sem tempos de setor na cronometragem) resultar
em zero trechos; nesse caso cai no traçado neutro em vez de ficar vazio.

**Aprendizados → LEARNINGS.md:** nenhum erro novo além do já registrado (playwright local).

**Pendente:** confirmação do usuário no site com dados reais (2 pilotos, alternando Setor
e Curva).
