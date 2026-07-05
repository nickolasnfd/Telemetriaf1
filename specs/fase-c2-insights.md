# SPEC — Fase C.2: painel de insights automáticos

**Status:** Em revisão
**Criado em:** 2026-07-04
**Projeto:** TelemetriaF1
**Substitui/depende de:** `specs/ROADMAP.md` (Fase C, item C2) · depende de
`specs/fase-c1-delta-chart.md` (Implementado — reusa `computeDelta`),
`fase-b-distance-axis.md` (`detectCorners`) e `fase-b2-sector-markers.md`
(setores). Último item da Fase C do ROADMAP.

---

## FASE 1 — ESPECIFICAR

### 1. Problema
O gráfico de Delta (C.1) mostra ONDE um piloto ganha ou perde tempo, mas o
usuário ainda precisa interpretar as curvas para entender O QUE aconteceu
("perdeu na reta? travou na curva?"). A ferramenta de referência resume isso
em frases automáticas ("Reta 5: perde velocidade na reta +0.06s"), que tornam
a análise imediata para quem está começando.

### 2. Critério de sucesso
Com 2 pilotos selecionados numa volta real, aparece um painel "Insights" com:
(a) a diferença de tempo por setor (S1/S2/S3), e (b) uma lista dos trechos com
maior diferença de tempo, cada um com uma frase descritiva gerada por regra
(ex: "{piloto} perde tempo com menor velocidade máxima neste trecho, +0.06s").
(sim/não)

### 3. Escopo

**Dentro do escopo (item C2 do ROADMAP):**
- Diferença de tempo por setor entre os 2 pilotos, a partir dos tempos de
  setor reais (`duration_sector_*`)
- Lista de trechos (segmentados pelas curvas detectadas) ordenada pela maior
  diferença de tempo, cada um com frase descritiva **determinística** (tabela
  de regras, NÃO IA generativa)
- Herda o selo de confiança do alinhamento do delta (C.1): quando baixo, o
  painel avisa que os insights são aproximados
- Estado vazio quando não há exatamente 2 pilotos com telemetria

**Fora do escopo (→ BACKLOG):**
- Insights baseados em dado que não temos (pressão de pneu, combustível, ERS
  real)
- Comparação de mais de 2 pilotos
- Insights por texto livre gerado por IA — proibido nesta feature (ver §5)

### 4. Restrições
- **Técnicas:** stack travada (AGENTS.md §2). Aditivo — não altera o gráfico
  de Delta nem os 6 canais. Plano de 4 passos.
- **De dados:** somente `car_data`, `laps` e os cálculos já existentes
  (delta, curvas, setores). Nenhuma chamada nova à OpenF1. NEVER inventar
  comportamento — as frases descrevem só o que os números mostram, com
  hedge ("provável") quando a causa não é diretamente medida.
- **Dependências:** Fase C.1 (delta), B (curvas), B.2 (setores).

### 5. Decisões de design

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Geração das frases | IA generativa vs tabela de regras determinísticas | **Tabela de regras** | AGENTS.md §4 (não inventar). Regras são testáveis exaustivamente, reproduzíveis e não custam rede/API. O ROADMAP já previa isso. |
| Segmentação da volta | por tempo fixo vs pelas curvas detectadas | **Pelas curvas** (`detectCorners`) — cada trecho vai de uma curva à próxima (+ início→C1 e última curva→fim) | Reusa a fundação existente; trechos têm significado físico (uma reta + a frenagem seguinte). |
| Perspectiva das frases | neutra vs relativa a um piloto | **Relativa ao 2º piloto (B) vs referência (A=`traces[0]`)** | Mesma convenção do delta; a UI declara "em relação a {A}". |
| Métrica de tempo por trecho | delta instantâneo vs variação do delta no trecho | **Variação do delta** (delta no fim − delta no início do trecho) | É exatamente "quanto tempo B ganhou/perdeu naquele trecho". |
| Classificação da causa | só tempo vs tempo + velocidade | **Combinar sinal do tempo com diferença de velocidade máxima do trecho** | Distingue "perdeu na reta" (velocidade máx. menor) de "perdeu no técnico" (velocidade máx. ok, provável frenagem/tração). Frases com hedge quando ambíguo. |
| Setores | recalcular vs usar `duration_sector_*` | **Tempos de setor reais** | Dado oficial de cronometragem; diferença de setor é exata (não aproximada como a posição em metros). |
| Ruído | mostrar todos os trechos vs filtrar | **Só trechos com \|Δtempo\| ≥ 0,02s, no máximo 6, ordenados por \|Δtempo\|** | Evita poluir com diferenças irrelevantes; foca no que importa. |
| Confiança baixa | esconder vs avisar | **Mostrar com aviso** | Consistente com o resto do app (bateria, curvas): expõe a incerteza em vez de esconder. |

### 6. Plano de implementação

1. `src/lib/insights.ts` puro:
   - `sectorTimeDeltas(lapA, lapB)` → diferença por setor (S1/S2/S3) usando
     `duration_sector_*`.
   - `segmentInsights(delta, corners, samplesA, samplesB, distancesA, distancesB)`
     → lista de `{ label, deltaS, phrase }` para os trechos, aplicando a tabela
     de regras (tempo × velocidade máx.), filtrada (≥0,02s) e ordenada (top 6).
   - Testes unitários cobrindo cada linha da tabela de regras com cenários
     sintéticos + casos de borda (sem curvas → 1 trecho único; setores nulos →
     lista de setor vazia) → verificar: `npm test` verde.
2. Componente `InsightsPanel` (bloco de setores + lista de trechos com frases),
   renderizado com exatamente 2 pilotos, logo abaixo do gráfico de Delta, com
   o aviso de confiança quando baixa → verificar: Playwright — fixture com 2
   pilotos mostra setores e frases coerentes com os dados.
3. Estado vazio: com <2 pilotos, o painel não aparece (ou mostra a mesma nota
   do delta) → verificar: Playwright com 1 piloto selecionado.
4. Regressão e fechamento: `npm run build` + suíte completa + screenshots das
   3 abas (Delta e canais inalterados) + captura do painel de Insights →
   verificar: tudo verde; EARS re-conferidos.

### 7. Perguntas em aberto
- [x] Nenhuma — decisões fechadas na seção 5.

### 8. Critérios de aceite (formato EARS)

- QUANDO exatamente 2 pilotos com telemetria estão selecionados, O SISTEMA
  DEVE exibir o painel de Insights com a diferença de tempo por setor
  (S1/S2/S3) e a lista de trechos com maior diferença.
- QUANDO um trecho é listado, O SISTEMA DEVE mostrar uma frase descritiva
  gerada por regra e o valor da diferença de tempo (±Xs), sem texto livre de
  IA.
- QUANDO o alinhamento do delta tem confiança baixa, O SISTEMA DEVE avisar que
  os insights são aproximados.
- QUANDO nenhum trecho tem diferença relevante (≥0,02s), O SISTEMA DEVE indicar
  que os pilotos estão equivalentes, sem inventar diferenças.
- QUANDO menos de 2 pilotos com telemetria estão selecionados (caso de erro),
  O SISTEMA DEVE ocultar o painel sem quebrar a tela.

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
