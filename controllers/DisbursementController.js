/**
 * controllers/DisbursementController.js
 *
 * Rutas manejadas:
 *   POST /api/disbursements/wallet
 *   POST /api/disbursements/bank
 *   POST /api/disbursements/correspondent
 *   GET  /api/disbursements/:creditId
 *   PATCH /api/disbursements/:id/status
 */

const { validationResult } = require('express-validator');
const Disbursement = require('../models/Disbursement');
const { dispatchChannel } = require('../helpers/channelSimulator');
const { notifyDisbursementCompleted } = require('../helpers/notificationClient');

// ──────────────────────────────────────────────────────────────
// Helper: crear y procesar un desembolso genérico
// ──────────────────────────────────────────────────────────────
const createAndProcess = async (req, res, channel) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, errors: errors.array() });
  }

  const { loan_id, applicant_id, amount, destination_account } = req.body;

  try {
    // 1. Crear registro en estado PENDING
    const disbursement = await Disbursement.create({
      loan_id,
      applicant_id,
      amount,
      channel,
      destination_account: destination_account || null,
      status: 'PENDING',
    });

    // 2. Actualizar a PROCESSING
    await disbursement.update({ status: 'PROCESSING' });
    console.log(`[DISBURSEMENT] Procesando id=${disbursement.id} canal=${channel}`);

    // 3. Llamar al simulador del canal
    const result = await dispatchChannel(channel, { amount, destination_account, applicant_id });

    if (!result.success) {
      await disbursement.update({ status: 'FAILED' });
      return res.status(502).json({
        ok: false,
        message: 'El canal de desembolso reportó un error',
        disbursement_id: disbursement.id,
      });
    }

    // 4. Marcar como COMPLETED
    await disbursement.update({
      status: 'COMPLETED',
      provider_reference: result.reference,
      completed_at: new Date(),
    });

    console.log(`[DISBURSEMENT] Completado id=${disbursement.id} referencia=${result.reference}`);

    // 5. Notificar al solicitante (fuego y olvido, no bloquea la respuesta)
    notifyDisbursementCompleted({
      applicant_id,
      amount,
      channel,
      reference: result.reference,
    });

    return res.status(201).json({
      ok: true,
      message: `Desembolso por canal ${channel} procesado exitosamente`,
      data: {
        ...disbursement.toJSON(),
        provider_result: result,
      },
    });
  } catch (error) {
    console.error(`[DISBURSEMENT] Error al procesar desembolso: ${error.message}`);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/disbursements/wallet
// ──────────────────────────────────────────────────────────────
const disbursementWallet = async (req, res) => {
  return createAndProcess(req, res, 'WALLET');
};

// ──────────────────────────────────────────────────────────────
// POST /api/disbursements/bank
// ──────────────────────────────────────────────────────────────
const disbursementBank = async (req, res) => {
  return createAndProcess(req, res, 'BANK');
};

// ──────────────────────────────────────────────────────────────
// POST /api/disbursements/correspondent
// ──────────────────────────────────────────────────────────────
const disbursementCorrespondent = async (req, res) => {
  return createAndProcess(req, res, 'CORRESPONDENT');
};

// ──────────────────────────────────────────────────────────────
// GET /api/disbursements/:creditId
// Obtiene todos los desembolsos de un loan_id
// ──────────────────────────────────────────────────────────────
const getDisbursementsByCreditId = async (req, res) => {
  const { creditId } = req.params;

  try {
    const disbursements = await Disbursement.findAll({
      where: { loan_id: creditId },
      order: [['requested_at', 'DESC']],
    });

    return res.status(200).json({
      ok: true,
      count: disbursements.length,
      data: disbursements,
    });
  } catch (error) {
    console.error(`[DISBURSEMENT] Error al obtener desembolsos: ${error.message}`);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// PATCH /api/disbursements/:id/status
// Actualización manual de estado (para uso interno o admin)
// ──────────────────────────────────────────────────────────────
const updateDisbursementStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      ok: false,
      message: `Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`,
    });
  }

  try {
    const disbursement = await Disbursement.findByPk(id);
    if (!disbursement) {
      return res.status(404).json({ ok: false, message: 'Desembolso no encontrado' });
    }

    const updatePayload = { status };
    if (status === 'COMPLETED') updatePayload.completed_at = new Date();

    await disbursement.update(updatePayload);
    console.log(`[DISBURSEMENT] Estado actualizado id=${id} nuevo_estado=${status}`);

    return res.status(200).json({
      ok: true,
      message: 'Estado actualizado correctamente',
      data: disbursement,
    });
  } catch (error) {
    console.error(`[DISBURSEMENT] Error al actualizar estado: ${error.message}`);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor', error: error.message });
  }
};

module.exports = {
  disbursementWallet,
  disbursementBank,
  disbursementCorrespondent,
  getDisbursementsByCreditId,
  updateDisbursementStatus,
};
