/** Configuração inicial do sistema — idempotente e sem apagar ajustes existentes */
function definirConfigPadrao_(config,chave,valor,descricao){if(!Object.prototype.hasOwnProperty.call(config,chave)||texto_(config[chave])===''){definirConfig_(chave,valor,descricao);config[chave]=valor;}}
function CONFIGURAR_SISTEMA_INICIAL(){
 garantirEstrutura_();
 const p=props_(),config=obterConfig_(),adminKey=obterChaveAdmin_();
 if(!p.getProperty('ACTIVATION_SALT'))p.setProperty('ACTIVATION_SALT',Utilities.getUuid()+Utilities.getUuid());
 definirConfig_('ADMIN_KEY',adminKey,'Chave administrativa do painel');
 definirConfig_('URL_SITE',VOLEI.SITE_URL,'Página pública independente');
 definirConfig_('URL_ADMIN',VOLEI.ADMIN_URL,'Painel administrativo independente');
 definirConfig_('VERSAO',VOLEI.VERSION,'Versão atual do sistema');
 definirConfigPadrao_(config,'DATA_EVENTO','22/07/2026','Data oficial do evento');
 definirConfigPadrao_(config,'ENCERRAMENTO_INSCRICOES','09:50','Horário de encerramento das inscrições públicas');
 definirConfigPadrao_(config,'INICIO_CONTAGEM','09:55','Horário de início da contagem regressiva');
 definirConfigPadrao_(config,'PRIMEIRA_PARTIDA_HORARIO','10:15','Horário da primeira partida');
 definirConfigPadrao_(config,'DURACAO_CONTAGEM_SEGUNDOS',1200,'Duração da contagem regressiva pública');
 definirConfigPadrao_(config,'NOTA_MINIMA',5,'Menor avaliação comum permitida');
 definirConfigPadrao_(config,'NOTA_MAXIMA',10,'Maior avaliação permitida');
 definirConfigPadrao_(config,'AJUSTE_NOTA_5',3,'Nota 5 recebe acréscimo de 3 no índice');
 definirConfigPadrao_(config,'AJUSTE_NOTA_6',2,'Nota 6 recebe acréscimo de 2 no índice');
 definirConfigPadrao_(config,'AJUSTE_NOTA_7',1,'Nota 7 recebe acréscimo de 1 no índice');
 definirConfigPadrao_(config,'ASTERISCO_MANTEM_VALOR','SIM','5*, 6*, 7* e 4* mantêm o valor exato');
 definirConfigPadrao_(config,'NOTA_ABAIXO_5','BLOQUEAR_SEM_ASTERISCO','Registros antigos permanecem preservados');
 definirConfigPadrao_(config,'PUBLICAR_PESOS','NAO','Não exibir notas, índices ou pesos na página pública');
 definirConfigPadrao_(config,'EXIBIR_IDADE_PUBLICO','SIM','Exibir somente nome e idade dos participantes');
 definirConfigPadrao_(config,'INDICE_HISTORICO_ATIVO','SIM','Atualiza o índice pelos campeonatos finalizados');
 definirConfigPadrao_(config,'AJUSTE_HISTORICO_MAXIMO',2,'Variação histórica máxima para cima ou para baixo');
 definirConfigPadrao_(config,'JOGOS_CONFIANCA_TOTAL',6,'Quantidade de jogos para o desempenho atingir peso integral');
 definirConfigPadrao_(config,'PESO_HISTORICO_VITORIAS',0.55,'Peso de vitórias e derrotas no índice histórico');
 definirConfigPadrao_(config,'PESO_HISTORICO_SETS',0.25,'Peso do saldo proporcional de sets');
 definirConfigPadrao_(config,'PESO_HISTORICO_PONTOS',0.10,'Peso do saldo proporcional de pontos');
 definirConfigPadrao_(config,'PESO_HISTORICO_COLOCACAO',0.10,'Peso de título, vice e terceiro lugar');
 definirConfigPadrao_(config,'DESEMPATE_ADULTOS_IDADE','MAIOR_IDADE_MELHOR_PARCEIRO','Em igualdade de índice, o adulto mais velho recebe o parceiro de índice superior');
 definirConfigPadrao_(config,'CHAVEAMENTO_POR_FORCA','ATIVO','Cabeças de chave distribuídas pelo índice total das duplas');
 definirConfigPadrao_(config,'DISPUTA_TERCEIRO_LUGAR','ATIVA','Perdedores das semifinais disputam o terceiro lugar');
 definirConfigPadrao_(config,'INTERVALO_ENTRE_PARTIDAS_MINUTOS',10,'Intervalo obrigatório entre partidas');
 definirConfigPadrao_(config,'MELHOR_DE_SETS',3,'Quantidade máxima de sets por partida: 1, 3 ou 5');
 definirConfigPadrao_(config,'PONTOS_SET_NORMAL',25,'Pontuação-alvo dos sets normais');
 definirConfigPadrao_(config,'PONTOS_SET_DESEMPATE',15,'Pontuação-alvo do último set decisivo');
 definirConfigPadrao_(config,'SETS_PARA_VENCER',2,'Sets necessários para vencer');
 definirConfigPadrao_(config,'VANTAGEM_MINIMA_SET',2,'Vantagem mínima para encerrar o set');
 definirConfigPadrao_(config,'FORMATO_PARTIDA','MELHOR_DE_3','Formato da partida');
 definirConfigPadrao_(config,'REGISTRAR_INICIO_PARTIDA','ATIVO','Registra o horário real ao iniciar cada partida');
 definirConfigPadrao_(config,'CHAVEAMENTO_7_DUPLAS','3_QUARTAS_1_DIRETA','Sete duplas: três quartas e a melhor cabeça de chave diretamente na semifinal');
 definirConfigPadrao_(config,'HISTORICO_CAMPEONATOS','ATIVO','Preserva equipes, jogos, placares e classificação de cada edição');
 definirConfigPadrao_(config,'REUTILIZAR_MESMAS_EQUIPES','ATIVO','Permite novo chaveamento com as mesmas duplas');
 definirConfigPadrao_(config,'CAMPEONATO_MODELO','AUTOMATICO','Modelo padrão das novas edições');
 definirConfigPadrao_(config,'MODALIDADE','VOLEI_DE_QUADRA','Modalidade');
 if(aba_(VOLEI.SHEETS.SORTEIOS).getLastRow()<2)criarEstadoInscricoes_('Sistema configurado. Inscrições abertas.');
 atualizarIndicesHistoricos_();
 INSTALAR_ACIONADOR_AUTOMATICO();
 const atual=obterConfig_(),detectada=ScriptApp.getService().getUrl()||'',urlPublica=/\/exec(?:\?|$)/.test(detectada)?detectada:texto_(atual.API_WEB_APP);
 if(urlPublica)definirConfig_('API_WEB_APP',urlPublica,'URL pública /exec do Apps Script');
 log_('SISTEMA_CONFIGURADO','','EDITOR','ADMIN','Backend '+VOLEI.VERSION+' verificado sem sobrescrever dados ou configurações existentes.','INFO','SISTEMA');
 Logger.log('ADMIN_KEY gravada em CONFIG: '+adminKey);
 Logger.log('WEB_APP_URL: '+urlPublica);
 return{ok:true,adminKey:adminKey,webAppUrl:urlPublica,spreadsheetId:VOLEI.SPREADSHEET_ID,versao:VOLEI.VERSION,mensagem:'Estrutura verificada. Dados operacionais e configurações existentes foram preservados.'};
}
function INSTALAR_SISTEMA_COMPLETO(){return CONFIGURAR_SISTEMA_INICIAL();}
function REGISTRAR_URL_WEB_APP(){const config=obterConfig_(),detectada=ScriptApp.getService().getUrl()||'',url=/\/exec(?:\?|$)/.test(detectada)?detectada:texto_(config.API_WEB_APP);if(!url)throw Error('Informe primeiro uma URL pública terminada em /exec na aba CONFIG.');definirConfig_('API_WEB_APP',url,'URL pública /exec do Apps Script');Logger.log('WEB_APP_URL: '+url);return{ok:true,webAppUrl:url};}
