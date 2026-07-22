/**
 * PASSAPORTE T.A.Y. — Backend em Google Apps Script
 * ---------------------------------------------------
 * Não usa nenhum banco de dados: cada evento (carimbo, missão concluída,
 * item da lista de desejos) é gravado como uma linha em uma planilha Google,
 * junto com um JSON flexível — assim, novas perguntas por paciente não exigem
 * mudar a estrutura da planilha.
 *
 * COMO PUBLICAR (resumo — veja o README.md para o passo a passo completo):
 * 1. Crie uma Planilha Google nova. Copie o ID dela (está na URL).
 * 2. Em script.google.com, crie um novo projeto e cole este arquivo.
 * 3. Preencha SHEET_ID abaixo com o ID da planilha.
 * 4. Implantar > Nova implantação > Tipo: App da Web.
 *    - Executar como: Eu
 *    - Quem pode acessar: Qualquer pessoa
 * 5. Copie a URL gerada e cole em config/site.json (campo "sync_url").
 *
 * SEGURANÇA — IMPORTANTE:
 * Como o site fica num repositório público do GitHub, qualquer pessoa pode ver
 * a URL deste backend (ela precisa estar no código do site para funcionar).
 * Para que estranhos não consigam LER os diários das pacientes, a leitura
 * (doGet, usada pelo painel) exige um token secreto — mas esse token NUNCA
 * fica escrito em nenhum arquivo/código, nem aqui, nem no GitHub. Ele fica
 * guardado só dentro do próprio Google Apps Script, em "Propriedades do
 * script" (Configurações do projeto ⚙️ → Propriedades do script → Adicionar
 * propriedade → nome: ACCESS_TOKEN, valor: uma senha longa à sua escolha).
 * Sem isso configurado, a leitura fica bloqueada por padrão.
 */

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SHEET_NAME = 'Eventos';

function getAccessToken_() {
  return PropertiesService.getScriptProperties().getProperty('ACCESS_TOKEN');
}

function getSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['timestamp_servidor', 'evento_id', 'paciente_id', 'paciente_nome', 'tipo', 'dados_json']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      body.id || Utilities.getUuid(),
      body.patient_id || '',
      body.patient_name || '',
      body.type || '',
      JSON.stringify(body.payload || {})
    ]);
    return jsonResponse_({ ok: true });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  try {
    const expected = getAccessToken_();
    const given = e.parameter && e.parameter.token;
    if (!expected) {
      return jsonResponse_({ ok: false, error: 'ACCESS_TOKEN não configurado. Veja as instruções no topo do arquivo.' });
    }
    if (given !== expected) {
      return jsonResponse_({ ok: false, error: 'unauthorized' });
    }

    const sheet = getSheet_();
    const values = sheet.getDataRange().getValues();
    const header = values.shift();
    let rows = values.map(r => ({
      timestamp: r[0] instanceof Date ? r[0].toISOString() : r[0],
      id: r[1],
      patient_id: r[2],
      patient_name: r[3],
      type: r[4],
      payload: safeParse_(r[5])
    }));

    const patientFilter = e.parameter && e.parameter.patient;
    if (patientFilter) {
      rows = rows.filter(r => r.patient_id === patientFilter);
    }

    return jsonResponse_({ ok: true, rows });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function safeParse_(str) {
  try { return JSON.parse(str); } catch (e) { return {}; }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}