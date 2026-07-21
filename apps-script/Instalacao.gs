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
 definirConfig_('INTERVALO_ENTRE_PARTIDAS_MINUTOS',10,'Intervalo obrigatório entre partidas');
 definirConfig_('PONTOS_SET_NORMAL',25,'Pontuação-alvo do 1º e do 2º sets');
 definirConfig_('PONTOS_SET_DESEMPATE',15,'Pontuação-alvo do 3º set');
 definirConfig_('SETS_PARA_VENCER',2,'Sets necessários para vencer');
 definirConfig_('VANTAGEM_MINIMA_SET',2,'Vantagem mínima para encerrar o set');
 definirConfig_('FORMATO_PARTIDA','MELHOR_DE_3','Formato da partida');
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
 return{ok:true,adminKey,webAppUrl:urlPublica,spreadsheetId:VOLEI.SPREADSHEET_ID,versao:VOLEI.VERSION};
}
function INSTALAR_SISTEMA_COMPLETO(){return CONFIGURAR_SISTEMA_INICIAL();}
function REGISTRAR_URL_WEB_APP(){const config=obterConfig_(),detectada=ScriptApp.getService().getUrl()||'',url=/\/exec(?:\?|$)/.test(detectada)?detectada:texto_(config.API_WEB_APP);if(!url)throw Error('Informe primeiro uma URL pública terminada em /exec na aba CONFIG.');definirConfig_('API_WEB_APP',url,'URL pública /exec do Apps Script');Logger.log('WEB_APP_URL: '+url);return{ok:true,webAppUrl:url};}
