/**
 * API Endpoint: GET /api/check-survey-status?ticketId=12345
 * 
 * Verifica se uma survey já foi submetida para um ticket
 * fazendo lookup na API de Audits do Zendesk
 */

export default async function handler(req, res) {
  console.log('🔍 [CHECK-SURVEY-STATUS] Requisição recebida');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ticketId } = req.query;

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        error: 'ticketId is required'
      });
    }

    console.log(`📌 [CHECK-SURVEY-STATUS] Verificando ticket: ${ticketId}`);

    // Credenciais Zendesk
    const subdomain = process.env.ZENDESK_SUBDOMAIN || 'z3n-alealves';
    const email = process.env.ZENDESK_EMAIL || 'seu-email@zendesk.com/token';
    const apiToken = process.env.ZENDESK_API_TOKEN;

    if (!apiToken) {
      console.error('🔴 [CHECK-SURVEY-STATUS] ZENDESK_API_TOKEN não configurado');
      return res.status(500).json({
        success: false,
        error: 'ZENDESK_API_TOKEN not configured'
      });
    }

    // Construir Authorization
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    // Chamar API de Audits
    const auditUrl = `https://${subdomain}.zendesk.com/api/v2/tickets/${ticketId}/audits.json`;
    
    console.log(`📡 [CHECK-SURVEY-STATUS] Fazendo requisição para: ${auditUrl}`);

    const auditResponse = await fetch(auditUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!auditResponse.ok) {
      const errorText = await auditResponse.text();
      console.error(`🔴 [CHECK-SURVEY-STATUS] Erro API: ${auditResponse.status} - ${errorText}`);
      
      return res.status(200).json({
        success: true,
        already_submitted: false,
        note: `API error: ${auditResponse.status}`
      });
    }

    const auditData = await auditResponse.json();
    console.log(`✅ [CHECK-SURVEY-STATUS] Audits recebidos: ${auditData.audits?.length || 0} audits`);

    // Procurar por evento 'SurveyResponseSubmitted'
    let surveyFound = false;

    if (auditData.audits && Array.isArray(auditData.audits)) {
      for (const audit of auditData.audits) {
        if (!audit.events) continue;

        for (const event of audit.events) {
          console.log(`🔍 [CHECK-SURVEY-STATUS] Verificando evento: ${event.type}`);

          if (event.type === 'SurveyResponseSubmitted') {
            console.log('⚠️ [CHECK-SURVEY-STATUS] Survey encontrada!');
            console.log(`    Dados: ${JSON.stringify(event.data || {})}`);
            
            surveyFound = true;
            break;
          }
        }

        if (surveyFound) break;
      }
    }

    console.log(`📊 [CHECK-SURVEY-STATUS] Resultado: ${surveyFound ? 'JÁ SUBMETIDA' : 'NÃO SUBMETIDA'}`);

    return res.status(200).json({
      success: true,
      already_submitted: surveyFound,
      ticket_id: ticketId,
      audits_checked: auditData.audits?.length || 0
    });

  } catch (error) {
    console.error('❌ [CHECK-SURVEY-STATUS] Erro:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
