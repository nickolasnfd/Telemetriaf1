# PROMPTS — prompts prontos por momento do ciclo

> Copie e cole o bloco correspondente no início da sessão do agente.
> Texto entre [colchetes] é para você preencher antes de enviar.

---

## 1. Instalar o harness em um projeto novo (bootstrap)

```
Este projeto vai adotar o spec harness que está em [CAMINHO/REPO do
harness-template]. Faça o seguinte:

1. Copie AGENTS.md, VISION.md, PROMPTS.md e a pasta specs/ do template para a
   raiz deste projeto (não copie o README.md do template).
2. Renomeie specs/ROADMAP.template.md para specs/ROADMAP.md se eu disser que
   quero roadmap; caso contrário, apague-o.
3. Me entreviste, uma pergunta por vez, para preencher TODOS os
   [PLACEHOLDERS] do AGENTS.md (identidade, stack travada, comandos
   canônicos, ações sensíveis, proibições do domínio) e do VISION.md.
   Não invente nenhuma resposta — o que eu não souber ainda fica marcado
   como [A DEFINIR].
4. Ajuste os comandos de exemplo do specs/TOKEN-ECONOMY.md para a stack
   deste projeto.
5. Me mostre o AGENTS.md final para revisão antes de commitar.
6. Após meu "aprovado", commit único: "chore: install spec harness".
```

## 2. Especificar uma feature nova

```
Siga o protocolo de início de sessão do AGENTS.md (seção 0).

Quero especificar uma feature nova: [DESCRIÇÃO LIVRE DO PROBLEMA/DESEJO].

Crie specs/[nome-da-feature].md a partir de specs/SPEC.template.md e conduza
as FASES 1 e 2 (especificar e planejar) comigo:
- Me faça as perguntas necessárias ANTES de escrever — não assuma nada
  silenciosamente.
- Escopo mínimo: o que não for essencial vai para "Fora do escopo" ou
  BACKLOG.md.
- Plano com no máximo ~8 passos, cada um com verificação binária.
- NÃO implemente nada nesta sessão. O spec fica em "Em revisão" até eu
  escrever "aprovado".
```

## 3. Retomar trabalho (sessão nova, feature em andamento)

```
Siga o protocolo de início de sessão do AGENTS.md (seção 0). Leia também
specs/LEARNINGS.md antes de tocar em código.

A feature em andamento é specs/[nome-da-feature].md (status: [Aprovado /
parcialmente implementada — passos X..Y já ✅]).

Continue a implementação exatamente de onde parou: próximo passo do plano,
verificação binária, reporte "✅ passo X — verificação: resultado" e só então
siga. Se qualquer verificação falhar, pare e reporte.
```

## 4. Encerrar uma feature (validação)

```
A feature specs/[nome-da-feature].md foi implementada e eu validei no
ambiente real: [RESULTADO DA SUA VALIDAÇÃO — o que funcionou / o que não].

Faça o fechamento conforme AGENTS.md seção 7:
1. Preencha a seção 9 do spec (registro de validação) com o que eu reportei.
2. Mude o status do spec para "Implementado".
3. Atualize specs/STATUS.md (mover para Concluído, registrar decisões novas).
4. Se houve erro não-óbvio resolvido no caminho, registre em
   specs/LEARNINGS.md com data.
5. Se alguma decisão travada mudou, proponha a edição do AGENTS.md e aguarde
   meu "aprovado".
```

## 5. Capturar ideia sem perder o foco

```
Anote em specs/BACKLOG.md, em 1 linha: [IDEIA]. Não implemente nada, não
expanda o escopo da feature atual. Volte ao passo em andamento.
```
