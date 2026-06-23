/**
 * helpers/channelSimulator.js
 * Simula las integraciones con billeteras, bancos y corresponsales.
 * En producción estos métodos llamarían a APIs reales.
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Simula el envío a billetera digital (Tigo Money, PayPal, etc.)
 */
const processWallet = async ({ amount, destination_account, applicant_id }) => {
  console.log(`[DISBURSEMENT][WALLET] Procesando desembolso de $${amount} a wallet ${destination_account} para solicitante ${applicant_id}`);
  // Simula latencia de integración
  await delay(500);
  return {
    success: true,
    provider: 'NeoLend Wallet Gateway',
    reference: `WALLET-${uuidv4().split('-')[0].toUpperCase()}`,
    channel: 'WALLET',
  };
};

/**
 * Simula transferencia bancaria
 */
const processBank = async ({ amount, destination_account, applicant_id }) => {
  console.log(`[DISBURSEMENT][BANK] Transfiriendo $${amount} a cuenta ${destination_account} para solicitante ${applicant_id}`);
  await delay(800);
  return {
    success: true,
    provider: 'NeoLend Banking Bridge',
    reference: `BANK-${uuidv4().split('-')[0].toUpperCase()}`,
    channel: 'BANK',
  };
};

/**
 * Simula pago en corresponsal bancario
 */
const processCorrespondent = async ({ amount, destination_account, applicant_id }) => {
  console.log(`[DISBURSEMENT][CORRESPONDENT] Generando código de retiro $${amount} corresponsal ${destination_account} solicitante ${applicant_id}`);
  await delay(300);
  return {
    success: true,
    provider: 'NeoLend Correspondent Network',
    reference: `CORR-${uuidv4().split('-')[0].toUpperCase()}`,
    channel: 'CORRESPONDENT',
    pickup_code: Math.floor(100000 + Math.random() * 900000).toString(),
  };
};

/**
 * Simula desembolso en efectivo
 */
const processCash = async ({ amount, applicant_id }) => {
  console.log(`[DISBURSEMENT][CASH] Preparando efectivo $${amount} para solicitante ${applicant_id}`);
  await delay(200);
  return {
    success: true,
    provider: 'NeoLend Cash Desk',
    reference: `CASH-${uuidv4().split('-')[0].toUpperCase()}`,
    channel: 'CASH',
  };
};

/**
 * Despachador por canal
 */
const dispatchChannel = async (channel, payload) => {
  switch (channel) {
    case 'WALLET':
      return processWallet(payload);
    case 'BANK':
      return processBank(payload);
    case 'CORRESPONDENT':
      return processCorrespondent(payload);
    case 'CASH':
      return processCash(payload);
    default:
      throw new Error(`Canal de desembolso no soportado: ${channel}`);
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { dispatchChannel };
