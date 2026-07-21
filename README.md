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
- Planilha: `https://docs.google.com/spreadsheets/d/1lg0HKljL93wD5riajKbCYcShzKYW0qAVYkPTwjerVAo/edit`

## Backend Apps Script V005

Os módulos completos estão na pasta `apps-script`:

- `Code.gs`
- `Instalacao.gs`
- `Automacao.gs`
- `Cadastro.gs`
- `Equipes.gs`
- `ChaveamentoBase.gs`
- `ChaveamentoDados.gs`
- `SorteioExecucao.gs`
- `SorteioAtivacao.gs`
- `PlacarRegras.gs`
- `PlacarRegistro.gs`
- `Estado.gs`
- `appsscript.json`

A função inicial é `CONFIGURAR_SISTEMA_INICIAL`. Ela confere a estrutura da planilha, cria a chave administrativa, atualiza os parâmetros e instala o acionador automático de um minuto.

## Implantação

1. Criar ou abrir o projeto no Google Apps Script.
2. Copiar todos os arquivos da pasta `apps-script`.
3. Executar `CONFIGURAR_SISTEMA_INICIAL` uma vez e autorizar.
4. Implantar como aplicativo da Web, executando como o proprietário e permitindo acesso a qualquer pessoa.
5. Copiar a URL terminada em `/exec` para `API_BASE` no arquivo `config.js`.

Enquanto `API_BASE` estiver vazio, o site usa o armazenamento local do navegador. Quando a URL `/exec` for informada, a página pública e o painel passam a usar a Planilha Google por JSONP.
