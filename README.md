# Sorteio de Vôlei

Sistema independente para inscrição, formação equilibrada de duplas, sorteio, chaveamento e registro de placares.

## Regras das partidas

- Vôlei de quadra adaptado para melhor de 3 sets.
- 1º e 2º sets até 25 pontos.
- 3º set até 15 pontos.
- Todos os sets exigem vantagem mínima de 2 pontos.
- Intervalo operacional de 10 minutos entre partidas.

## Endereços

- Página pública: `https://portalsimonsports.github.io/sorteio-volei/`
- Painel: `https://portalsimonsports.github.io/sorteio-volei/admin.html`

## Armazenamento

Enquanto `DEMO_MODE` estiver como `true` em `config.js`, os dados ficam no navegador. Para compartilhamento entre dispositivos, publique o Apps Script e informe a URL `/exec` em `API_BASE`.
