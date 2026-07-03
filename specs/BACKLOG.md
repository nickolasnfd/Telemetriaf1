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
