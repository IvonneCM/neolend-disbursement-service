const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

/**
 * Modelo: collection.payments
 * Registra cada pago realizado contra una cuota.
 */
const Payment = sequelize.define(
  'Payment',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    loan_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    installment_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    payment_reference: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    paid_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'payments',
    schema: 'collection',
    timestamps: false,
  }
);

module.exports = Payment;
