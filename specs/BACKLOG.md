# BACKLOG — ideias capturadas, fora do escopo atual

> Ideias que surgem durante o trabalho entram aqui em 1 linha, sem contaminar
> a feature em andamento. Promover a spec quando fizer sentido.

- Evolução de posições e gaps entre carros durante a corrida (adiado da v1)
- Bateria/ERS: dado REAL não existe em nenhuma fonte (pesquisado em
  2026-07-03: a F1 decidiu não publicar estado de ERS/aero ativa — confirmado
  pelo mantenedor do FastF1; feed SignalR oficial não tem canal de energia;
  gráficos da transmissão não são extraíveis). Único caminho viável: canal
  "Bateria (estimativa)" calculado por modelo físico 2026 (MGU-K 350 kW
  deploy / ~33 kW harvest, ~85% de acurácia relativa segundo
  f1-energy-dash.live) sobre velocidade/acelerador/freio do car_data.
  Reavaliar se a F1/OpenF1 publicarem dado real.
- Resultados e classificação do campeonato via Jolpica-F1
- Rádio de equipe (nota: cobertura da F1 caiu muito em 2026)
- Modo "quase ao vivo" com atraso, se a OpenF1 liberar algo gratuito
- Comparação entre corridas/temporadas diferentes

## Ideias vindas de referência externa (canal de análise de telemetria, 2026-07-03)

> Ferramenta de referência: dashboard "Telemetry Analysis" de terceiros,
> comparando 2 pilotos (ex: Hamilton vs Antonelli). Maioria dos dados já
> temos (car_data/laps); o que falta é camada de análise/visualização em
> cima. Cada item abaixo é candidato a spec próprio.

- **Painel de insights automáticos**: texto gerado a partir do delta entre
  pilotos, tipo "Straight 5: perde velocidade na reta (+0.06s)" / "Turn 9:
  carrega mais velocidade na curva rápida (-0.05s)". Blocos observados:
  delta de velocidade de curva por faixa (baixa/média/alta velocidade),
  delta por setor (S1/S2/S3), lista "maiores diferenças da volta" com frase
  qualitativa (ex: "precisa soltar mais cedo na curva rápida", "acelera
  antes na saída"). Exige: computar deltas de velocidade/tempo por trecho e
  gerar frases a partir de regras (sem IA generativa, se possível — regras
  determinísticas tipo "se delta de velocidade > X em zona de frenagem,
  então frase Y").
- **Gráfico de delta acumulado entre 2 pilotos** ao longo da volta (eixo Y =
  segundos ganhos/perdidos, acumulado por distância) — complementa a
  telemetria atual (que mostra canais brutos lado a lado, não a diferença
  em si). Tooltip mostra o valor exato de delta no ponto. Ideia de "badge de
  confiança do delta" (ex: MEDIUM) quando o alinhamento entre as 2 voltas é
  impreciso — relevante pro nosso caso porque comparamos por tempo decorrido
  na volta, não por distância percorrida (ver item de eixo por distância
  abaixo).
- **Eixo X por distância + marcadores de curva/reta**: os gráficos de
  referência usam distância (m) no eixo X, não tempo, com rótulos de curva
  (T1, T2… Sx, "Straight 5") sobrepostos — MUITO mais fácil de localizar
  onde na pista algo acontece do que só "23.4s na volta". Pré-requisito: dado
  de posição/distância por volta (OpenF1 tem endpoint `location` com x/y;
  não temos mapa de curvas por circuito ainda — precisaria derivar ou
  hardcodear por GP).
- **Toggle de piloto na legenda**: clicar no chip do piloto abaixo do
  gráfico esconde/mostra a linha dele (hoje nossa legenda é só informativa).
- **Comparador gráfico na pista**: desenho do traçado do circuito (SVG) com
  o percurso colorido por qual piloto foi mais rápido em cada trecho — muda
  o desenho conforme o GP selecionado. Também tinha "replay animado" (carros
  se movendo no traçado). Grande esforço: precisa de coordenadas x/y reais
  por circuito (endpoint `location` da OpenF1) e lógica de segmentação por
  curva.
- Confirma nossa abordagem atual: o app de referência também rotula a
  bateria como estimativa modelada, com a mesma ressalva de "começa a volta
  em 100%, que pode não ser real" — igual ao que já fizemos.
- Cards de resumo por piloto lado a lado (top speed, vel. média, % de
  acelerador total, nº de frenagens, sector times) — parcialmente coberto
  pelos chips de tempo de volta atuais; falta top speed/média/frenagens.
- Alternância "Freio: On/Off vs Pressão (estimada)" — hoje só mostramos
  binário; pressão estimada seria outro modelo físico como o de bateria.
- Botão de exportar dados (ZIP) da sessão/volta selecionada.
