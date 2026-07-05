# SPEC — Fase D.4: mini-setores de tamanho fixo no traçado colorido

**Status:** Implementado
**Criado em:** 2026-07-05
**Projeto:** TelemetriaF1
**Substitui/depende de:** `specs/ROADMAP.md` (extensão pós-D1, fora da
sequência original) · depende de `specs/fase-d2-track-coloring.md` e
`specs/fase-d3-track-labels.md` (ambos Implementados). Origem: usuário
mostrou uma referência externa (mapa de mini-setores de transmissão de F1,
imagem anexada na sessão) pedindo a mesma granularidade.

---

## FASE 1 — ESPECIFICAR

### 1. Problema
O traçado colorido (D.2) só oferece 2 granularidades — Setor (3 trechos
fixos) e Curva (1 trecho por curva/reta detectada). A imagem de referência
do usuário mostra um padrão de transmissão de F1 com muito mais trechos —
"mini-setores" de tamanho uniforme — que dão uma leitura mais fina de onde
exatamente um piloto ganhou ou perdeu tempo, sem depender da detecção
heurística de curvas nem dos 3 setores oficiais.

### 2. Critério de sucesso
Com 2 pilotos selecionados, o seletor de granularidade ganha uma 3ª opção
"Mini-setor" que divide o traçado em ~20 trechos de tamanho igual,
coloridos pelo piloto mais rápido em cada um (mesma lógica de empate/cor da
D.2). (sim/não)

### 3. Escopo

**Dentro do escopo:**
- `miniSectorSegments(maxM, count)` puro em `trackColoring.ts`: divide
  `[0, maxM]` em `count` trechos de tamanho igual (padrão `count = 20`,
  decisão do usuário: quantidade fixa, não distância fixa).
- 3ª opção "Mini-setor" no seletor de granularidade já existente
  (Setor ⇄ Curva ⇄ Mini-setor).
- Reusa 100% da lógica de coloração/empate/legenda já implementada na D.2 —
  só muda a função que gera os `boundaries`.

**Fora do escopo:**
- Trechos de distância física fixa (ex: sempre 200m) — decisão do usuário
  foi quantidade fixa, não distância fixa.
- Mudar o comportamento de Setor/Curva existentes.
- Marcadores numerados de mini-setor (tipo "MS1, MS2…") sobre o traçado —
  não foi pedido; os marcadores T1..Tn/S1-S3 da D.3 continuam sendo os
  únicos rótulos.

### 4. Restrições
- **Técnicas:** stack travada (AGENTS.md §2). Aditivo — nenhuma dependência
  nova, nenhuma mudança de dado. Plano de 3 passos (menor incremento desde
  o início da Fase D).
- **De dados:** nenhum dado novo — mesmos `car_data`/`location`/delta já
  buscados pela D.2.
- **Dependências:** D.2 (coloração) e D.3 (rótulos) — ambos Implementados.

---

## FASE 2 — PLANEJAR

### 5. Decisões de design

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Definição do mini-setor | distância física fixa (ex: 200m) vs quantidade fixa (ex: sempre 20) | **Quantidade fixa (20)** | Decisão explícita do usuário: tamanho visual previsível em qualquer circuito, mesmo que o tamanho físico de cada trecho varie por GP. |
| Nº de mini-setores | configurável vs fixo em 20 | **Fixo em 20** (constante `MINI_SECTOR_COUNT`) | Nenhum pedido de configurabilidade; 20 é o valor de referência da imagem/padrão de transmissão. Pode virar constante ajustável no código se o usuário pedir depois — não expor UI para isso agora (AGENTS.md §4: não construir configurabilidade não pedida). |
| Reuso da lógica de coloração | nova função de cor vs reusar `colorSegments` | **Reusar `colorSegments`** sem alteração | A função já é agnóstica de como os `boundaries` foram gerados; só precisa de uma lista de `{startM, endM}` — mini-setor é só mais uma forma de gerar essa lista, mesmo padrão de `sectorSegments`/`cornerSegments`. |
| Trechos residuais (último trecho menor que os outros, se `maxM` não é múltiplo de 20) | erro vs aceitar trecho final desigual | **Aceitar** — o último trecho vai de `19 × (maxM/20)` até `maxM` exato, podendo ter um comprimento ligeiramente diferente dos demais por arredondamento | Simplicidade; a diferença é imperceptível visualmente e não vale complexidade extra. |

### 6. Plano de implementação

1. `src/lib/trackColoring.ts`: `miniSectorSegments(maxM, count = 20)` puro
   → `SegmentBoundary[]` com `count` trechos de tamanho igual
   (`maxM / count` cada); `maxM <= 0` ou `count <= 0` → `[]`, sem lançar →
   verificar: teste com `maxM=1000, count=20` → 20 trechos de 50m cada;
   `count=1` → 1 trecho igual a `[0, maxM]`; `maxM<=0` → `[]`.
2. `TrackMapView`: estender `Granularity` para `'sector' | 'corner' |
   'miniSector'`; 3º botão "Mini-setor" no `axisToggle` existente; passar
   `miniSectorSegments(maxM, 20)` para `colorSegments` quando selecionado →
   verificar: `npm test` verde (sem teste de UI novo neste passo — reuso do
   que já existe).
3. Regressão e fechamento: `npx tsc --noEmit` + `npm run build` + suíte
   completa + `npx oxlint` + Playwright — 2 pilotos, alternar para
   "Mini-setor" → ~20 trechos coloridos; Setor/Curva continuam idênticos ao
   comportamento atual; 0/1 piloto inalterado (D.1/D.3 preservados) →
   verificar: tudo verde.

### 7. Perguntas em aberto
- [x] Nenhuma — quantidade fixa (20) confirmada pelo usuário.

### 8. Critérios de aceite (formato EARS)

- QUANDO 2 pilotos com telemetria estão selecionados E o usuário escolhe
  "Mini-setor" no seletor, O SISTEMA DEVE dividir o traçado em ~20 trechos
  de tamanho igual, coloridos pelo piloto mais rápido em cada um.
- QUANDO o usuário alterna entre Setor, Curva e Mini-setor, O SISTEMA DEVE
  re-segmentar o traçado imediatamente, mantendo a mesma lógica de trecho
  neutro/"Empate" já usada nas outras 2 granularidades.
- QUANDO 0 ou 1 piloto está selecionado, O SISTEMA DEVE manter o
  comportamento atual (sem seletor, traçado neutro único — D.1/D.3
  inalterados).

### Ações destrutivas ou irreversíveis nesta feature?
[x] Não
[ ] Sim

---

## FASE 3 — APROVAÇÃO

**Aprovado por:** Nickolas (nickolasnfd)
**Data:** 2026-07-05
**Observações da revisão:** aprovado sem alterações ("Pode prosseguir").

---

## FASE 5 — VALIDAÇÃO (preencher após implementar)

### 9. Registro de validação

| Critério de aceite | Resultado | Como foi testado |
|--------------------|-----------|------------------|
| Seletor ganha "Mini-setor", ~20 trechos coloridos | ✅ | `npm test` (`miniSectorSegments`, 3 casos) + Playwright `?mock=1`: 3 (Setor) → 20 (Mini-setor) `<path>` |
| Alternar Setor/Curva/Mini-setor re-segmenta, mesma lógica de empate | ✅ | Playwright: troca imediata de contagem de paths; legenda "Empate" continua funcionando (reusa `colorSegments` sem alteração) |
| 0/1 piloto inalterado | ✅ | Regressão nas 4 abas sem erros; D.1/D.3 preservados (mesmo código-caminho, não tocado) |

**Regressões verificadas:** `npx tsc --noEmit`, `npm run build`, `npx oxlint` limpos.
`npm test` 104/104. Playwright confirmou as 4 abas sem erros; screenshot do modo
Mini-setor visualmente equivalente à imagem de referência do usuário.

**Desvios do plano:** nenhum.

**Aprendizados → LEARNINGS.md:** nenhum erro novo.

**Validação do usuário (dados reais):** "Deu certo." Fase D.4 fechada.
