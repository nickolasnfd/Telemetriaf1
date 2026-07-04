# ROADMAP — Features do backlog (análise de telemetria)

**Criado em:** 2026-07-04
**Objetivo:** ordenar as 8 ideias do BACKLOG numa sequência que minimize risco,
maximize reuso e garanta que o app continue **100% funcional** a cada passo.

> Este documento NÃO substitui os specs. Cada feature abaixo ainda passa pelo
> ciclo do AGENTS.md §3 (spec → aprovação → implementação → validação). O
> roadmap fixa a **ordem**, as **dependências** e a **estratégia de isolamento**
> para que as features não colidam nem quebrem o que já está no ar.

---

## Regras invariantes (valem para TODAS as features)

Estas regras são o que garante "não quebra / continua 100% funcional":

1. **Aditivo, nunca reescrita.** Lógica nova vai em módulos `src/lib/*` puros,
   com testes unitários próprios (padrão `batteryModel.ts` / `tooltip.ts`). UI
   nova vai em componentes/abas novos, não em reescrita dos existentes.
2. **Fundação como função pura, testada antes de consumir.** Qualquer cálculo
   compartilhado (distância, delta) nasce como função pura com testes ANTES de
   qualquer componente usá-lo.
3. **Alteração em tela existente só atrás de toggle** que preserva o
   comportamento atual como padrão. Vale para o eixo de distância (Fase B) e a
   pressão de freio (Fase E) — o usuário só vê o novo modo se optar por ele.
4. **Portão por feature:** 1 spec, 1 branch, 1 PR. Merge só com: `npm run build`
   verde + suíte de testes completa verde + verificação Playwright do caso novo
   + **regressão** confirmada dos critérios EARS da v1 (as abas Voltas,
   Telemetria e Sessão continuam funcionando como antes).
5. **Sem dependência paga ou com chave de API** (AGENTS.md §6). Só OpenF1 e libs
   client-side.
6. **Uma dependência nova por vez, justificada no spec.** Hoje o app tem só
   `react`, `react-dom`, `@tanstack/react-query`, `echarts`. Cada adição
   (ex: `jszip` na Fase A3) é decisão de design registrada no spec.

---

## Sequência recomendada (5 fases)

Ordem pensada para: ganhar confiança com itens de risco zero primeiro,
construir a fundação de distância antes do que depende dela, e deixar o item de
maior esforço (mapa da pista) por último.

| Fase | Feature | Esforço | Depende de | Dados |
|------|---------|---------|------------|-------|
| A1 | Legenda clicável (toggle piloto) | P | — | atuais |
| A2 | Cards de resumo por piloto | P | — | atuais |
| A3 | Exportar dados (ZIP) | P | — | atuais |
| B1 | Eixo X por distância + marcadores de curva | M | — | atuais |
| C1 | Gráfico de delta acumulado (2 pilotos) | M | B1 | atuais |
| C2 | Painel de insights automáticos | M | C1 | atuais |
| D1 | Comparador no traçado da pista (SVG) | G | B1, C1 + `location` | **novo endpoint** |
| E1 | Freio: pressão estimada (toggle) | P–M | — | atuais |

Esforço: P = pequeno · M = médio · G = grande.

---

## FASE A — Ganhos rápidos, risco zero

Três itens independentes, sobre dados que já buscamos, puramente aditivos.
Servem para validar o ritmo e entregar valor imediato.

### A1 — Legenda clicável (toggle de piloto)
- **Objetivo:** clicar no chip do piloto na legenda esconde/mostra a linha dele
  nos gráficos de telemetria (hoje a legenda é só informativa).
- **Abordagem:** o ECharts já suporta `legend.selected` + evento `legendselectchanged`.
  Ativar a legenda interativa nos gráficos da aba Telemetria; sincronizar o
  estado entre os 6 canais (todos escondem/mostram o mesmo piloto juntos).
- **Isolamento/risco:** só configuração do ECharts na `TelemetryView`. Nenhuma
  mudança de dados. Risco mínimo.
- **Verificação:** Playwright — clicar no chip esconde a série nos 6 canais;
  clicar de novo restaura.

### A2 — Cards de resumo por piloto
- **Objetivo:** painel comparando os 2 pilotos: top speed, velocidade média,
  nº de frenagens, e (reusando o que já temos) tempos de setor.
- **Abordagem:** novo `src/lib/lapSummary.ts` puro — funções `topSpeed`,
  `avgSpeed`, `brakingEvents` (conta transições de `brake` 0→100) sobre o
  `car_data` já buscado. Novo componente de cards na aba Telemetria.
- **Isolamento/risco:** módulo puro + componente novo. Não toca gráficos.
- **Verificação:** testes unitários das funções + Playwright confere os cards.

### A3 — Exportar dados (ZIP)
- **Objetivo:** botão que baixa os dados da volta/sessão selecionada em ZIP
  (JSON/CSV).
- **Abordagem:** empacota os dados JÁ buscados (car_data, laps, etc.) com uma
  lib client-side (ex: `jszip` — decisão de design no spec). Botão isolado.
- **Isolamento/risco:** ação de leitura + geração de arquivo no cliente; não
  altera nada da UI existente. Adiciona 1 dependência (justificar no spec).
- **Verificação:** Playwright dispara o download e confere o conteúdo do ZIP.

---

## FASE B — Fundação de distância

### B1 — Eixo X por distância + marcadores de curva
- **Objetivo:** oferecer o eixo X em **distância (m)** em vez de tempo, com
  rótulos de curva/reta (T1, T2, …) sobrepostos. Muito mais fácil localizar
  "onde na pista" algo acontece. É a base para o delta (C1) e melhora a leitura
  dos canais atuais.
- **Dados:** derivável do que já temos — distância = integral de `speed` no
  tempo (∫ v dt), sem endpoint novo.
- **Abordagem:**
  1. `src/lib/distance.ts` puro: `cumulativeDistance(samples)` → metros por
     amostra (converter km/h → m/s). Testes unitários.
  2. Detecção de curvas SEM mapa por circuito: numerar mínimos locais de
     velocidade sequencialmente (T1..Tn) — funciona em qualquer GP. (Mapa
     hardcoded por circuito fica como refinamento futuro.)
  3. **Toggle Tempo ⇄ Distância** na aba Telemetria, com **Tempo como padrão** —
     o comportamento atual fica intacto para quem não trocar.
- **Isolamento/risco:** este é o ÚNICO item que mexe numa tela que já funciona.
  Por isso o toggle é obrigatório (regra invariante 3): o eixo de distância é
  opt-in, o eixo de tempo continua sendo o default verificado da v1.
- **Verificação:** testes de `cumulativeDistance`; Playwright confirma que (a)
  o default continua idêntico ao atual e (b) o modo distância renderiza com
  marcadores de curva. Regressão dos critérios EARS de telemetria da v1.

---

## FASE C — Camada de análise (sobre a fundação de distância)

### C1 — Gráfico de delta acumulado entre 2 pilotos
- **Objetivo:** um gráfico dedicado mostrando a diferença de tempo acumulada
  (segundos ganhos/perdidos) entre os 2 pilotos ao longo da volta — hoje a
  telemetria mostra os canais brutos lado a lado, não a diferença em si.
- **Dados:** atuais (car_data das 2 voltas), alinhados por distância (B1).
- **Abordagem:** `src/lib/delta.ts` puro — alinha as duas voltas por distância
  (reusa `distance.ts`) e calcula o delta de tempo acumulado por ponto. Novo
  gráfico ECharts (linha única do delta, com linha de referência no zero).
  Incluir um **badge de confiança** (ex: MEDIUM) quando o alinhamento é
  impreciso — sinceridade sobre a limitação, igual à ressalva da bateria.
- **Isolamento/risco:** módulo puro + gráfico novo. Não altera os canais
  existentes.
- **Verificação:** testes de `delta.ts` (delta zero para voltas idênticas;
  sinal correto quando um piloto é mais rápido); Playwright confere o gráfico.

### C2 — Painel de insights automáticos
- **Objetivo:** frases geradas a partir do delta, tipo "Reta 5: perde
  velocidade na reta (+0.06s)" / "Curva 9: carrega mais velocidade (-0.05s)".
- **Dados:** derivado do delta (C1) + segmentação por curva (B1).
- **Abordagem:** `src/lib/insights.ts` puro — **regras determinísticas** (NÃO
  IA generativa): segmenta a volta por curva/reta, mede o delta de tempo e de
  velocidade em cada trecho, e aplica um conjunto de regras (ex: "se perde >X
  em zona de reta → frase de reta; se ganha em zona de curva rápida → frase de
  curva"). Painel de texto novo.
- **Isolamento/risco:** módulo puro de regras + painel novo. As regras são
  testáveis exaustivamente e não dependem de rede.
- **Verificação:** testes unitários cobrindo cada regra com um cenário
  sintético; Playwright confere o painel renderizado.

---

## FASE D — Comparador no traçado da pista (novo endpoint)

### D1 — Mapa da pista com trecho colorido por piloto mais rápido
- **Objetivo:** desenhar o traçado do circuito (SVG) com o percurso colorido
  por qual piloto foi mais rápido em cada trecho — muda o desenho conforme o GP.
  (O app de referência também tinha um "replay animado"; fica para um sub-item
  posterior.)
- **Dados:** **endpoint novo `location`** da OpenF1 (x, y, z por piloto/tempo,
  ~3,7 Hz) para a forma do traçado. A coloração por "quem foi mais rápido"
  reusa o delta por distância (C1).
- **Abordagem:**
  1. Adicionar `location` à camada de API (types + query hook + fixture), no
     mesmo padrão dos outros endpoints. Testes com fixture.
  2. `src/lib/trackMap.ts` puro: normaliza x/y numa viewBox e gera o path SVG.
  3. Segmentar o traçado e colorir por delta (reusa C1). Nova aba/painel.
- **Isolamento/risco:** maior esforço e primeira vez que tocamos num endpoint
  novo. Mitigação: entra como **aba nova**, sem alterar as existentes; a
  camada de API é aditiva (novo hook, não mexe nos atuais). Se o `location`
  falhar/estiver vazio, a aba mostra estado de erro/vazio (padrão da v1) sem
  afetar o resto.
- **Verificação:** testes do client de `location` contra fixture; testes de
  `trackMap.ts`; Playwright confere o traçado renderizado com a fixture.

---

## FASE E — Modelo físico adicional (isolado, baixa prioridade)

### E1 — Freio: pressão estimada (toggle On/Off ⇄ Pressão)
- **Objetivo:** além do freio binário atual, oferecer uma **pressão estimada**
  de freio (modelo físico, como a bateria).
- **Dados:** atuais (desaceleração derivada de `speed`).
- **Abordagem:** `src/lib/brakeModel.ts` puro (mesmo padrão do `batteryModel`),
  rotulado como ESTIMATIVA na UI. **Toggle** no canal de freio, com On/Off como
  padrão — comportamento atual preservado.
- **Isolamento/risco:** módulo puro + toggle; default inalterado. Baixo risco.
- **Verificação:** testes do modelo; Playwright confere o toggle.

---

## Grafo de dependências (resumo)

```
A1  A2  A3          (independentes, podem sair em qualquer ordem)
        E1          (independente, isolado)

B1  ──►  C1  ──►  C2
          │
          └──►  D1  (também precisa do endpoint `location`)
```

**Caminho crítico de valor:** B1 → C1 → C2 (fundação de distância desbloqueia
delta, que desbloqueia insights). D1 é o topo da pirâmide (precisa de B1, C1 e
do endpoint novo). A* e E1 são satélites independentes que podem entrar quando
convier, sem bloquear ninguém.
