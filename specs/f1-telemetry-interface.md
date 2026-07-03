# SPEC — Interface de telemetria de F1 (v1)

**Status:** Draft
**Criado em:** 2026-07-03
**Projeto:** TelemetriaF1
**Substitui/depende de:** —

---

## FASE 1 — ESPECIFICAR

### 1. Problema
Os dados de telemetria e de sessão da F1 existem gratuitamente na OpenF1 API,
mas só em formato de API crua (JSON). Hoje não há como explorá-los sem escrever
código a cada consulta. O custo: cada curiosidade pós-corrida ("onde o piloto X
ganhou tempo?") morre sem resposta ou exige montar scripts manualmente.

### 2. Critério de sucesso
Usuário abre a URL pública, seleciona ano → GP → sessão já encerrada, escolhe
um piloto e uma volta, e vê o gráfico de velocidade/acelerador/freio/marcha/DRS
daquela volta em menos de 10 segundos. (sim/não)

### 3. Escopo

**Dentro do escopo:**
- Seletor de sessão: ano → GP (meeting) → sessão (treinos/quali/sprint/corrida)
- Telemetria do carro por volta (velocidade, acelerador, freio, marcha, DRS),
  com comparação lado a lado de até 2 pilotos na mesma volta
- Tempos de volta: gráfico de evolução por piloto + stints de pneu e pit stops
- Painel da sessão: clima (temperatura pista/ar, chuva, vento) e mensagens da
  direção de prova (bandeiras, safety car, investigações)
- Interface em pt-BR, funcional no celular

**Fora do escopo (explicitamente NÃO incluído — ideias vão para BACKLOG.md):**
- Posições/gaps durante a corrida
- Rádio de equipe
- Dados ao vivo
- Classificação do campeonato
- Comparação entre corridas
- Login/contas

### 4. Restrições
- **Técnicas:** stack travada no AGENTS.md seção 2 (Vite+React+TS, sem backend,
  GitHub Pages). Todas as chamadas saem do navegador → a API precisa aceitar
  CORS (OpenF1 aceita).
- **De dados:** somente OpenF1 (endpoints: meetings, sessions, drivers, laps,
  stints, pit, car_data, weather, race_control). Sem chave. Dados disponíveis
  só após a sessão. Nenhuma migration (não há banco).
- **Dependências:** nenhuma feature anterior; primeiro spec do projeto.

---

## FASE 2 — PLANEJAR

### 5. Decisões de design
> Escolhas de implementação que valem registrar ANTES de codificar: estrutura de dados, endpoints, componentes, fluxo. Se há duas abordagens viáveis, listar ambas com tradeoffs e marcar a escolhida. NEVER escolher silenciosamente.

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| [a preencher na Fase 2] | | | |

### 6. Plano de implementação
> Passos numerados, cada um com verificação binária. Um passo = uma unidade validável antes de seguir. Máximo ~8 passos — acima disso, dividir em dois specs.

1. [a preencher na Fase 2]

### 7. Perguntas em aberto
> O spec NEVER pode receber status `Aprovado` com perguntas abertas sem resposta.

- [ ] Biblioteca de gráficos (será decidida na Fase 2 com tradeoffs)

### 8. Critérios de aceite (formato EARS)
> Sintaxe: QUANDO <gatilho>, O SISTEMA DEVE <resposta observável>.
> Cada critério deve ser testável por uma pessoa sem ler o código.

- [a preencher na Fase 2]

### Ações destrutivas ou irreversíveis nesta feature?
[x] Não (deploy/Pages entra na lista de aprovação do AGENTS.md seção 6)
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
