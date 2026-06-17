/**
 * API Endpoint: POST /api/submit-survey
 * Recebe dados da pesquisa CSAT e envia para Zendesk
 */

export default async function handler(req, res) {
  // Apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    const { survey_data, metadata } = req.body;

    // Validar
    if (!survey_data?.ticket_id) {
      return res.status(400).json({
        success: false,
        error: 'ticket_id is required'
      });
    }

    if (!survey_data?.rating) {
      return res.status(400).json({
        success: false,
        error: 'rating is required'
      });
    }

    // Construir payload para Zendesk
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

    console.log('📤 Enviando para Zendesk:', payload);

    // Pegar URL do webhook do environment
    const ZENDESK_WEBHOOK_URL = process.env.ZENDESK_WEBHOOK_URL;

    if (!ZENDESK_WEBHOOK_URL) {
      return res.status(500).json({
        success: false,
        error: 'ZENDESK_WEBHOOK_URL not configured'
      });
    }

    // Enviar para Zendesk webhook
    const webhookResponse = await fetch(ZENDESK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!webhookResponse.ok) {
      throw new Error(`Webhook error: ${webhookResponse.status}`);
    }

    const webhookResult = await webhookResponse.json();

    // Retornar sucesso
    return res.status(200).json({
      success: true,
      message: 'Survey submitted successfully',
      survey_id: metadata.submission_id,
      ticket_id: survey_data.ticket_id
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
