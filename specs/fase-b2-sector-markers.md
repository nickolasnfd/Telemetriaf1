# SPEC — Fase B.2: marcadores de setor (S1/S2/S3)

**Status:** Aprovado
**Criado em:** 2026-07-04
**Projeto:** TelemetriaF1
**Substitui/depende de:** ajuste sobre `specs/fase-b-distance-axis.md`
(Implementado) — reusa a fundação de distância e o mecanismo de markLine

---

## FASE 1 — ESPECIFICAR

### 1. Problema
O modo Distância já marca as curvas (T1, T2…), mas não mostra os limites de
setor da pista (S1/S2/S3). Sem eles, é difícil relacionar o que se vê na
telemetria com os tempos de setor — a divisão de referência que a própria F1
usa para comparar desempenho por trecho.

### 2. Critério de sucesso
No modo Distância da aba Telemetria, além dos marcadores de curva, aparecem
marcadores de setor (S1, S2, S3) visualmente distintos das curvas, posicionados
nos limites de setor da volta de referência. (sim/não)

### 3. Escopo

**Dentro do escopo:**
- Cálculo da posição (em metros) dos limites de setor a partir dos tempos de
  setor da volta de referência (`duration_sector_1/2/3` + `date_start`),
  convertidos para distância pela mesma trilha de distância da Fase B
- Marcadores verticais de setor sobrepostos nos 7 gráficos (só no modo
  Distância), com estilo distinto do das curvas e rótulo S1/S2/S3

**Fora do escopo (→ BACKLOG / fases futuras):**
- Marcadores de setor no modo Tempo (possível adição futura — em tempo os
  limites são triviais, mas foge da consistência com as curvas)
- Bandas coloridas por setor (markArea) — só linhas nesta versão
- Números oficiais de curva (segue heurístico, como na Fase B)

### 4. Restrições
- **Técnicas:** stack travada (AGENTS.md §2). Aditivo; o comportamento do modo
  Tempo e o padrão da tela continuam intactos (regra invariante do ROADMAP).
- **De dados:** somente `laps` e `car_data` já buscados. Nenhuma chamada nova.
  Distinção de honestidade: o TEMPO de setor é dado REAL (cronometragem
  oficial); só a POSIÇÃO em metros é aproximada (deriva da integração de
  velocidade da Fase B) — diferente das curvas, que são 100% heurísticas.
- **Dependências:** Fase B (distância + markLine).

---

## FASE 2 — PLANEJAR

### 5. Decisões de design

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Origem dos limites | detectar por telemetria vs usar tempos de setor oficiais | **Tempos de setor oficiais** (`duration_sector_*`) convertidos para distância | São dado real da cronometragem; muito mais confiáveis que qualquer heurística. |
| Conversão tempo→distância | interpolar vs amostra mais próxima | **Amostra `car_data` mais próxima do instante do limite** | Simples e suficiente na resolução de ~3,7 Hz; sem complexidade de interpolação. |
| Piloto de referência | por piloto vs `traces[0]` | **`traces[0]`** (mesma convenção das curvas e da volta) | Um conjunto único de setores evita marcadores conflitantes. |
| Estilo vs curvas | igual vs distinto | **Distinto**: linha sólida em cor de acento (não a cinza tracejada das curvas), rótulo S1/S2/S3 | Precisa diferenciar claramente setor de curva à primeira vista. |
| Onde renderizar rótulo | todos os gráficos vs só velocidade | **Linhas nos 7, rótulo só na velocidade** | Mesma regra das curvas — alinhamento em todos, texto sem poluir. |
| Combinar com as curvas | markLine separada vs itens no mesmo markLine | **Mesmo markLine, itens com estilo próprio por item** | Uma série só aceita um markLine; ECharts permite `lineStyle`/`label` por item de dado. |
| Rótulo do S1 | omitir vs linha em x=0 | **Linha em x=0 rotulada "S1"** | Deixa os 3 setores explicitamente nomeados; a linha coincide com o eixo Y (aceitável). |

### 6. Plano de implementação

1. `src/lib/sectors.ts` puro: `sectorBoundaries(lap, sampleDatesMs, distances)`
   → `[{sector, distanceM}]` (S1=0; S2/S3 na amostra mais próxima do tempo de
   setor acumulado). Testes: volta normal de 3 setores; durações nulas → `[]`;
   `date_start` nulo → `[]`; limite mapeia para a amostra correta → verificar:
   `npm test` verde.
2. Generalizar o `cornerMarkLine` da TelemetryView para desenhar curvas +
   setores no mesmo markLine (estilo próprio por item); computar os setores
   sobre `traces[0]` em modo Distância e passá-los aos gráficos → verificar:
   Playwright — linhas S1/S2/S3 visíveis, distintas das curvas, alinhadas nos
   7 gráficos; rótulo só na velocidade.
3. Nota de rodapé: ampliar a nota do modo Distância para esclarecer que os
   tempos de setor são reais mas a posição em metros é aproximada →
   verificar: texto visível em modo Distância.
4. Regressão e fechamento: `npm run build` + suíte completa + screenshots das
   3 abas (Tempo idêntico ao atual; Distância com curvas + setores) →
   verificar: tudo verde; EARS re-conferidos.

### 7. Perguntas em aberto
- [x] Nenhuma — decisões fechadas na seção 5.

### 8. Critérios de aceite (formato EARS)

- QUANDO o modo Distância está ativo, O SISTEMA DEVE exibir marcadores de setor
  (S1, S2, S3) nos limites de setor da volta de referência, visualmente
  distintos dos marcadores de curva.
- QUANDO o usuário passa o mouse/toca, O SISTEMA DEVE manter os valores da
  caixa corretos (marcadores de setor não interferem no tooltip).
- QUANDO o modo Tempo está ativo, O SISTEMA DEVE NÃO exibir marcadores de setor
  (nem de curva), preservando o comportamento atual.
- QUANDO a volta de referência não tem tempos de setor (nulos — caso de erro),
  O SISTEMA DEVE exibir o eixo de distância e as curvas normalmente, sem
  marcadores de setor e sem quebrar.

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
| Marcadores S1/S2/S3 distintos das curvas em modo Distância | ✅ | Screenshot: linha sólida vermelha (setor) vs tracejada cinza (curva) |
| Valores da caixa continuam corretos com os marcadores | ✅ | markLine é `silent: true`, não interfere no tooltip; suíte de tooltip intacta |
| Modo Tempo não mostra marcadores (nem curva nem setor) | ✅ | Screenshot pixel-idêntico ao estado anterior à Fase B.2 |
| Sem tempos de setor → sem marcadores de setor, sem quebrar | ✅ | `sectorBoundaries` retorna `[]` para campos nulos (testado unitariamente) |

**Regressões verificadas:** suíte completa 66/66 (5 novos: sectors.ts); build
verde; abas Voltas e Sessão re-testadas via screenshot, idênticas; mobile
375px sem overflow em modo Distância com curvas+setores.
**Desvios do plano:** nenhum.
**Aprendizados → LEARNINGS.md:** nenhum erro novo.
