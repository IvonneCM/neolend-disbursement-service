/**
 * routes/notification.routes.js
 *
 * POST /api/notifications/send                      – Envío genérico
 * POST /api/notifications/payment-reminder          – Recordatorio de cuota
 * POST /api/notifications/disbursement-confirmation – Confirmación de desembolso
 * POST /api/notifications/overdue-warning           – Aviso de mora
 * GET  /api/notifications/history/:userId           – Historial de un usuario
 */

const { Router } = require('express');
const { body } = require('express-validator');
const {
  sendNotification,
  sendPaymentReminder,
  sendDisbursementConfirmation,
  sendOverdueWarning,
  getNotificationHistory,
} = require('../controllers/NotificationController');

const router = Router();

// ──────────────────────────────────────────────────────────────
// POST /api/notifications/send
// ──────────────────────────────────────────────────────────────
router.post(
  '/send',
  [
    body('channel')
      .isIn(['WHATSAPP', 'SMS', 'EMAIL'])
      .withMessage('channel debe ser WHATSAPP, SMS o EMAIL'),
    body('recipient').notEmpty().withMessage('recipient es requerido'),
    body('message').notEmpty().withMessage('message es requerido'),
  ],
  sendNotification
);

// ──────────────────────────────────────────────────────────────
// POST /api/notifications/payment-reminder
// (llamado internamente por collection-service)
// ──────────────────────────────────────────────────────────────
router.post('/payment-reminder', sendPaymentReminder);

// ──────────────────────────────────────────────────────────────
// POST /api/notifications/disbursement-confirmation
// (llamado internamente por disbursement-service)
// ──────────────────────────────────────────────────────────────
router.post('/disbursement-confirmation', sendDisbursementConfirmation);

// ──────────────────────────────────────────────────────────────
// POST /api/notifications/overdue-warning
// (llamado internamente por collection-service al reportar mora)
// ──────────────────────────────────────────────────────────────
router.post('/overdue-warning', sendOverdueWarning);

// ──────────────────────────────────────────────────────────────
// GET /api/notifications/history/:userId
// (consumido por el frontend para mostrar notificaciones al usuario)
// ──────────────────────────────────────────────────────────────
router.get('/history/:userId', getNotificationHistory);

module.exports = router;
