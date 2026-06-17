export default async function handler(req, res) {
  console.log('🔵 [SUBMIT-SURVEY] Requisição recebida');
  console.log('🔵 [SUBMIT-SURVEY] Method:', req.method);

  if (req.method !== 'POST') {
    console.log('🔴 [SUBMIT-SURVEY] Método não permitido:', req.method);
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    console.log('🔵 [SUBMIT-SURVEY] Body recebido:', req.body);

    const { survey_data, metadata } = req.body;

    // Validações
    if (!survey_data?.ticket_id) {
      console.log('🔴 [SUBMIT-SURVEY] ticket_id ausente');
      return res.status(400).json({
        success: false,
        error: 'ticket_id is required'
      });
    }

    if (!survey_data?.rating) {
      console.log('🔴 [SUBMIT-SURVEY] rating ausente');
      return res.status(400).json({
        success: false,
        error: 'rating is required'
      });
    }

    // Construir payload
    const payload = {
      event_type: 'csat_survey_submitted',
      timestamp: new Date().toISOString(),
      survey_data: {
        ticket_id: survey_data.ticket_id,
        rating: survey_data.rating,
        rating_label: survey_data.rating_label,
        reason: survey_data.reason || null,
        reason_label: survey_data.reason_label || null,
        impressions: survey_data.impressions || '',
        source: 'zendesk_widget_csat'
      },
      metadata: {
        submission_id: metadata.submission_id,
        submitted_at: new Date().toISOString()
      }
    };

    console.log('✅ [SUBMIT-SURVEY] Payload construído:', JSON.stringify(payload, null, 2));

    // Pegar webhook URL
    const ZENDESK_WEBHOOK_URL = process.env.ZENDESK_WEBHOOK_URL;

    console.log('🔵 [SUBMIT-SURVEY] Webhook URL definida?', !!ZENDESK_WEBHOOK_URL);
    console.log('🔵 [SUBMIT-SURVEY] Webhook URL:', ZENDESK_WEBHOOK_URL?.substring(0, 50) + '...');

    if (!ZENDESK_WEBHOOK_URL) {
      console.log('🔴 [SUBMIT-SURVEY] ERRO: ZENDESK_WEBHOOK_URL não configurada');
      return res.status(500).json({
        success: false,
        error: 'ZENDESK_WEBHOOK_URL not configured in environment'
      });
    }

    // Enviar para Zendesk
    console.log('🔵 [SUBMIT-SURVEY] Iniciando fetch para webhook...');

    const webhookResponse = await fetch(ZENDESK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      timeout: 30000
    });

    console.log('✅ [SUBMIT-SURVEY] Response recebido, status:', webhookResponse.status);

    if (!webhookResponse.ok) {
      const responseText = await webhookResponse.text();
      console.log('🔴 [SUBMIT-SURVEY] Response não OK, status:', webhookResponse.status);
      console.log('🔴 [SUBMIT-SURVEY] Response body:', responseText);
      
      throw new Error(`Webhook error: ${webhookResponse.status} - ${responseText}`);
    }

    let webhookResult = {};
    try {
      webhookResult = await webhookResponse.json();
      console.log('✅ [SUBMIT-SURVEY] Webhook result:', webhookResult);
    } catch (parseError) {
      console.log('⚠️ [SUBMIT-SURVEY] Response não é JSON válido (pode estar OK)');
    }

    // Sucesso
    console.log('✅ [SUBMIT-SURVEY] SUCESSO!');
    
    return res.status(200).json({
      success: true,
      message: 'Survey submitted successfully',
      survey_id: metadata.submission_id,
      ticket_id: survey_data.ticket_id
    });

  } catch (error) {
    console.log('🔴 [SUBMIT-SURVEY] CATCH - Error:', error.message);
    console.log('🔴 [SUBMIT-SURVEY] Error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
