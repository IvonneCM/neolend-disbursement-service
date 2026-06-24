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
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const sendEmail = async ({ recipient, subject, message }) => {
  console.log(`[NOTIFICATION][EMAIL] → ${recipient} | ${subject}`);
  
  await transporter.sendMail({
    from: `"NeoLend Financial" <${process.env.GMAIL_USER}>`,
    to: recipient,
    subject: subject || 'Notificación NeoLend',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #6366f1;">NeoLend Financial Corp</h2>
        <p>${message}</p>
        <hr/>
        <small style="color: #94a3b8;">Este es un mensaje automático, no responder.</small>
      </div>
    `,
  });

  return {
    channel: 'EMAIL',
    provider: 'Gmail SMTP',
    recipient: process.env.GMAIL_USER,
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
