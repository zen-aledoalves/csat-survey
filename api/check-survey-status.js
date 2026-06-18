export default async function handler(req, res) {
  const { ticketId } = req.query;

  console.log(`[check-survey-status] Verificando ticket: ${ticketId}`);

  if (!ticketId) {
    return res.status(400).json({ error: 'ticketId is required' });
  }

  try {
    const subdomain = process.env.ZENDESK_SUBDOMAIN;
    const email = process.env.ZENDESK_EMAIL;
    const token = process.env.ZENDESK_API_TOKEN;

    const auth = Buffer.from(`${email}/token:${token}`).toString('base64');

    const auditUrl = `https://${subdomain}.zendesk.com/api/v2/tickets/${ticketId}/audits.json`;

    console.log(`[check-survey-status] Fazendo requisição para: ${auditUrl}`);

    const response = await fetch(auditUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`[check-survey-status] Status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[check-survey-status] Erro: ${errorData}`);
      return res.status(response.status).json({ 
        error: `Zendesk API error: ${response.status}`,
        alreadySubmitted: false 
      });
    }

    const data = await response.json();
    console.log(`[check-survey-status] Audits recebidos: ${data.audits?.length || 0}`);

    // Procurar por SurveyResponseSubmitted
    const hasSurveySubmission = data.audits?.some(audit => {
      return audit.events?.some(event => event.type === 'SurveyResponseSubmitted');
    });

    console.log(`[check-survey-status] Survey já submetido: ${hasSurveySubmission}`);

    return res.status(200).json({ 
      alreadySubmitted: hasSurveySubmission === true 
    });
  } catch (error) {
    console.error('[check-survey-status] Erro:', error);
    return res.status(500).json({ 
      error: error.message,
      alreadySubmitted: false 
    });
  }
}
