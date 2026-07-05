# SPEC — Fase D.1: traçado da pista (SVG) a partir do endpoint `location`

**Status:** Em revisão
**Criado em:** 2026-07-05
**Projeto:** TelemetriaF1
**Substitui/depende de:** `specs/ROADMAP.md` (Fase D, item D1) · depende de
`specs/fase-b-distance-axis.md` (distância, para o spec D.2). Este spec cobre
só a **primeira metade** do D1 do ROADMAP: a camada de dados do endpoint novo
`location` e o desenho do traçado. A **coloração por piloto mais rápido**
(reusa o delta da C1) fica para o spec seguinte (D.2) — juntar os dois
passaria do limite de ~8 passos do AGENTS.md §5, mesma divisão da Fase C.

---

## FASE 1 — ESPECIFICAR

### 1. Problema
Todas as visualizações atuais (Voltas, Telemetria, Sessão) são gráficos de
linha por tempo/distância. Nenhuma mostra **onde na pista** as coisas
acontecem de forma espacial — o usuário não vê o desenho do circuito, só
curvas numeradas sobre um eixo. Localizar "a curva 4 é aquela do fim da reta"
exige imaginação. Além disso, o app nunca tocou o endpoint `location` da
OpenF1 (posição x/y/z do carro), então a informação geográfica da volta está
sem uso.

### 2. Critério de sucesso
Com uma sessão e uma volta selecionadas, uma aba nova "Traçado" desenha o
contorno do circuito daquela volta (um `<svg>` com um `<path>` fechado
seguindo o percurso do carro), reconhecível como a forma da pista, sem
quebrar nenhuma aba existente. (sim/não)

### 3. Escopo

**Dentro do escopo (primeira metade do item D1 do ROADMAP):**
- Adicionar o endpoint `location` à camada de API: tipo, hook de query
  (filtrado por sessão + piloto + janela de tempo, igual ao `car_data`) e
  suporte na fixture `?mock=1`.
- `src/lib/trackMap.ts` puro: normaliza os pontos x/y numa `viewBox` fixa
  (preservando proporção, com eixo Y invertido para SVG) e gera o `path` do
  traçado.
- Aba nova "Traçado" que busca a `location` do piloto de referência
  (`traces[0]`) na volta selecionada e renderiza o SVG.
- Estado vazio/erro quando a `location` falha, vem vazia, ou não há volta
  selecionada — padrão dos estados existentes do app (componente `Feedback`).

**Fora do escopo (→ próximo spec, D.2):**
- Coloração do traçado por qual piloto foi mais rápido em cada trecho (reusa
  o delta da C1 e a segmentação por distância).
- Marcadores de curva/setor sobre o traçado.
- Replay animado do carro na volta (mencionado no ROADMAP como sub-item
  posterior; vai para o BACKLOG).
- Mapa hardcoded por circuito / nomes reais de curva.

### 4. Restrições
- **Técnicas:** stack travada (AGENTS.md §2). Aditivo — aba nova, nenhuma
  alteração nas abas Voltas/Telemetria/Sessão (regra invariante 1 e 4 do
  ROADMAP). SVG puro (React já renderiza SVG nativamente); **nenhuma
  dependência nova**. Plano de 5 passos.
- **De dados:** endpoint novo `location` da OpenF1 (`x`, `y`, `z`,
  `driver_number`, `date`, `session_key`, `meeting_key`), ~3,7 Hz — schema
  espelhado da doc oficial (openf1.org/docs), como os outros tipos em
  `types.ts`. Filtrar SEMPRE por sessão + piloto + janela de tempo da volta
  (AGENTS.md §9 — nunca consultar `location`/`car_data` sem filtro). Reusa a
  janela (`windowA`) que a `TelemetryView` já calcula.
- **Dependências:** nenhuma feature bloqueia este spec. A D.2 (coloração)
  depende deste + da C1 (já Implementada).

---

## FASE 2 — PLANEJAR

### 5. Decisões de design

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Fonte da forma do traçado | endpoint `location` (x/y reais) vs derivar de `speed`+direção | **`location`** | É o único dado que dá a geometria real da pista; derivar de velocidade não recupera as curvas. É o endpoint que o ROADMAP já prevê para a Fase D. |
| Piloto que desenha o contorno | ambos vs só o de referência (`traces[0]`) | **`traces[0]`** | Um traçado é suficiente para a forma da pista; os dois pilotos correm quase o mesmo percurso. Mesma convenção de referência já usada em curvas/setores/delta. A coloração por piloto (que precisa dos dois) é a D.2. |
| Sistema de coordenadas | usar x/y crus vs normalizar numa viewBox fixa | **Normalizar** numa viewBox fixa (ex.: 1000×1000 com padding), preservando proporção (mesmo fator de escala em x e y) | x/y da OpenF1 vêm em unidades arbitrárias e variam por circuito; normalizar deixa o SVG responsivo e independente do GP. Preservar proporção evita distorcer a pista. |
| Eixo Y | usar direto vs inverter | **Inverter** (`y' = maxY - y`) | Em SVG o Y cresce para baixo; sem inverter, a pista sai espelhada verticalmente. |
| Fechamento do path | `M...L...` aberto vs fechar com `Z` | **Fechar com `Z`** | Uma volta é um circuito fechado; fechar liga o último ponto ao primeiro e evita uma "fenda" visível na linha de chegada. |
| Suavização da linha | polilinha (`L`) vs curvas de Bézier | **Polilinha (`L`)** | A ~3,7 Hz numa volta a densidade de pontos já é alta; a menor solução que funciona (AGENTS.md §4). Suavizar fica como refinamento futuro se necessário. |
| `z` (elevação) | usar vs ignorar | **Ignorar** | O traçado é uma projeção 2D de cima; `z` não entra nesta feature. |
| location vazia/degenerada (todos os pontos iguais, <2 pontos, bounding box nula) | quebrar vs estado vazio | **Estado vazio** com mensagem (componente `Feedback`) | Consistente com os outros estados vazios; a função pura devolve resultado vazio sem lançar erro. |

### 6. Plano de implementação

1. Camada de API: adicionar `Location` a `types.ts` (`x`, `y`, `z`,
   `driver_number`, `date`, `session_key`, `meeting_key`) e `useLocation`
   em `queries.ts` (mesmo padrão/filered-window de `useCarData`); estender a
   fixture `mock.ts` com um `case 'location'` que gera x/y a partir de uma
   curva 2D fechada sintética parametrizada pelo `frac` da volta (reusando a
   estrutura de amostragem do `car_data`) → verificar: `npm test` verde,
   incluindo um teste novo em `mock.test.ts`/`client.test.ts` que confirma
   que `location` filtra por piloto+janela e devolve pontos com x/y.
2. `src/lib/trackMap.ts` puro: `buildTrackPath(points)` →
   `{ path: string; viewBox: string }`, normalizando x/y na viewBox
   (proporção preservada + padding), com Y invertido e `Z` no fim; devolve
   resultado vazio para <2 pontos ou bounding box degenerada →
   verificar: `npm test` com `trackMap.test.ts` cobrindo (a) quadrado
   conhecido → path normalizado esperado, (b) <2 pontos → vazio, (c) todos os
   pontos iguais → vazio, sem lançar.
3. Aba nova "Traçado": adicionar o valor à união `View` (`urlState.ts`) e à
   lista `TABS` (`App.tsx`); novo componente `TrackMapView` que busca a
   `location` do piloto de referência na volta selecionada e renderiza o
   `<svg viewBox=...>` com o `<path>` → verificar: Playwright em `?mock=1` —
   a aba "Traçado" contém um `<svg>` com um `<path>` cujo `d` tem múltiplos
   segmentos `L` e termina em `Z`.
4. Estado vazio/erro: sem volta selecionada, `location` vazia, ou erro de
   rede → renderizar `Feedback` (mesmo padrão das outras views) no lugar do
   SVG, sem quebrar a aba → verificar: Playwright — abrir "Traçado" sem
   sessão/volta mostra a mensagem, não um SVG quebrado.
5. Regressão e fechamento: `npx tsc --noEmit` + `npm run build` + suíte
   completa + `npx oxlint` + screenshots das 3 abas existentes (inalteradas)
   + captura da aba "Traçado" → verificar: tudo verde; critérios EARS da
   v1/Fase A/B/C re-conferidos (as abas existentes são aditivamente
   preservadas).

### 7. Perguntas em aberto
- [x] Nenhuma — decisões fechadas na seção 5. (A geometria exata da curva
  sintética da fixture é detalhe de implementação do passo 1, sem impacto no
  comportamento observável: basta ser uma forma fechada plausível.)

### 8. Critérios de aceite (formato EARS)

- QUANDO uma sessão e uma volta com dados de `location` estão selecionadas, O
  SISTEMA DEVE exibir na aba "Traçado" um `<svg>` com um `<path>` fechado que
  segue o percurso do carro naquela volta.
- QUANDO a aba "Traçado" é aberta, O SISTEMA DEVE normalizar o traçado numa
  viewBox responsiva preservando a proporção do circuito (sem distorção
  horizontal/vertical).
- QUANDO nenhuma volta está selecionada OU a `location` vem vazia (caso de
  erro/vazio), O SISTEMA DEVE exibir uma mensagem explicativa no lugar do
  SVG, sem quebrar a tela.
- QUANDO a requisição de `location` falha na rede (caso de erro), O SISTEMA
  DEVE exibir o estado de erro padrão do app, sem afetar as outras abas.
- QUANDO o usuário alterna para as abas Voltas/Telemetria/Sessão, O SISTEMA
  DEVE mantê-las idênticas ao comportamento atual (feature puramente aditiva).

### Ações destrutivas ou irreversíveis nesta feature?
[x] Não
[ ] Sim

---

## FASE 3 — APROVAÇÃO

**Aprovado por:** [aguardando]
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
