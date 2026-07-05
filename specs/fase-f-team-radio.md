# SPEC — Fase F: aba "Rádio" (rádio de equipe)

**Status:** Aprovado
**Criado em:** 2026-07-05
**Projeto:** TelemetriaF1
**Substitui/depende de:** `specs/ROADMAP.md` (item novo, fora da sequência
original — atualiza `specs/BACKLOG.md`, que já tinha "Rádio de equipe" com a
ressalva "cobertura da F1 caiu muito em 2026"). Nenhuma dependência de outra
feature.

---

## FASE 1 — ESPECIFICAR

### 1. Problema
O app não expõe o rádio de equipe, um dos poucos dados "de contexto humano"
da sessão (o resto é tudo numérico/telemetria). A OpenF1 tem o endpoint
`team_radio` (clipes de áudio por piloto/momento) que nunca foi tocado.

### 2. Critério de sucesso
Com uma sessão selecionada, uma aba nova "Rádio" lista os clipes de rádio
daquela sessão, em ordem cronológica, cada um com piloto, horário e um
player de áudio que toca o clipe. (sim/não)

### 3. Escopo

**Dentro do escopo:**
- Endpoint novo `team_radio` na camada de API: tipo, hook de query
  (filtrado por sessão, como `weather`/`race_control` — não precisa de
  janela de tempo nem piloto, volume baixo por sessão), fixture `?mock=1`.
- Aba nova "Rádio": lista cronológica de clipes, cada um com chip do
  piloto (cor de equipe, como já usado em outras abas), horário
  (`formatClock`, já existe) e `<audio controls>` apontando pro
  `recording_url`.
- Estado vazio quando a sessão não tem nenhum clipe (esperado ser comum,
  ver ressalva do BACKLOG sobre cobertura baixa em 2026) e estado de erro
  de rede, no padrão já usado (`Feedback`).
- Lista não é filtrada pela seleção de piloto (`state.drivers`) — mostra
  todos os clipes da sessão, mesmo padrão da aba Sessão (Clima/Direção de
  prova, que também independem de piloto selecionado).

**Fora do escopo:**
- Transcrição de texto do áudio (a OpenF1 não fornece; fora de escopo por
  não existir o dado — AGENTS.md §4, nunca inventar dado).
- Filtro por piloto na UI (poderia vir depois se o volume de clipes for
  alto; não pedido agora).
- Sincronizar o rádio com o gráfico de telemetria/replay (ex: "toca o rádio
  no momento X da volta") — feature separada, maior escopo.

### 4. Restrições
- **Técnicas:** stack travada (AGENTS.md §2). Aditivo — aba nova, nenhuma
  dependência nova (`<audio>` é HTML nativo). Plano de 4 passos.
- **De dados:** endpoint novo `team_radio` da OpenF1 (`session_key`,
  `meeting_key`, `driver_number`, `date`, `recording_url`) — schema
  espelhado da doc oficial, mesmo padrão dos outros tipos. **Suposição
  explícita (a validar com dado real, AGENTS.md §4):** a cobertura pode ser
  baixa ou nula em muitas sessões de 2026 (já registrado no BACKLOG); o
  estado vazio da aba assume isso como caso normal, não como erro.
- **Dependências:** nenhuma.

---

## FASE 2 — PLANEJAR

### 5. Decisões de design

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Local da feature | aba nova "Rádio" vs painel dentro da aba Sessão | **Aba nova** (decisão do usuário) | Consistente com o padrão de 1 aba por tipo de dado já usado (Voltas/Telemetria/Sessão/Traçado). |
| Filtro por piloto | reusar `state.drivers` (como Telemetria/Traçado) vs mostrar tudo | **Mostrar tudo, sem filtro** | Rádio é dado de sessão inteira (como Clima/Direção de prova), não uma comparação entre 2 pilotos; filtrar reduziria o que já deve ser um volume baixo de clipes. |
| Busca de dados | filtrar por sessão + piloto + janela (como `car_data`) vs só por sessão | **Só por sessão** | `team_radio` não tem o volume de `car_data`/`location` (poucos clipes por sessão inteira); filtrar por piloto/janela seria restrição desnecessária (AGENTS.md §9 exige filtro forte só onde o volume exige). |
| Player de áudio | biblioteca de player customizado vs `<audio controls>` nativo | **`<audio controls>` nativo** | Menor mudança que resolve (AGENTS.md §4); zero dependência nova; suporte nativo a play/pause/volume/seek em todos os navegadores modernos. |
| Sessão sem nenhum clipe | tratar como erro vs estado vazio normal | **Estado vazio normal**, com nota explicando a baixa cobertura | Já é um caso esperado (BACKLOG), não uma falha; tratar como erro seria alarmar o usuário à toa. |

### 6. Plano de implementação

1. Camada de API: adicionar `TeamRadio` a `types.ts` (`session_key`,
   `meeting_key`, `driver_number`, `date`, `recording_url`) e
   `useTeamRadio(sessionKey)` em `queries.ts` (mesmo padrão de
   `useRaceControl` — só filtro de sessão, ordenado por `date`); estender a
   fixture `mock.ts` com um `case 'team_radio'` retornando 2-3 clipes
   sintéticos (URL fictícia, ex: `https://example.invalid/radio/...`) →
   verificar: `npm test` verde, incluindo teste novo em `mock.test.ts`
   confirmando ordenação por data e filtro por sessão.
2. Aba nova "Rádio": adicionar `'radio'` à união `View` (`urlState.ts`) e à
   lista `TABS` (`App.tsx`); novo componente `RadioView` que busca
   `useTeamRadio(state.session)` e renderiza a lista → verificar:
   Playwright `?mock=1` — aba "Rádio" lista os clipes da fixture, cada um
   com chip de piloto + horário + elemento `<audio>` com `src` correto.
3. Estados vazio/erro: sessão sem clipes → nota explicando a baixa
   cobertura (não como erro); falha de rede → `ErrorBox` padrão →
   verificar: Playwright — sessão fictícia sem `team_radio` mostra a nota,
   não uma tela quebrada.
4. Regressão e fechamento: `npx tsc --noEmit` + `npm run build` + suíte
   completa + `npx oxlint` + Playwright nas 5 abas (as 4 existentes
   inalteradas + Rádio nova) → verificar: tudo verde; EARS da v1/D
   re-conferidos.

### 7. Perguntas em aberto
- [x] Nenhuma — decisões fechadas na seção 5.

### 8. Critérios de aceite (formato EARS)

- QUANDO uma sessão está selecionada e tem clipes de rádio, O SISTEMA DEVE
  listar os clipes na aba "Rádio" em ordem cronológica, cada um com piloto,
  horário e player de áudio.
- QUANDO o usuário clica em play num clipe, O SISTEMA DEVE reproduzir o
  áudio via `<audio controls>` nativo, apontando pro `recording_url` da
  OpenF1.
- QUANDO a sessão não tem nenhum clipe de rádio (caso esperado, não erro),
  O SISTEMA DEVE exibir uma mensagem explicando a ausência, sem quebrar a
  tela.
- QUANDO a requisição de `team_radio` falha na rede (caso de erro), O
  SISTEMA DEVE exibir o estado de erro padrão do app.
- QUANDO o usuário alterna para as abas Voltas/Telemetria/Sessão/Traçado, O
  SISTEMA DEVE mantê-las idênticas ao comportamento atual (feature
  puramente aditiva).

### Ações destrutivas ou irreversíveis nesta feature?
[x] Não
[ ] Sim

---

## FASE 3 — APROVAÇÃO

**Aprovado por:** Nickolas (nickolasnfd)
**Data:** 2026-07-05
**Observações da revisão:** aprovado sem alterações ("Ok").

---

## FASE 5 — VALIDAÇÃO (preencher após implementar)

### 9. Registro de validação

| Critério de aceite | Resultado | Como foi testado |
|--------------------|-----------|------------------|
|                    | ✅ / ❌   |                  |

**Regressões verificadas:**
**Desvios do plano:**
**Aprendizados → LEARNINGS.md:**
