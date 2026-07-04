# SPEC — Fase B: eixo por distância + marcadores de curva

**Status:** Implementado
**Criado em:** 2026-07-04
**Projeto:** TelemetriaF1
**Substitui/depende de:** `specs/ROADMAP.md` (Fase B, item B1) · depende de
`specs/f1-telemetry-interface.md` e `specs/fase-a-quick-wins.md` (Implementados)

---

## FASE 1 — ESPECIFICAR

### 1. Problema
Hoje os 6 canais da aba Telemetria usam "segundos na volta" no eixo X. Isso
dificulta responder "o que acontece nesta curva específica?" — o usuário
precisa calcular de cabeça em que segundo uma curva ocorre. Com distância (m)
e marcadores de curva sobrepostos, é imediato localizar onde na pista algo
acontece — pré-requisito também para o gráfico de delta (Fase C).

### 2. Critério de sucesso
Na aba Telemetria de uma volta real, o usuário alterna um seletor "Tempo ⇄
Distância": em "Distância", os 6 canais e a bateria redesenham com o eixo X em
metros e marcadores verticais de curva (T1, T2…) alinhados nos gráficos; ao
voltar para "Tempo", tudo volta a ser idêntico ao comportamento anterior a
esta feature. (sim/não)

### 3. Escopo

**Dentro do escopo (item B1 do ROADMAP):**
- Cálculo de distância percorrida a partir da velocidade (`car_data`), sem
  endpoint novo
- Detecção heurística de curvas (mínimos locais de velocidade), numeradas
  sequencialmente (T1, T2…) — não são os números oficiais das curvas do
  circuito, e a UI deixa isso explícito
- Toggle "Tempo ⇄ Distância" na aba Telemetria, com **Tempo como padrão**
  (comportamento atual inalterado por default)
- Marcadores verticais de curva nos 6 canais + bateria quando em modo Distância

**Fora do escopo (→ ROADMAP fases C–E):**
- Rotular retas ("Straight 5") — só curvas nesta fase
- Mapa por circuito com números oficiais de curva (precisaria de dado externo
  não disponível gratuitamente)
- Gráfico de delta e insights (Fase C, consome esta fundação depois)
- Persistir o modo Tempo/Distância na URL (fica como estado local da aba,
  mesmo padrão de `hiddenDrivers` da Fase A)

### 4. Restrições
- **Técnicas:** stack travada (AGENTS.md §2). Regra do ROADMAP: como esta é a
  ÚNICA feature que altera uma tela já funcionando, o modo Distância é
  **opt-in obrigatório** — o padrão precisa continuar idêntico ao verificado
  na v1.
- **De dados:** somente `car_data` já buscado (speed, já usado). Nenhuma
  chamada nova à OpenF1.
- **Dependências:** nenhuma nova. Depende da Fase A (mesma tela).

---

## FASE 2 — PLANEJAR

### 5. Decisões de design

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Cálculo de distância | soma retangular (v·Δt) vs integração trapezoidal ((v₁+v₂)/2·Δt) | **Trapezoidal** | Mais precisa com amostragem irregular (~3,7 Hz); erro desprezível a mais em troca de nenhum custo extra. |
| Detecção de curva | threshold fixo de velocidade vs mínimo local com suavização + prominência mínima | **Suavização (média móvel) + mínimo local + prominência mínima + fusão de mínimos próximos** | Dado bruto tem ruído — sem suavização/prominência, pequenas oscilações virariam "curvas" falsas. Testável com casos sintéticos. |
| Curva de referência para os marcadores | detectar por piloto (podem divergir) vs usar só o 1º piloto selecionado | **1º piloto selecionado (`traces[0]`)**, mesmo padrão já usado para a volta de referência | Os dois pilotos percorrem a mesma pista — em distância (diferente de tempo!) os pontos de curva coincidem para ambos na prática. Um único conjunto de marcadores evita marcadores duplicados/conflitantes. |
| Numeração das curvas | tentar mapear para números oficiais do circuito vs numerar sequencialmente | **Sequencial (T1, T2…), rotulado como aproximado** | Números oficiais exigiriam mapa por circuito (dado que não temos gratuitamente) — inventar a correspondência violaria AGENTS.md §4 (não inventar dados). Honestidade > precisão cosmética. |
| Onde mostra o toggle | por canal vs um controle único para a aba | **Um controle único** (afeta os 6 canais + bateria) | Consistência — não faria sentido comparar canais em eixos diferentes. |
| Persistência do toggle | URL vs estado local do componente | **Estado local** (mesmo padrão do `hiddenDrivers` da Fase A) | Nada no ROADMAP pede compartilhamento por link; menor mudança. |
| Rótulo de texto do marcador | em todos os 7 gráficos vs só no primeiro (velocidade) | **Linha tracejada em todos os 7, texto "Tn" só no de velocidade** | Alinhamento visual entre canais é útil; repetir o texto em 7 lugares polui a leitura. |

### 6. Plano de implementação

1. `src/lib/distance.ts`: `cumulativeDistance(samples)` → array de metros
   (integração trapezoidal) + testes (velocidade constante, velocidade zero,
   array vazio/1 elemento) → verificar: `npm test` verde.
2. `src/lib/corners.ts`: `detectCorners(points)` → array de curvas numeradas
   (suavização + mínimo local + prominência mínima + fusão por proximidade) +
   testes com arrays sintéticos de 2–3 "vales" de velocidade conhecidos →
   verificar: número e posição das curvas detectadas batem com o esperado;
   ruído pequeno não gera curva falsa.
3. Refatorar os construtores de gráfico da `TelemetryView` para aceitarem um
   array de valores X genérico (tempo OU distância) em vez de calcular tempo
   internamente — a busca do tooltip (`nearestPointValue`) já é agnóstica ao
   domínio do eixo, não muda → verificar: modo Tempo renderiza
   pixel-a-pixel igual ao estado atual (screenshot comparado).
4. Toggle "Tempo ⇄ Distância" (estado local, padrão Tempo) acima dos canais;
   em modo Distância, eixo X em metros e cabeçalho do tooltip mostra "Xm na
   volta" → verificar: Playwright alterna os dois modos e confere rótulos.
5. Marcadores de curva (linha tracejada nos 7 gráficos + rótulo "Tn" só na
   velocidade) calculados sobre `traces[0]` em modo Distância → verificar:
   Playwright confere marcadores presentes e alinhados entre canais.
6. Nota de rodapé explicando que a numeração é aproximada (heurística, não
   oficial do circuito) → verificar: texto visível quando em modo Distância.
7. Regressão e fechamento: `npm run build` + suíte completa + screenshots das
   3 abas em modo Tempo (deve ser pixel-idêntico ao estado pré-feature) e da
   Telemetria em modo Distância → verificar: tudo verde; critérios EARS da v1
   e da Fase A re-conferidos.

### 7. Perguntas em aberto
- [x] Nenhuma — decisões fechadas na seção 5 com tradeoffs.

### 8. Critérios de aceite (formato EARS)

- QUANDO o usuário abre a aba Telemetria, O SISTEMA DEVE exibir o eixo X em
  tempo por padrão, com o mesmo comportamento visual de antes desta feature.
- QUANDO o usuário alterna o controle para "Distância", O SISTEMA DEVE
  redesenhar os 6 canais e a bateria com o eixo X em metros.
- QUANDO o modo Distância está ativo, O SISTEMA DEVE sobrepor marcadores
  verticais de curva alinhados nos 7 gráficos, com o número (T1, T2…) visível
  no canal de velocidade e uma nota indicando que a numeração é aproximada.
- QUANDO o usuário alterna de volta para "Tempo", O SISTEMA DEVE remover os
  marcadores de curva e restaurar o eixo original.
- QUANDO a volta selecionada não tem amostras suficientes para detectar
  nenhuma curva (caso de erro/borda), O SISTEMA DEVE exibir o eixo de
  distância normalmente, sem marcadores e sem quebrar o gráfico.

### Ações destrutivas ou irreversíveis nesta feature?
[x] Não
[ ] Sim

---

## FASE 3 — APROVAÇÃO

**Aprovado por:** Nickolas (nickolasnfd)
**Data:** 2026-07-04
**Observações da revisão:** aprovado sem alterações.

---

## FASE 5 — VALIDAÇÃO (preencher após implementar)

### 9. Registro de validação

| Critério de aceite | Resultado | Como foi testado |
|--------------------|-----------|------------------|
| Tempo é o padrão, idêntico ao comportamento anterior | ✅ | Screenshot comparado pixel-a-pixel com o estado pré-Fase B |
| Alternar para Distância redesenha os 6 canais + bateria em metros | ✅ | Playwright: eixo 0m–5573m, tooltip "Xm na volta" |
| Marcadores de curva alinhados nos 7 gráficos, texto só na velocidade | ✅ | Screenshot: T1–T6 tracejados nos 7 canais, rótulo só na velocidade |
| Voltar para Tempo remove marcadores e restaura o eixo original | ✅ | Screenshot idêntico ao estado antes de trocar |
| Poucos dados → eixo distância sem marcadores, sem quebrar (caso de erro) | ✅ | `detectCorners` retorna `[]` para <3 pontos (testado unitariamente) |

**Regressões verificadas:** suíte completa 61/61 (13 novos: 5 distance + 7
corners + 1 tooltip de tolerância por domínio); build verde; abas Voltas e
Sessão re-testadas via screenshot, idênticas; mobile 375px sem overflow em
nenhum dos dois modos.
**Validação com dados reais:** confirmada pelo usuário no site publicado em
2026-07-05 ("funcionando corretamente").
**Desvios do plano:** nenhum no plano em si — mas a implementação revelou e
corrigiu um bug (tolerância de "gap" do tooltip fixa em 1,5, correta só para
segundos; quebrava silenciosamente em metros). Registrado em LEARNINGS e
corrigido antes do fechamento, dentro do próprio passo 3/4.
**Aprendizados → LEARNINGS.md:** registrado (tolerância numérica precisa ser
revisada ao generalizar a unidade/domínio de um cálculo).
