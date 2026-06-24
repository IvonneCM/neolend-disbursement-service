/**
 * controllers/CollectionController.js
 *
 * GET  /api/collections/loan/:creditId        – Cuotas de un préstamo
 * POST /api/collections/payment               – Registrar un pago
 * POST /api/collections/payment-agreement     – Crear acuerdo de pago
 * POST /api/collections/restructure           – Reestructurar préstamo
 * POST /api/collections/report-to-bureau      – Reportar mora al buró
 * POST /api/collections/generate-installments – Generar cuotas (llamado interno)
 */

const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const Installment = require('../models/Installment');
const Payment = require('../models/Payment');
const PaymentAgreement = require('../models/PaymentAgreement');
const { generateAmortizationSchedule } = require('../helpers/amortization');
const { sendPaymentReminder, sendOverdueWarning } = require('../helpers/notificationClient');

// ──────────────────────────────────────────────────────────────
// GET /api/collections/loan/:creditId
// Devuelve el plan de cuotas del préstamo con su estado actual
// ──────────────────────────────────────────────────────────────
const getLoanInstallments = async (req, res) => {
  const { creditId } = req.params;

  try {
    const installments = await Installment.findAll({
      where: { loan_id: creditId },
      order: [['installment_number', 'ASC']],
    });

    if (!installments.length) {
      return res.status(404).json({
        ok: false,
        message: 'No se encontraron cuotas para este préstamo',
      });
    }

    // Estadísticas del préstamo
    const total = installments.length;
    const paid = installments.filter((i) => i.status === 'PAID').length;
    const overdue = installments.filter((i) => i.status === 'OVERDUE').length;
    const pending = installments.filter((i) => i.status === 'PENDING').length;

    return res.status(200).json({
      ok: true,
      loan_id: creditId,
      summary: { total, paid, overdue, pending },
      data: installments,
    });
  } catch (error) {
    console.error(`[COLLECTION] Error getLoanInstallments: ${error.message}`);
    return res.status(500).json({ ok: false, message: 'Error interno', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/collections/payment
// Body: { loan_id, installment_id, amount, payment_method, payment_reference }
// ──────────────────────────────────────────────────────────────
const registerPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, errors: errors.array() });
  }

  const { loan_id, installment_id, amount, payment_method, payment_reference } = req.body;

  try {
    // 1. Registrar el pago
    const payment = await Payment.create({
      loan_id,
      installment_id: installment_id || null,
      amount,
      payment_method: payment_method || 'CASH',
      payment_reference: payment_reference || `PAY-${Date.now()}`,
    });

    // 2. Si viene con installment_id, marcarla como PAID
    if (installment_id) {
      const installment = await Installment.findByPk(installment_id);
      if (installment && installment.loan_id === loan_id) {
        await installment.update({ status: 'PAID', paid_at: new Date() });
        console.log(`[COLLECTION] Cuota ${installment.installment_number} marcada PAID para loan ${loan_id}`);
      }
    }

    console.log(`[COLLECTION] Pago registrado id=${payment.id} monto=$${amount} loan=${loan_id}`);

    return res.status(201).json({
      ok: true,
      message: 'Pago registrado exitosamente',
      data: payment,
    });
  } catch (error) {
    console.error(`[COLLECTION] Error registerPayment: ${error.message}`);
    return res.status(500).json({ ok: false, message: 'Error interno', error: error.message });
  }
};

const getLoanByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    const sequelize = require('../database/config');
    const [result] = await sequelize.query(`
      SELECT 
        l.id            AS loan_id,
        l.approved_amount,
        l.interest_rate,
        l.term_months,
        l.status,
        a.id            AS applicant_id
      FROM auth.users u
      JOIN applicant.applicants a          ON a.user_id = u.id
      JOIN credit.credit_applications ca   ON ca.applicant_id = a.id
      JOIN credit.loans l                  ON l.application_id = ca.id
      WHERE u.id = :userId
        AND l.status = 'ACTIVE'
      LIMIT 1
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT,
    });

    if (!result) {
      return res.status(404).json({ ok: false, message: 'No hay préstamo activo para este usuario' });
    }
    return res.status(200).json({ ok: true, data: result });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/collections/payment-agreement
// Body: { loan_id, agreement_type, description, new_due_date, new_amount }
// ──────────────────────────────────────────────────────────────
const createPaymentAgreement = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, errors: errors.array() });
  }

  const { loan_id, agreement_type, description, new_due_date, new_amount } = req.body;

  try {
    const agreement = await PaymentAgreement.create({
      loan_id,
      agreement_type: agreement_type || 'PAYMENT_PLAN',
      description,
      new_due_date: new_due_date || null,
      new_amount: new_amount || null,
      status: 'ACTIVE',
    });

    console.log(`[COLLECTION] Acuerdo de pago creado id=${agreement.id} tipo=${agreement.agreement_type} loan=${loan_id}`);

    return res.status(201).json({
      ok: true,
      message: 'Acuerdo de pago creado exitosamente',
      data: agreement,
    });
  } catch (error) {
    console.error(`[COLLECTION] Error createPaymentAgreement: ${error.message}`);
    return res.status(500).json({ ok: false, message: 'Error interno', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/collections/restructure
// Body: { loan_id, new_term_months, new_amount, reason }
// Reestructura el préstamo: cancela cuotas anteriores y genera nuevas
// ──────────────────────────────────────────────────────────────
const restructureLoan = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, errors: errors.array() });
  }

  const { loan_id, new_term_months, new_principal, annual_rate = 18, reason } = req.body;

  try {
    // 1. Marcar cuotas pendientes como RESTRUCTURED
    const [updatedCount] = await Installment.update(
      { status: 'RESTRUCTURED' },
      {
        where: {
          loan_id,
          status: { [Op.in]: ['PENDING', 'OVERDUE'] },
        },
      }
    );

    console.log(`[COLLECTION] ${updatedCount} cuotas marcadas RESTRUCTURED para loan=${loan_id}`);

    // 2. Generar nuevo plan de cuotas
    const schedule = generateAmortizationSchedule(
      new_principal,
      annual_rate,
      new_term_months,
      new Date()
    );

    const newInstallments = await Installment.bulkCreate(
      schedule.map((s) => ({ ...s, loan_id }))
    );

    // 3. Registrar acuerdo de reestructuración
    const agreement = await PaymentAgreement.create({
      loan_id,
      agreement_type: 'RESTRUCTURE',
      description: reason || 'Reestructuración solicitada por el cliente',
      status: 'ACTIVE',
    });

    console.log(`[COLLECTION] Reestructuración completada loan=${loan_id} nuevas_cuotas=${newInstallments.length}`);

    return res.status(200).json({
      ok: true,
      message: 'Préstamo reestructurado exitosamente',
      data: {
        agreement,
        restructured_installments: updatedCount,
        new_installments: newInstallments,
      },
    });
  } catch (error) {
    console.error(`[COLLECTION] Error restructureLoan: ${error.message}`);
    return res.status(500).json({ ok: false, message: 'Error interno', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/collections/report-to-bureau
// Body: { loan_id, applicant_id, days_overdue, amount_overdue }
// Simula reporte de mora al buró de crédito
// ──────────────────────────────────────────────────────────────
const reportToBureau = async (req, res) => {
  const { loan_id, applicant_id, days_overdue, amount_overdue } = req.body;

  if (!loan_id || !applicant_id) {
    return res.status(400).json({ ok: false, message: 'loan_id y applicant_id son requeridos' });
  }

  try {
    // Simula llamada SOAP al buró (en producción: Circuit Breaker + cache)
    console.log(`[COLLECTION][BUREAU] Reportando mora: loan=${loan_id} solicitante=${applicant_id} días=${days_overdue} monto=$${amount_overdue}`);

    const bureauReport = {
      reported: true,
      loan_id,
      applicant_id,
      days_overdue,
      amount_overdue,
      bureau_reference: `BUREAU-${Date.now()}`,
      reported_at: new Date().toISOString(),
      note: 'Reporte simulado — integración SOAP con buró principal pendiente',
    };

    // Notificar al solicitante sobre el reporte
    sendOverdueWarning({ applicant_id, loan_id, days_overdue, amount: amount_overdue });

    console.log(`[COLLECTION][BUREAU] Reporte enviado referencia=${bureauReport.bureau_reference}`);

    return res.status(200).json({
      ok: true,
      message: 'Reporte de mora enviado al buró de crédito',
      data: bureauReport,
    });
  } catch (error) {
    console.error(`[COLLECTION] Error reportToBureau: ${error.message}`);
    return res.status(500).json({ ok: false, message: 'Error interno', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/collections/generate-installments
// Endpoint interno: recibe un préstamo aprobado y genera las cuotas
// Body: { loan_id, principal, annual_rate, term_months, start_date? }
// ──────────────────────────────────────────────────────────────
const generateInstallments = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, errors: errors.array() });
  }

  const { loan_id, principal, annual_rate = 18, term_months, start_date } = req.body;

  try {
    // Verificar si ya existen cuotas para evitar duplicados
    const existing = await Installment.count({ where: { loan_id } });
    if (existing > 0) {
      return res.status(409).json({
        ok: false,
        message: `Ya existen ${existing} cuotas para el préstamo ${loan_id}`,
      });
    }

    const startDate = start_date ? new Date(start_date) : new Date();
    const schedule = generateAmortizationSchedule(principal, annual_rate, term_months, startDate);

    const installments = await Installment.bulkCreate(
      schedule.map((s) => ({ ...s, loan_id }))
    );

    console.log(`[COLLECTION] ${installments.length} cuotas generadas para loan=${loan_id} monto=$${principal} plazo=${term_months}m`);

    return res.status(201).json({
      ok: true,
      message: `${installments.length} cuotas generadas exitosamente`,
      data: {
        loan_id,
        principal,
        annual_rate,
        term_months,
        total_installments: installments.length,
        first_due: installments[0]?.due_date,
        last_due: installments[installments.length - 1]?.due_date,
        installments,
      },
    });
  } catch (error) {
    console.error(`[COLLECTION] Error generateInstallments: ${error.message}`);
    return res.status(500).json({ ok: false, message: 'Error interno', error: error.message });
  }
};

module.exports = {
  getLoanInstallments,
  registerPayment,
  createPaymentAgreement,
  restructureLoan,
  reportToBureau,
  generateInstallments,
  getLoanByUserId,
};
