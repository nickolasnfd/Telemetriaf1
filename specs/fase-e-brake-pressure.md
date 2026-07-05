# SPEC — Fase E: canal de freio com pressão estimada (toggle On/Off ⇄ Pressão)

**Status:** Em revisão
**Criado em:** 2026-07-05
**Projeto:** TelemetriaF1
**Substitui/depende de:** `specs/ROADMAP.md` (Fase E, item E1 — último item
da sequência original) · depende de `specs/battery-estimate.md`
(Implementado, mesmo padrão de modelo físico + rótulo de estimativa).

---

## FASE 1 — ESPECIFICAR

### 1. Problema
O canal "Freio" na aba Telemetria só mostra o sinal binário real da OpenF1
(`car_data.brake`: 0 ou 100 — freando/solto). Isso não distingue uma
frenagem leve de uma frenagem forte, informação que ajuda a comparar como
cada piloto ataca a mesma curva — o mesmo tipo de lacuna que a bateria
preenchia para energia.

### 2. Critério de sucesso
No canal "Freio" da aba Telemetria, um toggle "On/Off ⇄ Pressão" alterna
entre o binário atual (padrão, comportamento preservado) e uma curva 0–100%
de pressão estimada, com o pico de 100% na frenagem mais forte da volta e
o rótulo "(estimativa)" visível quando esse modo está ativo. (sim/não)

### 3. Escopo

**Dentro do escopo:**
- Módulo de modelo físico puro (entrada: amostras de `car_data`; saída:
  série de pressão de freio estimada por amostra, 0–100%).
- Toggle "On/Off ⇄ Pressão" no canal Freio, com **On/Off como padrão**
  (comportamento atual 100% preservado — regra invariante do ROADMAP).
- Rótulo "(estimativa)" no nome do canal + nota de rodapé com as premissas
  do modelo, visíveis só quando o modo Pressão está ativo (mesmo padrão já
  aprovado na bateria).
- Testes unitários do modelo.

**Fora do escopo (→ BACKLOG.md):**
- Calibração por circuito/carro (ponto de bloqueio de pneu, balanço de
  freio dianteiro/traseiro) — não há dado pra isso.
- Persistir a escolha do toggle entre sessões/pilotos (reinicia em On/Off
  a cada carregamento, mesmo padrão do toggle Tempo/Distância).

### 4. Restrições
- **Técnicas:** stack travada (AGENTS.md §2); cálculo 100% no cliente, sem
  chamada nova à API (usa o `car_data` já buscado por volta). Plano de 4
  passos.
- **De dados:** entrada tem só `speed`/`brake` a ~3,7 Hz; `brake` é binário
  (0/100, confirmado em `specs/battery-estimate.md` §4). O resultado é
  ESTIMATIVA e a UI nunca pode apresentá-lo como dado real — mesma regra
  dura da bateria.
- **Dependências:** aba Telemetria existente; canal Freio atual (binário)
  continua como padrão.

---

## FASE 2 — PLANEJAR

### 5. Decisões de design

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Referência de "100% de pressão" | constante física absoluta (ex: assumir X m/s² de desaceleração máxima) vs relativa ao pico da própria volta | **Relativa ao pico de desaceleração DENTRO da mesma volta** | Diferente da bateria (que tinha fonte externa pra deploy/capacidade regulamentar — formula1.com/FIA), não existe fonte confiável pra calibrar um "100%" absoluto de pressão de freio. Inventar uma constante não verificada violaria AGENTS.md §4. Usar o próprio pico da volta como referência 100% ainda mostra a dinâmica relativa (frenagem forte vs leve) sem alegar um valor físico absoluto. |
| Quando a pressão é > 0 | sempre que há desaceleração vs só quando o sinal binário real de freio (`brake`) está ativo | **Só quando `brake > 0`** (dado real da OpenF1) | Ancora o "quando houve frenagem" no dado real, não numa suposição; desaceleração também acontece em downshift/arrasto do motor sem o piloto frear. Só a "intensidade" é estimada — mais honesto que inferir o próprio evento de frenagem. |
| Cálculo da desaceleração | diferença simples de velocidade entre amostras consecutivas vs suavização/filtro | **Diferença simples** (`Δv/Δt`), sem suavização | Amostragem ~3,7 Hz já é fina; suavização é complexidade não pedida (AGENTS.md §4 — menor mudança que resolve). Mesmo espírito de simplicidade do `batteryModel`. |
| Volta sem nenhuma frenagem real (`brake` sempre 0) | erro vs pressão 0% constante | **0% constante, sem dividir por zero** | A função deve ser total e nunca lançar; ausência de frenagem é um resultado válido, não uma falha. |
| Toggle | reusar o toggle Tempo/Distância existente vs um novo, dedicado ao canal Freio | **Novo toggle, só no canal Freio** ("On/Off" ⇄ "Pressão"), com **On/Off como padrão** | Regra invariante do ROADMAP: alteração em tela existente só atrás de toggle que preserva o comportamento atual como padrão — mesmo tratamento dado ao eixo Tempo/Distância (Fase B). É uma escolha ortogonal ao eixo, então é um controle próprio, não reaproveita o mesmo estado. |
| Rótulo de estimativa | só no nome do canal vs nome + nota de rodapé | **Nome do canal + nota de rodapé**, visíveis só no modo Pressão | Mesmo padrão já aprovado pelo usuário na bateria; no modo On/Off (padrão) nada muda, preservando o canal atual ao pé da letra. |

### 6. Plano de implementação

1. `src/lib/brakeModel.ts` puro: `estimateBrakePressure(samples) →
   Array<{ date: string; pressurePct: number }>` — calcula desaceleração
   por amostra (`Δv/Δt`, convertido pra m/s²); acha o pico de desaceleração
   entre as amostras com `brake > 0`; normaliza `pressurePct = 100 ×
   decel/pico` (clamp 0–100) nessas amostras, `0` nas demais → verificar:
   testes unitários — perfil sintético com 1 pico de frenagem conhecido →
   100% exato no pico, proporção correta nos outros pontos com freio ativo;
   volta sem nenhuma amostra com `brake > 0` → tudo 0%, sem lançar; amostras
   vazias → `[]`.
2. `TelemetryView`: novo estado local `brakeMode: 'onoff' | 'pressure'`
   (padrão `'onoff'`); toggle "On/Off ⇄ Pressão" no canal Freio (mesmo
   estilo visual do `axisToggle` já usado no eixo Tempo/Distância); no modo
   Pressão, o canal usa `estimateBrakePressure` no lugar do `s.brake` cru,
   com `step: false` (curva contínua) em vez de `step: true` (binário) →
   verificar: `npm test` verde (sem teste de UI novo neste passo).
3. Rótulo "(estimativa)" no nome do canal + nota de rodapé com as premissas
   do modelo (mesmo padrão da bateria), visíveis só quando `brakeMode ===
   'pressure'` → verificar: Playwright `?mock=1` — modo On/Off sem rótulo
   nem nota (idêntico ao atual); modo Pressão com rótulo + nota visíveis.
4. Regressão e fechamento: `npx tsc --noEmit` + `npm run build` + suíte
   completa + `npx oxlint` + Playwright — modo padrão (On/Off) pixel-a-pixel
   igual ao comportamento pré-feature; modo Pressão com curva 0–100% e pico
   nas frenagens fortes; 2 pilotos sobrepostos nas mesmas cores; demais
   abas/canais inalterados → verificar: tudo verde; EARS da v1 re-conferidos.

### 7. Perguntas em aberto
- [x] Nenhuma — decisões fechadas na seção 5 (referência relativa ao pico
  da volta evita a necessidade de uma fonte externa, ao contrário da
  bateria).

### 8. Critérios de aceite (formato EARS)

- QUANDO o canal de freio está no modo padrão (On/Off), O SISTEMA DEVE
  manter o comportamento atual — binário, sem rótulo de estimativa nem nota
  de rodapé (regressão).
- QUANDO o usuário alterna o toggle do canal de freio para "Pressão", O
  SISTEMA DEVE exibir uma curva 0–100% estimada, com 100% na frenagem mais
  forte da volta.
- QUANDO o modo "Pressão" está ativo, O SISTEMA DEVE exibir o rótulo
  "(estimativa)" no nome do canal e uma nota de rodapé com as premissas do
  modelo.
- QUANDO 2 pilotos estão selecionados no modo Pressão, O SISTEMA DEVE
  sobrepor as duas curvas estimadas nas mesmas cores dos demais canais.
- QUANDO a volta não tem nenhuma amostra com o sinal binário de freio ativo
  (caso de erro/vazio), O SISTEMA DEVE mostrar a curva de pressão em 0%
  constante, sem dividir por zero nem quebrar a tela.

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
