/**
 * routes/collection.routes.js
 *
 * GET  /api/collections/loan/:creditId        – Cuotas del préstamo
 * POST /api/collections/payment               – Registrar pago
 * POST /api/collections/payment-agreement     – Crear acuerdo de pago
 * POST /api/collections/restructure           – Reestructurar préstamo
 * POST /api/collections/report-to-bureau      – Reportar mora al buró
 * POST /api/collections/generate-installments – Generar cuotas (uso interno)
 */

const { Router } = require('express');
const { body } = require('express-validator');
const {
  getLoanInstallments,
  registerPayment,
  createPaymentAgreement,
  restructureLoan,
  reportToBureau,
  generateInstallments,
  getLoanByUserId,
} = require('../controllers/CollectionController');

const router = Router();

// ──────────────────────────────────────────────────────────────
// GET /api/collections/loan/:creditId
// ──────────────────────────────────────────────────────────────
router.get('/loan/:creditId', getLoanInstallments);

// ──────────────────────────────────────────────────────────────
// POST /api/collections/payment
// ──────────────────────────────────────────────────────────────
router.post(
  '/payment',
  [
    body('loan_id'),
    body('amount').isFloat({ min: 0.01 }).withMessage('amount debe ser positivo'),
  ],
  registerPayment
);

// ──────────────────────────────────────────────────────────────
// POST /api/collections/payment-agreement
// ──────────────────────────────────────────────────────────────
router.post(
  '/payment-agreement',
  [
    body('loan_id'),
    body('agreement_type')
      .optional()
      .isIn(['PAYMENT_PLAN', 'RESTRUCTURE', 'GRACE_PERIOD'])
      .withMessage('agreement_type inválido'),
  ],
  createPaymentAgreement
);

// ──────────────────────────────────────────────────────────────
// POST /api/collections/restructure
// ──────────────────────────────────────────────────────────────
router.post(
  '/restructure',
  [
    body('loan_id'),
    body('new_term_months').isInt({ min: 1 }).withMessage('new_term_months debe ser entero positivo'),
    body('new_principal').isFloat({ min: 1 }).withMessage('new_principal debe ser positivo'),
  ],
  restructureLoan
);

router.get('/loan-by-user/:userId', getLoanByUserId);
// ──────────────────────────────────────────────────────────────
// POST /api/collections/report-to-bureau
// ──────────────────────────────────────────────────────────────
router.post('/report-to-bureau', reportToBureau);

// ──────────────────────────────────────────────────────────────
// POST /api/collections/generate-installments  (uso interno)
// ──────────────────────────────────────────────────────────────
router.post(
  '/generate-installments',
  [
    body('loan_id'),
    body('principal').isFloat({ min: 1 }).withMessage('principal debe ser positivo'),
    body('term_months').isInt({ min: 1 }).withMessage('term_months debe ser entero positivo'),
  ],
  generateInstallments
);

module.exports = router;
