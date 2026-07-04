# SPEC — Fase C.1: gráfico de delta acumulado entre 2 pilotos

**Status:** Em revisão
**Criado em:** 2026-07-04
**Projeto:** TelemetriaF1
**Substitui/depende de:** `specs/ROADMAP.md` (Fase C, item C1) · depende de
`specs/fase-b-distance-axis.md` e `specs/fase-b2-sector-markers.md`
(Implementados). C2 (painel de insights) fica para um spec seguinte — depende
deste e juntar os dois passaria do limite de ~8 passos do AGENTS.md §5.

---

## FASE 1 — ESPECIFICAR

### 1. Problema
Hoje a aba Telemetria mostra os canais dos 2 pilotos lado a lado, mas o
usuário precisa inferir de cabeça "quem está ganhando tempo e onde" comparando
curvas de velocidade. Não existe uma métrica direta de quanto tempo um piloto
ganha ou perde ao longo da volta — a visão que mais aparece nas transmissões
de F1 (o "gráfico de delta").

### 2. Critério de sucesso
Com 2 pilotos selecionados numa volta real, aparece um gráfico "Delta" com uma
linha mostrando o tempo acumulado ganho/perdido a cada trecho da volta,
alinhado por distância, com um selo indicando a confiança do alinhamento.
(sim/não)

### 3. Escopo

**Dentro do escopo (item C1 do ROADMAP):**
- Cálculo do delta de tempo acumulado entre 2 pilotos, alinhado por distância
  (não por tempo — ver decisão de design)
- Gráfico dedicado (linha única + referência em zero), sempre no eixo de
  distância, com os marcadores de curva/setor sobrepostos
- Selo de confiança do alinhamento (alta/média/baixa)
- Estado vazio quando não há exatamente 2 pilotos com telemetria

**Fora do escopo (→ próximo spec, C2):**
- Painel de insights automáticos (frases geradas a partir do delta)
- Delta de mais de 2 pilotos

### 4. Restrições
- **Técnicas:** stack travada (AGENTS.md §2). Aditivo — não altera os 6
  canais + bateria existentes (regra do ROADMAP). O plano tem 5 passos.
- **De dados:** somente `car_data` já buscado das 2 voltas. Nenhuma chamada
  nova à OpenF1.
- **Dependências:** Fases B e B.2 (distância, curvas, setores).

---

## FASE 2 — PLANEJAR

### 5. Decisões de design

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Domínio de alinhamento | por tempo decorrido vs por distância percorrida | **Distância** | Comparar "no mesmo instante" não faz sentido fisicamente — os pilotos podem estar em pontos diferentes da pista no mesmo segundo. Distância é o único jeito de comparar "no mesmo lugar". |
| Eixo do gráfico de Delta | segue o toggle Tempo/Distância dos outros canais vs sempre distância | **Sempre distância**, independente do toggle | O cálculo só existe em distância (ver acima); alternar para "tempo" no delta não teria significado. |
| Interpolação tempo↔distância | amostra mais próxima (`nearestPointValue`) vs interpolação linear entre as 2 amostras vizinhas | **Interpolação linear** | O delta é uma métrica de precisão (segundos), então vale o custo extra de interpolar em vez de arredondar para a amostra mais próxima. |
| Fora do intervalo comum | extrapolar vs cortar no menor trecho comum | **Cortar** (grade vai só até `min(distância total A, distância total B)`) | Extrapolar seria inventar dado além do que foi medido (viola AGENTS.md §4). |
| Confiança do alinhamento | fixa vs calculada pela diferença de distância total das 2 voltas | **Calculada**: ≤3% de diferença = alta, ≤10% = média, acima = baixa | Voltas com muita diferença de distância total (pit, SC, off-track) tornam o alinhamento por distância menos confiável — o usuário precisa saber disso, não confiar cegamente no gráfico. |
| Piloto de referência (sinal do delta) | qualquer um vs sempre `traces[0]` | **`traces[0]`** | Mesma convenção já usada em curvas/setores/volta de referência. Delta positivo = segundo piloto mais lento que o de referência naquele ponto. |
| Marcadores de curva/setor no gráfico de Delta | não mostrar vs sempre mostrar | **Sempre mostrar** (reusa `trackMarkersLine` da Fase B/B.2) | Consistência visual e o motivo de existir o eixo por distância. Exige desacoplar o cálculo de curvas/setores do toggle Tempo/Distância (hoje calculado só em modo Distância) — os 6 canais + bateria continuam recebendo os marcadores só nesse modo (sem mudança de comportamento), o gráfico de Delta os recebe sempre. |
| Quando não há 2 pilotos | ocultar o gráfico sem aviso vs mensagem explicando | **Mensagem explicando** | Consistente com os outros estados vazios do app (ex: "selecione 2 pilotos"). |

### 6. Plano de implementação

1. `src/lib/delta.ts` puro: `computeDelta(samplesA, samplesB)` → pontos de
   delta (m, s) por grade de distância (10m) + selo de confiança. Interpola
   linearmente tempo×distância de cada piloto; corta no trecho comum. Testes:
   voltas idênticas → delta ≈0 e confiança alta; piloto B mais rápido → sinal
   correto; distâncias totais muito diferentes → confiança baixa; amostras
   vazias → resultado vazio sem lançar erro → verificar: `npm test` verde.
2. Desacoplar o cálculo de curvas/setores do toggle: calcular sempre
   (independente de `xAxisMode`), mas continuar repassando aos 6 canais +
   bateria só quando o modo for Distância (mesmo comportamento atual) →
   verificar: screenshot do modo Tempo idêntico ao estado antes deste passo
   (regressão).
3. Novo painel "Delta" (linha única + linha de referência em zero + selo de
   confiança), eixo sempre em metros, com os marcadores de curva/setor
   sempre visíveis, renderizado só quando há exatamente 2 pilotos com
   telemetria → verificar: Playwright — fixture com 2 pilotos próximos mostra
   delta pequeno; volta 11 (descompasso grande) mostra selo de confiança
   baixa/média.
4. Estado vazio: com 0 ou 1 piloto selecionado, mostrar nota explicando que o
   delta exige 2 pilotos, no lugar do gráfico → verificar: Playwright com 1
   piloto selecionado.
5. Regressão e fechamento: `npm run build` + suíte completa + screenshots das
   3 abas (Tempo e Distância inalterados nos 6 canais) + captura do gráfico
   de Delta → verificar: tudo verde; EARS da v1/Fase A/B/B.2 re-conferidos.

### 7. Perguntas em aberto
- [x] Nenhuma — decisões fechadas na seção 5.

### 8. Critérios de aceite (formato EARS)

- QUANDO exatamente 2 pilotos com telemetria estão selecionados, O SISTEMA
  DEVE exibir o gráfico de Delta com o tempo acumulado ganho/perdido por
  distância, com uma linha de referência em zero.
- QUANDO os marcadores de curva/setor estão disponíveis, O SISTEMA DEVE
  sobrepô-los no gráfico de Delta, independente do toggle Tempo/Distância dos
  outros 6 canais.
- QUANDO as duas voltas têm distância total muito diferente, O SISTEMA DEVE
  exibir um selo de confiança média ou baixa junto ao gráfico de Delta.
- QUANDO o toggle Tempo/Distância dos outros canais é alternado, O SISTEMA
  DEVE manter o gráfico de Delta e seu eixo inalterados (sempre em distância).
- QUANDO menos de 2 pilotos com telemetria estão selecionados (caso de erro),
  O SISTEMA DEVE exibir uma mensagem explicando que o delta exige 2 pilotos,
  sem quebrar a tela.

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
