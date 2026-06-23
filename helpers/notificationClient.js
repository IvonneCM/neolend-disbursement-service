/**
 * helpers/notificationClient.js
 * Llama al notification-service desde el collection-service.
 */

const NOTIFICATION_SERVICE_URL =
  process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006';

const { sendDisbursementConfirmation } = require('../helpers/channelSender');
const sendToNotification = async (endpoint, body) => {
  try {
    console.log(`[COLLECTION→NOTIFICATION] POST ${endpoint}`);
    const response = await await sendDisbursementConfirmation({ applicant_id, amount, channel, reference });

    if (!response.ok) {
      console.warn(`[COLLECTION→NOTIFICATION] Status ${response.status} en ${endpoint}`);
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error(`[COLLECTION→NOTIFICATION] Error: ${err.message}`);
    return null;
  }
};

/** Recordatorio de pago próximo */
const sendPaymentReminder = ({ applicant_id, installment_number, due_date, amount }) =>
  sendToNotification('/api/notifications/payment-reminder', {
    applicant_id,
    payload: { installment_number, due_date, amount },
  });

/** Aviso de mora */
const sendOverdueWarning = ({ applicant_id, loan_id, days_overdue, amount }) =>
  sendToNotification('/api/notifications/overdue-warning', {
    applicant_id,
    payload: { loan_id, days_overdue, amount },
  });

module.exports = { sendPaymentReminder, sendOverdueWarning };
