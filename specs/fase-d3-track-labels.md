# SPEC — Fase D.3: rótulos de curva/setor no traçado + legenda de empate

**Status:** Aprovado
**Criado em:** 2026-07-05
**Projeto:** TelemetriaF1
**Substitui/depende de:** `specs/ROADMAP.md` (item D1, refinamento pós-feedback) ·
depende de `specs/fase-d1-track-map.md` e `specs/fase-d2-track-coloring.md`
(ambos Implementados). Origem: feedback do usuário no site publicado após o
merge da D.2 (PR #17).

---

## FASE 1 — ESPECIFICAR

### 1. Problema
Duas lacunas identificadas pelo usuário testando a aba "Traçado" com dados
reais (British GP 2026):
1. O contorno da pista não tem nenhuma referência de curva/setor — o
   usuário vê a forma da pista mas não consegue localizar "onde é a curva 3"
   ou "onde começa o setor 2" olhando só pro desenho.
2. No modo colorido (D.2), o trecho "empate" (diferença de tempo pequena
   demais pra declarar vencedor) aparece em cinza sem nenhuma explicação na
   legenda — parece dado faltando, não uma decisão intencional.

### 2. Critério de sucesso
No traçado (com 0, 1 ou 2 pilotos selecionados), aparecem marcadores
numerados de curva (T1, T2…) e de setor (S1/S2/S3) sobre o contorno; no modo
colorido, quando existe ao menos 1 trecho neutro, a legenda inclui um item
"Empate" explicando a cor cinza. (sim/não)

### 3. Escopo

**Dentro do escopo:**
- Buscar o `car_data` do piloto de referência **sempre** que houver piloto +
  volta selecionados — hoje só é buscado quando 2 pilotos estão selecionados
  (necessário para o delta da D.2). Curvas/setores dependem só do piloto de
  referência, então passam a existir também no modo neutro (0/1 piloto),
  mesma filosofia do adendo da D.1 ("informação básica não espera 2
  pilotos").
- Marcadores de curva (T1..Tn, reusa `detectCorners`) e de setor (S1/S2/S3,
  reusa `sectorBoundaries`) sobrepostos ao contorno do traçado, em qualquer
  modo (neutro ou colorido).
- Entrada "Empate" (cinza) na legenda, visível só quando a coloração está
  ativa E existe pelo menos 1 trecho neutro.

**Fora do escopo:**
- Mudar o limiar ou a lógica do trecho neutro (decisão do usuário: manter
  como está, só explicar).
- Anti-colisão de rótulos quando uma curva e uma fronteira de setor caem
  muito perto uma da outra — aceitável sobrepor ocasionalmente (ver §5).
- Nomes reais de curva por circuito (mantém a numeração sequencial genérica
  já usada na Telemetria, sem mapa hardcoded — fora de escopo desde a D.1).

### 4. Restrições
- **Técnicas:** stack travada (AGENTS.md §2). Aditivo sobre a D.1/D.2 —
  marcadores novos sobre o SVG existente, nenhuma dependência nova. Plano de
  5 passos.
- **De dados:** nenhum endpoint novo — reusa `car_data` do piloto de
  referência (já buscado no modo colorido; passa a ser buscado também no
  modo neutro), tempos de setor da cronometragem (`Lap`).
- **Dependências:** D.1 (traçado) e D.2 (coloração, `detectCorners`/
  `sectorBoundaries` já usados ali) — ambos Implementados.

---

## FASE 2 — PLANEJAR

### 5. Decisões de design

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Quando buscar `car_data` do piloto de referência | só no modo colorido (atual) vs sempre que houver piloto+volta | **Sempre** | Curvas/setores só dependem do piloto de referência; presos ao modo colorido, os marcadores ficariam invisíveis no caso mais comum (0/1 piloto) — contrariaria o pedido do usuário. Mesma filosofia do adendo D.1. |
| Posição do marcador ao longo do traçado | interpolar x/y exato na distância alvo vs usar a amostra de `location` mais próxima | **Amostra mais próxima** (`pointAtDistance`, busca linear no array já normalizado) | Rotulagem visual não exige precisão sub-métrica; mesmo padrão de aproximação já aceito em `sectors.ts` ("amostra mais próxima", spec fase-b2-sector-markers.md §4). |
| Estilo visual do marcador | só texto vs marcador (ponto) + texto curto | **Ponto pequeno + texto** (T1, T2…; S1/S2/S3) | Consistente com os marcadores de curva/setor já usados nos gráficos de linha da Telemetria (Fase B/B.2), que também combinam uma marca na linha com um rótulo. |
| Curva e fronteira de setor muito próximas (sobreposição de rótulos) | lógica de anti-colisão vs aceitar sobreposição ocasional | **Aceitar** (menor mudança que resolve o problema, AGENTS.md §4) | Caso raro e de baixo impacto; anti-colisão é complexidade não pedida. Documentado como limitação conhecida. |
| Legenda do trecho neutro | sem entrada (atual) vs adicionar "Empate" | **Adicionar "Empate"**, só quando há coloração ativa E ≥1 trecho neutro | Decisão do usuário (ver histórico da sessão): manter o trecho neutro, mas deixar explícito o que ele significa. |

### 6. Plano de implementação

1. `src/lib/trackMap.ts`: `pointAtDistance(points, distances, targetM)` puro
   → `TrackPoint` (amostra normalizada mais próxima da distância alvo; `{x:0,y:0}`-safe
   para entradas vazias, nunca lança) → verificar: `trackMap.test.ts` — distância
   exata bate com o índice certo; distância fora do intervalo → clampa na
   ponta mais próxima; array vazio → não lança.
2. `TrackMapView`: desacoplar a busca de `car_data` do piloto de referência do
   gate `wantsColoring` — passa a buscar sempre que `referenceDriver` +
   `referenceWindow` existem; recalcular curvas/setores (`detectCorners`/
   `sectorBoundaries`) a partir desse fetch, independente do nº de pilotos →
   verificar: `npm test` verde (sem teste novo de UI neste passo — reuso de
   funções já testadas na D.2).
3. Renderizar os marcadores (ponto + texto `T1..Tn` e `S1/S2/S3`) sobre o
   SVG do traçado, em qualquer modo (neutro ou colorido) → verificar:
   Playwright `?mock=1` — com 0 pilotos, marcadores de curva/setor visíveis
   sobre o contorno neutro; com 2 pilotos, visíveis sobre o traçado
   colorido, nas mesmas posições.
4. Legenda: adicionar item "Empate" (cinza) quando `coloringReady` e
   `coloredSegments.some(s => s.faster == null)` → verificar: Playwright —
   fixture com 2 pilotos de ritmo parecido mostra "Empate" na legenda;
   fixture sem nenhum trecho neutro NÃO mostra o item.
5. Regressão e fechamento: `npx tsc --noEmit` + `npm run build` + suíte
   completa + `npx oxlint` + Playwright nas 4 abas (Voltas/Telemetria/Sessão
   inalteradas; Traçado com marcadores em 0/1/2 pilotos e legenda de empate
   quando aplicável) → verificar: tudo verde; EARS da D.1/D.2 re-conferidos.

### 7. Perguntas em aberto
- [x] Nenhuma — decisão do trecho neutro confirmada pelo usuário (manter +
  explicar na legenda) antes deste spec.

### 8. Critérios de aceite (formato EARS)

- QUANDO o traçado é exibido (com 0, 1 ou 2 pilotos selecionados), O
  SISTEMA DEVE sobrepor marcadores numerados de curva (T1, T2, …) ao longo
  do contorno.
- QUANDO a volta do piloto de referência tem tempos de setor válidos, O
  SISTEMA DEVE sobrepor marcadores de setor (S1/S2/S3) ao longo do
  contorno, junto com os de curva.
- QUANDO a coloração por 2 pilotos está ativa E existe ao menos 1 trecho
  neutro, O SISTEMA DEVE incluir um item "Empate" na legenda.
- QUANDO a coloração está ativa mas nenhum trecho é neutro, O SISTEMA DEVE
  omitir o item "Empate" da legenda.
- QUANDO não há tempos de setor válidos ou nenhuma curva é detectada (caso
  de erro/vazio), O SISTEMA DEVE omitir os marcadores correspondentes sem
  quebrar a tela.

### Ações destrutivas ou irreversíveis nesta feature?
[x] Não
[ ] Sim

---

## FASE 3 — APROVAÇÃO

**Aprovado por:** Nickolas (nickolasnfd)
**Data:** 2026-07-05
**Observações da revisão:** aprovado sem alterações (usuário respondeu
"Prosseguir" após o spec ser escrito, confirmando a decisão sobre o trecho
neutro já dada via pergunta direta).

---

## FASE 5 — VALIDAÇÃO (preencher após implementar)

### 9. Registro de validação

| Critério de aceite | Resultado | Como foi testado |
|--------------------|-----------|------------------|
| Marcadores de curva (T1..Tn) em qualquer modo (0/1/2 pilotos) | ✅ | Playwright `?mock=1`: 6 curvas + 3 setores (9 círculos + 9 textos) idênticos com 0, 1 e 2 pilotos selecionados |
| Marcadores de setor (S1/S2/S3) junto com os de curva | ✅ | Mesma verificação acima; screenshot confirma T1..T6 (cinza) e S1/S2/S3 (vermelho, negrito) sobre o contorno |
| "Empate" na legenda quando há trecho neutro | ✅ | Playwright + screenshot: 2 pilotos, modo Setor → legenda "SIL / COS / Empate"; trecho cinza corresponde ao Setor 1 |
| "Empate" omitido sem trecho neutro | — | Não teve caso na fixture sem nenhum trecho neutro para confirmar visualmente; comportamento decorre diretamente de `hasTie` (mesma condição já testada em `trackColoring.test.ts`) — risco baixo |
| Sem tempos de setor/curvas detectadas → marcadores correspondentes omitidos | — | Não testado com dado real degenerado; `corners`/`sectors` já tratam listas vazias sem lançar (cobertos pelos testes existentes de `corners.ts`/`sectors.ts`) |

**Regressões verificadas:** `npx tsc --noEmit`, `npm run build`, `npx oxlint` limpos.
`npm test` 101/101 (12 em `trackMap.test.ts`, +4 de `pointAtDistance`). Playwright
confirmou as 4 abas sem erros; toggle Setor/Curva não altera a contagem de marcadores
(9+9), confirmando que curva/setor independem da granularidade de coloração.

**Desvios do plano:** nenhum. `carA` (car_data do piloto de referência) passou a ser
buscado sempre (não só quando `wantsColoring`), exatamente como planejado no passo 2 —
isso também simplificou o cálculo de `coloredSegments`, que agora reusa `corners`/
`sectors`/`distancesA` já computados uma vez, em vez de recalculá-los inline.

**Aprendizados → LEARNINGS.md:** nenhum erro novo.

**Pendente:** confirmação do usuário no site com dados reais.
