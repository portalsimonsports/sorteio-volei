/** Configuração inicial do sistema */
function CONFIGURAR_SISTEMA_INICIAL(){
 garantirEstrutura_();
 const p=props_();
 const adminKey=obterChaveAdmin_();
 if(!p.getProperty('ACTIVATION_SALT'))p.setProperty('ACTIVATION_SALT',Utilities.getUuid()+Utilities.getUuid());
 definirConfig_('ADMIN_KEY',adminKey,'Chave administrativa do painel');
 definirConfig_('URL_SITE',VOLEI.SITE_URL,'Página pública independente');
 definirConfig_('URL_ADMIN',VOLEI.ADMIN_URL,'Painel administrativo independente');
 definirConfig_('VERSAO',VOLEI.VERSION,'Versão atual do sistema');
 definirConfig_('DATA_EVENTO','22/07/2026','Data oficial do evento');
 definirConfig_('ENCERRAMENTO_INSCRICOES','09:50','Horário de encerramento das inscrições públicas');
 definirConfig_('INICIO_CONTAGEM','09:55','Horário de início da contagem regressiva');
 definirConfig_('PRIMEIRA_PARTIDA_HORARIO','10:15','Horário da primeira partida');
 definirConfig_('DURACAO_CONTAGEM_SEGUNDOS',1200,'Duração da contagem regressiva pública');
 definirConfig_('NOTA_MINIMA',5,'Menor avaliação comum permitida');
 definirConfig_('NOTA_MAXIMA',10,'Maior avaliação permitida');
 definirConfig_('AJUSTE_NOTA_5',3,'Nota 5 recebe acréscimo de 3 no índice');
 definirConfig_('AJUSTE_NOTA_6',2,'Nota 6 recebe acréscimo de 2 no índice');
 definirConfig_('AJUSTE_NOTA_7',1,'Nota 7 recebe acréscimo de 1 no índice');
 definirConfig_('ASTERISCO_MANTEM_VALOR','SIM','5*, 6*, 7* e 4* mantêm o valor exato');
 definirConfig_('NOTA_ABAIXO_5','BLOQUEAR_SEM_ASTERISCO','Registros antigos permanecem preservados');
 definirConfig_('PUBLICAR_PESOS','NAO','Não exibir notas, índices ou pesos na página pública');
 definirConfig_('EXIBIR_IDADE_PUBLICO','SIM','Exibir somente nome e idade dos participantes');
 definirConfig_('DISPUTA_TERCEIRO_LUGAR','ATIVA','Perdedores das semifinais disputam o terceiro lugar');
 definirConfig_('INTERVALO_ENTRE_PARTIDAS_MINUTOS',10,'Intervalo obrigatório entre partidas');
 definirConfig_('MELHOR_DE_SETS',3,'Quantidade máxima de sets por partida: 1, 3 ou 5');
 definirConfig_('PONTOS_SET_NORMAL',25,'Pontuação-alvo dos sets normais');
 definirConfig_('PONTOS_SET_DESEMPATE',15,'Pontuação-alvo do último set decisivo');
 definirConfig_('SETS_PARA_VENCER',2,'Sets necessários para vencer');
 definirConfig_('VANTAGEM_MINIMA_SET',2,'Vantagem mínima para encerrar o set');
 definirConfig_('FORMATO_PARTIDA','MELHOR_DE_3','Formato da partida');
 definirConfig_('REGISTRAR_INICIO_PARTIDA','ATIVO','Registra o horário real ao iniciar cada partida');
 definirConfig_('CHAVEAMENTO_7_DUPLAS','3_QUARTAS_1_DIRETA','Sete duplas: três quartas e uma equipe diretamente na semifinal');
 definirConfig_('HISTORICO_CAMPEONATOS','ATIVO','Preserva equipes, jogos, placares e classificação de cada edição');
 definirConfig_('REUTILIZAR_MESMAS_EQUIPES','ATIVO','Permite novo chaveamento com as mesmas duplas');
 definirConfig_('CAMPEONATO_MODELO','AUTOMATICO','Modelo padrão das novas edições');
 definirConfig_('MODALIDADE','VOLEI_DE_QUADRA','Modalidade');
 if(aba_(VOLEI.SHEETS.SORTEIOS).getLastRow()<2)criarEstadoInscricoes_('Sistema configurado. Inscrições abertas.');
 INSTALAR_ACIONADOR_AUTOMATICO();
 const config=obterConfig_();
 const detectada=ScriptApp.getService().getUrl()||'';
 const urlPublica=/\/exec(?:\?|$)/.test(detectada)?detectada:texto_(config.API_WEB_APP);
 if(urlPublica)definirConfig_('API_WEB_APP',urlPublica,'URL pública /exec do Apps Script');
 log_('SISTEMA_CONFIGURADO','','EDITOR','ADMIN','Backend '+VOLEI.VERSION+' configurado.','INFO','SISTEMA');
 Logger.log('ADMIN_KEY gravada em CONFIG: '+adminKey);
 Logger.log('WEB_APP_URL: '+urlPublica);
 return{ok:true,adminKey:adminKey,webAppUrl:urlPublica,spreadsheetId:VOLEI.SPREADSHEET_ID,versao:VOLEI.VERSION};
}
function INSTALAR_SISTEMA_COMPLETO(){return CONFIGURAR_SISTEMA_INICIAL();}
function REGISTRAR_URL_WEB_APP(){const config=obterConfig_(),detectada=ScriptApp.getService().getUrl()||'',url=/\/exec(?:\?|$)/.test(detectada)?detectada:texto_(config.API_WEB_APP);if(!url)throw Error('Informe primeiro uma URL pública terminada em /exec na aba CONFIG.');definirConfig_('API_WEB_APP',url,'URL pública /exec do Apps Script');Logger.log('WEB_APP_URL: '+url);return{ok:true,webAppUrl:url};}
