/**
 * helpers/channelSender.js
 * Simula el envío de mensajes por WhatsApp, SMS y Email.
 * En producción integraría con Twilio (SMS/WhatsApp) y SendGrid (Email).
 * Retorna respuesta JSON y loguea en consola para que el frontend pueda consumirlo.
 */

/**
 * Simula envío por WhatsApp
 */
const sendWhatsApp = async ({ recipient, message }) => {
  console.log(`[NOTIFICATION][WHATSAPP] → ${recipient}: "${message}"`);
  // Simula latencia de API externa
  await delay(200);
  return {
    channel: 'WHATSAPP',
    provider: 'Twilio WhatsApp API (simulado)',
    recipient,
    message_id: `WA-${Date.now()}`,
    status: 'SENT',
    sent_at: new Date().toISOString(),
  };
};

/**
 * Simula envío por SMS
 */
const sendSMS = async ({ recipient, message }) => {
  console.log(`[NOTIFICATION][SMS] → ${recipient}: "${message}"`);
  await delay(150);
  return {
    channel: 'SMS',
    provider: 'Twilio SMS API (simulado)',
    recipient,
    message_id: `SMS-${Date.now()}`,
    status: 'SENT',
    sent_at: new Date().toISOString(),
  };
};

/**
 * Simula envío por Email
 */
const sendEmail = async ({ recipient, subject, message }) => {
  console.log(`[NOTIFICATION][EMAIL] → ${recipient} | Asunto: "${subject}" | Body: "${message}"`);
  await delay(300);
  return {
    channel: 'EMAIL',
    provider: 'SendGrid API (simulado)',
    recipient,
    subject,
    message_id: `EMAIL-${Date.now()}`,
    status: 'SENT',
    sent_at: new Date().toISOString(),
  };
};

/**
 * Despachador por canal
 */
const sendByChannel = async (channel, payload) => {
  switch (channel) {
    case 'WHATSAPP':
      return sendWhatsApp(payload);
    case 'SMS':
      return sendSMS(payload);
    case 'EMAIL':
      return sendEmail(payload);
    default:
      throw new Error(`Canal de notificación no soportado: ${channel}`);
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { sendByChannel };
