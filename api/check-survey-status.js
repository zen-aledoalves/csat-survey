/**
 * API Endpoint: GET /api/check-survey-status?ticketId=12345
 * 
 * Verifica se uma survey já foi submetida para um ticket
 * fazendo lookup na API de Audits do Zendesk
 */

export default async function handler(req, res) {
  console.log('🔍 [CHECK-SURVEY-STATUS] Requisição recebida');
  console.log('🔍 [CHECK-SURVEY-STATUS] Query:', req.query);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ticketId } = req.query;

    if (!ticketId) {
      console.log('🔴 [CHECK-SURVEY-STATUS] ticketId ausente');
      return res.status(400).json({
        success: false,
        error: 'ticketId is required'
      });
    }

    console.log(`📌 [CHECK-SURVEY-STATUS] Verificando ticket: ${ticketId}`);

    // Credenciais Zendesk
    const subdomain = process.env.ZENDESK_SUBDOMAIN || 'z3n-alealves';
    const email = process.env.ZENDESK_EMAIL;
    const apiToken = process.env.ZENDESK_API_TOKEN;

    console.log(`🔑 [CHECK-SURVEY-STATUS] Subdomain: ${subdomain}`);
    console.log(`🔑 [CHECK-SURVEY-STATUS] Email configurado: ${!!email}`);
    console.log(`🔑 [CHECK-SURVEY-STATUS] Token configurado: ${!!apiToken}`);

    if (!apiToken || !email) {
      console.error('🔴 [CHECK-SURVEY-STATUS] Credenciais incompletas');
      return res.status(500).json({
        success: false,
        error: 'ZENDESK credentials not configured'
      });
    }

    // Construir Authorization
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    // Chamar API de Audits
    const auditUrl = `https://${subdomain}.zendesk.com/api/v2/tickets/${ticketId}/audits.json`;
    
    console.log(`📡 [CHECK-SURVEY-STATUS] URL: ${auditUrl}`);

    const auditResponse = await fetch(auditUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📡 [CHECK-SURVEY-STATUS] Status da resposta: ${auditResponse.status}`);

    if (!auditResponse.ok) {
      const errorText = await auditResponse.text();
      console.error(`🔴 [CHECK-SURVEY-STATUS] Erro API: ${auditResponse.status}`);
      console.error(`🔴 [CHECK-SURVEY-STATUS] Resposta: ${errorText}`);
      
      return res.status(200).json({
        success: true,
        already_submitted: false,
        note: `API error: ${auditResponse.status}`,
        error_details: errorText
      });
    }

    const auditData = await auditResponse.json();
    console.log(`✅ [CHECK-SURVEY-STATUS] Total de audits: ${auditData.audits?.length || 0}`);

    // Procurar por evento 'SurveyResponseSubmitted'
    let surveyFound = false;
    let eventsChecked = 0;
    let eventTypes = [];

    if (auditData.audits && Array.isArray(auditData.audits)) {
      console.log(`🔍 [CHECK-SURVEY-STATUS] Começando a verificar audits...`);

      for (let auditIndex = 0; auditIndex < auditData.audits.length; auditIndex++) {
        const audit = auditData.audits[auditIndex];
        
        console.log(`🔍 [CHECK-SURVEY-STATUS] Audit #${auditIndex}:`);
        console.log(`    - ID: ${audit.id}`);
        console.log(`    - Timestamp: ${audit.created_at}`);
        console.log(`    - Events count: ${audit.events?.length || 0}`);

        if (!audit.events || audit.events.length === 0) {
          console.log(`    ⏭️ Sem eventos neste audit`);
          continue;
        }

        for (let eventIndex = 0; eventIndex < audit.events.length; eventIndex++) {
          const event = audit.events[eventIndex];
          eventsChecked++;

          console.log(`    📍 Evento #${eventIndex}: ${event.type}`);
          
          eventTypes.push(event.type);

          // Verificar diferentes tipos de eventos possíveis
          if (
            event.type === 'SurveyResponseSubmitted' ||
            event.type === 'survey_response_submitted' ||
            event.type === 'satisfaction_rating' ||
            event.type === 'csat_response'
          ) {
            console.log(`    ✅ SURVEY ENCONTRADA!`);
            console.log(`    Tipo: ${event.type}`);
            console.log(`    Dados: ${JSON.stringify(event.data || {})}`);
            
            surveyFound = true;
            break;
          }
        }

        if (surveyFound) break;
      }

      console.log(`📊 [CHECK-SURVEY-STATUS] Total de eventos verificados: ${eventsChecked}`);
      console.log(`📊 [CHECK-SURVEY-STATUS] Tipos de eventos encontrados: ${eventTypes.join(', ')}`);
    }

    console.log(`📊 [CHECK-SURVEY-STATUS] Resultado final: ${surveyFound ? 'SURVEY JÁ SUBMETIDA' : 'SURVEY NÃO SUBMETIDA'}`);

    return res.status(200).json({
      success: true,
      already_submitted: surveyFound,
      ticket_id: ticketId,
      audits_checked: auditData.audits?.length || 0,
      events_checked: eventsChecked,
      event_types_found: eventTypes
    });

  } catch (error) {
    console.error('❌ [CHECK-SURVEY-STATUS] Erro:', error.message);
    console.error('❌ [CHECK-SURVEY-STATUS] Stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
