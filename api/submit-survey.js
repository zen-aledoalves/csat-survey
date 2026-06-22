export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ticketId, rating, ratingLabel, reasonId, reasonLabel, impressions } = req.body;

  console.log(`[submit-survey] Recebido: ticket=${ticketId}, rating=${rating}, reasonId=${reasonId}`);

  if (!ticketId || rating === undefined) {
    return res.status(400).json({ error: 'ticketId and rating are required' });
  }

  try {
    const webhookUrl = process.env.ZENDESK_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error('ZENDESK_WEBHOOK_URL not configured');
    }

    // PAYLOAD COM TICKET ID INCLUÍDO
    const payload = {
      ticket_id: String(ticketId),
      survey_response: {
        answers: [
          {
            question_id: '01JBW4BRF29N010EJ6HCYHDZHK',
            rating: rating,
            type: 'rating_scale'
          },
          {
            question_id: '01JBW4BRF22AJ4KAFQD72PP4KC',
            selections: [
              {
                type: 'pre_defined',
                value: reasonId || null
              }
            ],
            type: 'closed_ended'
          },
          {
            question_id: '01JBW4BRF2MHZ4CYGTQS2XWG1H',
            type: 'open_ended',
            value: impressions || null
          }
        ],
        locale: 'en-us'
      }
    };

    console.log(`[submit-survey] Enviando payload: ${JSON.stringify(payload, null, 2)}`);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log(`[submit-survey] Webhook status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[submit-survey] Webhook error response: ${errorText}`);
      return res.status(response.status).json({ 
        error: `Webhook failed: ${response.status}` 
      });
    }

    const responseData = await response.text();
    console.log(`[submit-survey] Webhook success response: ${responseData}`);

    return res.status(200).json({ 
      success: true, 
      message: 'Survey submitted successfully' 
    });
  } catch (error) {
    console.error('[submit-survey] Erro:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
