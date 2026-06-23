/**
 * controllers/NotificationController.js
 *
 * POST /api/notifications/send                     – Envío genérico
 * POST /api/notifications/payment-reminder         – Recordatorio de pago
 * POST /api/notifications/disbursement-confirmation – Confirmación de desembolso
 * POST /api/notifications/overdue-warning          – Aviso de mora
 * GET  /api/notifications/history/:userId          – Historial de notificaciones
 */

const { validationResult } = require('express-validator');
const Notification = require('../models/Notification');
const { sendByChannel } = require('../helpers/channelSender');

// ──────────────────────────────────────────────────────────────
// Helper interno: guarda y envía la notificación
// ──────────────────────────────────────────────────────────────
const persistAndSend = async ({ user_id, channel, recipient, subject, message, entity_type, entity_id }) => {
  if (process.env.NOTIFICATIONS_ENABLED === 'false') {
    console.log(`[NOTIFICATION] Notificaciones deshabilitadas, omitiendo envío a ${recipient}`);
    return { skipped: true };
  }

  // 1. Guardar en DB como PENDING
  const notification = await Notification.create({
    user_id: user_id || null,
    channel,
    recipient,
    subject: subject || null,
    message,
    status: 'PENDING',
    related_entity_type: entity_type || null,
    related_entity_id: entity_id || null,
  });

  // 2. Enviar por el canal
  try {
    const result = await sendByChannel(channel, { recipient, subject, message });
    await notification.update({ status: 'SENT', sent_at: new Date() });
    return { notification, provider_result: result };
  } catch (err) {
    await notification.update({ status: 'FAILED' });
    console.error(`[NOTIFICATION] Fallo al enviar por ${channel}: ${err.message}`);
    return { notification, error: err.message };
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/notifications/send  (genérico)
// Body: { user_id?, channel, recipient, subject?, message, entity_type?, entity_id? }
// ──────────────────────────────────────────────────────────────
const sendNotification = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, errors: errors.array() });
  }

  const { user_id, channel, recipient, subject, message, entity_type, entity_id } = req.body;

  try {
    const result = await persistAndSend({ user_id, channel, recipient, subject, message, entity_type, entity_id });
    return res.status(201).json({
      ok: true,
      message: `Notificación enviada por ${channel}`,
      data: result,
    });
  } catch (error) {
    console.error(`[NOTIFICATION] Error sendNotification: ${error.message}`);
    return res.status(500).json({ ok: false, message: 'Error interno', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/notifications/payment-reminder
// Llamado por collection-service cuando una cuota está próxima a vencer
// Body: { applicant_id, payload: { installment_number, due_date, amount } }
// ──────────────────────────────────────────────────────────────
const sendPaymentReminder = async (req, res) => {
  const { applicant_id, payload } = req.body;

  if (!applicant_id || !payload) {
    return res.status(400).json({ ok: false, message: 'applicant_id y payload son requeridos' });
  }

  const { installment_number, due_date, amount } = payload;
  const message = `🔔 NeoLend: Tu cuota #${installment_number} de $${amount} vence el ${due_date}. ¡Paga a tiempo y mantén tu historial!`;

  try {
    // Enviar por los 3 canales en paralelo
    const [whatsapp, sms] = await Promise.allSettled([
      persistAndSend({
        user_id: applicant_id,
        channel: 'WHATSAPP',
        recipient: `+591XXXXXXXX`, // En producción: buscar teléfono del solicitante
        message,
        entity_type: 'INSTALLMENT',
        entity_id: applicant_id,
      }),
      persistAndSend({
        user_id: applicant_id,
        channel: 'SMS',
        recipient: `+591XXXXXXXX`,
        message,
        entity_type: 'INSTALLMENT',
      }),
    ]);

    console.log(`[NOTIFICATION] Recordatorio de pago enviado para solicitante=${applicant_id} cuota=${installment_number}`);

    return res.status(200).json({
      ok: true,
      message: 'Recordatorio de pago enviado',
      data: { whatsapp: whatsapp.value, sms: sms.value },
    });
  } catch (error) {
    console.error(`[NOTIFICATION] Error sendPaymentReminder: ${error.message}`);
    return res.status(500).json({ ok: false, message: 'Error interno', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/notifications/disbursement-confirmation
// Llamado por disbursement-service cuando el dinero es enviado
// Body: { applicant_id, payload: { amount, channel, reference, message } }
// ──────────────────────────────────────────────────────────────
const sendDisbursementConfirmation = async (req, res) => {
  const { applicant_id, payload } = req.body;

  if (!applicant_id || !payload) {
    return res.status(400).json({ ok: false, message: 'applicant_id y payload son requeridos' });
  }

  const { amount, channel, reference, message: customMessage } = payload;
  const message =
    customMessage ||
    `✅ NeoLend: Tu crédito de $${amount} fue desembolsado por ${channel}. Ref: ${reference}. ¡Buena suerte!`;

  try {
    const [whatsapp, email] = await Promise.allSettled([
      persistAndSend({
        user_id: applicant_id,
        channel: 'WHATSAPP',
        recipient: '+591XXXXXXXX',
        message,
        entity_type: 'DISBURSEMENT',
        entity_id: applicant_id,
      }),
      persistAndSend({
        user_id: applicant_id,
        channel: 'EMAIL',
        recipient: 'solicitante@example.com',
        subject: '✅ Tu crédito NeoLend fue desembolsado',
        message,
        entity_type: 'DISBURSEMENT',
      }),
    ]);

    console.log(`[NOTIFICATION] Confirmación de desembolso enviada para solicitante=${applicant_id} referencia=${reference}`);

    return res.status(200).json({
      ok: true,
      message: 'Confirmación de desembolso enviada',
      data: { whatsapp: whatsapp.value, email: email.value },
    });
  } catch (error) {
    console.error(`[NOTIFICATION] Error sendDisbursementConfirmation: ${error.message}`);
    return res.status(500).json({ ok: false, message: 'Error interno', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/notifications/overdue-warning
// Llamado por collection-service cuando hay mora
// Body: { applicant_id, payload: { loan_id, days_overdue, amount } }
// ──────────────────────────────────────────────────────────────
const sendOverdueWarning = async (req, res) => {
  const { applicant_id, payload } = req.body;

  if (!applicant_id || !payload) {
    return res.status(400).json({ ok: false, message: 'applicant_id y payload son requeridos' });
  }

  const { loan_id, days_overdue, amount } = payload;
  const message = `⚠️ NeoLend URGENTE: Tu préstamo tiene ${days_overdue} días en mora. Monto vencido: $${amount}. Contáctanos para evitar reporte al buró. Llama al 800-NEOLEND.`;

  try {
    const [whatsapp, sms, email] = await Promise.allSettled([
      persistAndSend({
        user_id: applicant_id,
        channel: 'WHATSAPP',
        recipient: '+591XXXXXXXX',
        message,
        entity_type: 'LOAN',
        entity_id: loan_id,
      }),
      persistAndSend({
        user_id: applicant_id,
        channel: 'SMS',
        recipient: '+591XXXXXXXX',
        message,
        entity_type: 'LOAN',
      }),
      persistAndSend({
        user_id: applicant_id,
        channel: 'EMAIL',
        recipient: 'solicitante@example.com',
        subject: '⚠️ Alerta de mora en tu préstamo NeoLend',
        message,
        entity_type: 'LOAN',
      }),
    ]);

    console.log(`[NOTIFICATION] Aviso de mora enviado solicitante=${applicant_id} días=${days_overdue}`);

    return res.status(200).json({
      ok: true,
      message: 'Aviso de mora enviado por todos los canales',
      data: { whatsapp: whatsapp.value, sms: sms.value, email: email.value },
    });
  } catch (error) {
    console.error(`[NOTIFICATION] Error sendOverdueWarning: ${error.message}`);
    return res.status(500).json({ ok: false, message: 'Error interno', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// GET /api/notifications/history/:userId
// Historial de notificaciones de un usuario (para el frontend)
// ──────────────────────────────────────────────────────────────
const getNotificationHistory = async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  try {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Notification.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return res.status(200).json({
      ok: true,
      total: count,
      page: parseInt(page),
      total_pages: Math.ceil(count / parseInt(limit)),
      data: rows,
    });
  } catch (error) {
    console.error(`[NOTIFICATION] Error getNotificationHistory: ${error.message}`);
    return res.status(500).json({ ok: false, message: 'Error interno', error: error.message });
  }
};

module.exports = {
  sendNotification,
  sendPaymentReminder,
  sendDisbursementConfirmation,
  sendOverdueWarning,
  getNotificationHistory,
};
