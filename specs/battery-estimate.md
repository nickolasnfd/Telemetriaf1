# SPEC — Canal "Bateria (estimativa)" na telemetria

**Status:** Em revisão
**Criado em:** 2026-07-03
**Projeto:** TelemetriaF1
**Substitui/depende de:** `specs/f1-telemetry-interface.md` (Implementado)

---

## FASE 1 — ESPECIFICAR

### 1. Problema
A gestão de energia é central nas corridas de 2026 (MGU-K de 350 kW), mas a
F1 decidiu não publicar dados reais de ERS/bateria em nenhuma fonte (ver
LEARNINGS 2026-07-03). O usuário quer acompanhar a dinâmica de bateria e hoje
não vê nada — nem estimado.

### 2. Critério de sucesso
Na aba Telemetria de uma volta real, aparece um 6º canal "Bateria (estimativa)"
em 0–100% que decresce em aceleração plena e cresce sob frenagem, com o rótulo
de estimativa visível sem interação. (sim/não)

### 3. Escopo

**Dentro do escopo:**
- Módulo de modelo físico puro (entrada: amostras de `car_data`; saída: série
  de estado de carga estimado por amostra)
- 6º canal no empilhado da aba Telemetria, para os mesmos 1–2 pilotos da volta
- Rótulo "(estimativa)" no título do canal + nota de rodapé com as premissas
- Testes unitários do modelo

**Fora do escopo (→ BACKLOG.md):**
- Estimativa ao longo da corrida inteira (multi-volta, estratégia de energia)
- MGU-K Override do carro perseguidor, zonas de 250 kW, recarga via motor
- Calibração por circuito (limite de recuperação por volta variável da FIA)

### 4. Restrições
- **Técnicas:** stack travada (AGENTS.md §2); cálculo 100% no cliente, sem
  chamadas novas à API (usa o `car_data` já buscado por volta).
- **De dados:** entrada tem só speed/throttle/brake/gear/DRS a ~3,7 Hz; brake
  é binário (0/100). O resultado é ESTIMATIVA e a UI nunca pode apresentá-lo
  como dado real — regra dura desta feature.
- **Dependências:** aba Telemetria existente.

---

## FASE 2 — PLANEJAR

### 5. Decisões de design

Parâmetros do modelo (regulamento 2026, com fontes; ver também BACKLOG):

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Potência de deploy | 350 kW fixo vs 350/250 kW por zona | **350 kW × (throttle/100) × taper** | Zonas de 250 kW não são identificáveis sem dado da FIA; simplificação documentada. Fonte: formula1.com/FIA (MGU-K 350 kW). |
| Taper de velocidade | ignorar vs linear 290→355 km/h | **Linear: fator 1 até 290 km/h, 0 a 355 km/h** | Regulamento 2026 corta deploy em alta velocidade; sem isso a reta drenaria irrealisticamente. Fonte: formula1.com. |
| Recuperação | proporcional vs fixa sob frenagem | **350 kW enquanto brake=100, com teto de 8,5 MJ/volta** | `brake` é binário no car_data; MGU-K recupera até a potência nominal. Teto por volta do regulamento (~8,5 MJ, varia por pista — simplificação documentada). |
| Capacidade útil | — | **4 MJ (cap regulamentar, inalterado em 2026)** | Fonte: batterydesign.net/regulamento FIA. |
| Carga inicial da volta | 0% vs 50% vs 100% | **100% (4 MJ) — SUPOSIÇÃO EXPLÍCITA** | O SoC real no início da volta é desconhecido; 100% + clamp [0,4 MJ] mostra a *dinâmica* corretamente ainda que o nível absoluto seja incerto. Documentado na nota da UI. |
| Exibição | MJ vs % | **% (0–100), tooltip com MJ** | Leitura imediata; MJ no tooltip para quem quiser o número físico. |

### 6. Plano de implementação

1. `src/lib/batteryModel.ts`: função pura `estimateBattery(samples) → [{date, socPct, socMJ}]` com os parâmetros acima + testes unitários (drena no deploy, recupera na frenagem, clamp 0/100%, taper >290 km/h, teto de 8,5 MJ/volta) → verificar: `npm test` verde com os casos novos.
2. TelemetryView: 6º canal "Bateria (estimativa)" (linha 0–100%, tooltip com % e MJ) + nota de rodapé com premissas do modelo → verificar: fixture renderiza o canal caindo nas retas e subindo nas frenagens (screenshot Playwright).
3. Build + suíte completa + push na branch → verificar: `npm run build` e todos os testes verdes; após merge, usuário confere o canal com volta real no site.

### 7. Perguntas em aberto
- [x] Nenhuma — parâmetros fixados com fontes na seção 5; incertezas viraram
  suposições explícitas documentadas.

### 8. Critérios de aceite (formato EARS)

- QUANDO uma volta com telemetria é exibida, O SISTEMA DEVE mostrar o canal
  "Bateria (estimativa)" em escala 0–100% com o rótulo "(estimativa)" visível
  sem interação.
- QUANDO o piloto está em aceleração plena abaixo de 290 km/h, a curva DEVE
  decrescer.
- QUANDO o piloto freia, a curva DEVE crescer (respeitando o teto de 100%).
- QUANDO dois pilotos estão selecionados, O SISTEMA DEVE sobrepor as duas
  estimativas com as mesmas cores dos demais canais.
- QUANDO `car_data` está vazio ou em erro (caso de erro), O SISTEMA DEVE
  manter o comportamento atual (mensagem de vazio/erro) sem canal de bateria.

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
