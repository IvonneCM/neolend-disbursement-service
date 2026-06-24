/**
 * helpers/notificationClient.js
 * En monorepo: llama directo al channelSender, sin fetch.
 */

const { sendByChannel } = require('./channelSender');

/** Confirmación de desembolso — llamado desde DisbursementController */
const notifyDisbursementCompleted = async ({ applicant_id, amount, channel, reference }) => {
  try {
    const message = `✅ NeoLend: Tu crédito de $${amount} fue desembolsado por ${channel}. Ref: ${reference}. ¡Buena suerte!`;

    console.log(`[NOTIFICATION] Enviando confirmación de desembolso a solicitante=${applicant_id}`);

    await Promise.allSettled([
      sendByChannel('WHATSAPP', { recipient: '+59171111111', message }),
      sendByChannel('EMAIL',    { recipient: 'solicitante@neolend.com', subject: '✅ Tu crédito fue desembolsado', message }),
    ]);
  } catch (err) {
    console.error(`[NOTIFICATION] Error en notifyDisbursementCompleted: ${err.message}`);
  }
};

/** Recordatorio de pago — llamado desde CollectionController */
const sendPaymentReminder = async ({ applicant_id, installment_number, due_date, amount }) => {
  try {
    const message = `🔔 NeoLend: Tu cuota #${installment_number} de $${amount} vence el ${due_date}. ¡Paga a tiempo!`;

    await Promise.allSettled([
      sendByChannel('WHATSAPP', { recipient: '+59171111111', message }),
      sendByChannel('SMS',      { recipient: '+59171111111', message }),
    ]);
  } catch (err) {
    console.error(`[NOTIFICATION] Error en sendPaymentReminder: ${err.message}`);
  }
};

/** Aviso de mora — llamado desde CollectionController */
const sendOverdueWarning = async ({ applicant_id, loan_id, days_overdue, amount }) => {
  try {
    const message = `⚠️ NeoLend URGENTE: Tu préstamo tiene ${days_overdue} días en mora. Monto vencido: $${amount}. Llama al 800-NEOLEND.`;

    await Promise.allSettled([
      sendByChannel('WHATSAPP', { recipient: '+59171111111', message }),
      sendByChannel('SMS',      { recipient: '+59171111111', message }),
      sendByChannel('EMAIL',    { recipient: 'solicitante@neolend.com', subject: '⚠️ Alerta de mora NeoLend', message }),
    ]);
  } catch (err) {
    console.error(`[NOTIFICATION] Error en sendOverdueWarning: ${err.message}`);
  }
};

module.exports = { notifyDisbursementCompleted, sendPaymentReminder, sendOverdueWarning };