/**
 * routes/disbursement.routes.js
 *
 * POST /api/disbursements/wallet        – Desembolso por billetera digital
 * POST /api/disbursements/bank          – Desembolso por transferencia bancaria
 * POST /api/disbursements/correspondent – Desembolso por corresponsal bancario
 * GET  /api/disbursements/:creditId     – Obtener desembolsos de un préstamo
 * PATCH /api/disbursements/:id/status  – Actualizar estado de un desembolso
 */

const { Router } = require('express');
const { body } = require('express-validator');
const {
  disbursementWallet,
  disbursementBank,
  disbursementCorrespondent,
  getDisbursementsByCreditId,
  updateDisbursementStatus,
} = require('../controllers/DisbursementController');

const router = Router();

// Validaciones comunes de desembolso
const disbursementValidations = [
  body('loan_id').isUUID().withMessage('loan_id debe ser un UUID válido'),
  body('applicant_id').isUUID().withMessage('applicant_id debe ser un UUID válido'),
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('amount debe ser un número positivo'),
];

// ──────────────────────────────────────────────────────────────
// POST /api/disbursements/wallet
// Body: { loan_id, applicant_id, amount, destination_account }
// ──────────────────────────────────────────────────────────────
router.post(
  '/wallet',
  [
    ...disbursementValidations,
    body('destination_account').notEmpty().withMessage('destination_account es requerido para wallet'),
  ],
  disbursementWallet
);

// ──────────────────────────────────────────────────────────────
// POST /api/disbursements/bank
// Body: { loan_id, applicant_id, amount, destination_account }
// ──────────────────────────────────────────────────────────────
router.post(
  '/bank',
  [
    ...disbursementValidations,
    body('destination_account').notEmpty().withMessage('destination_account (número de cuenta) es requerido'),
  ],
  disbursementBank
);

// ──────────────────────────────────────────────────────────────
// POST /api/disbursements/correspondent
// Body: { loan_id, applicant_id, amount, destination_account? }
// ──────────────────────────────────────────────────────────────
router.post(
  '/correspondent',
  disbursementValidations,
  disbursementCorrespondent
);

// ──────────────────────────────────────────────────────────────
// GET /api/disbursements/:creditId
// ──────────────────────────────────────────────────────────────
router.get('/:creditId', getDisbursementsByCreditId);

// ──────────────────────────────────────────────────────────────
// PATCH /api/disbursements/:id/status
// Body: { status }
// ──────────────────────────────────────────────────────────────
router.patch('/:id/status', updateDisbursementStatus);

module.exports = router;
