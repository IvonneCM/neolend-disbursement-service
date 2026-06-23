const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

/**
 * Modelo: collection.payment_agreements
 * Acuerdos de pago y reestructuraciones de préstamos en mora.
 */
const PaymentAgreement = sequelize.define(
  'PaymentAgreement',
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
    agreement_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'PAYMENT_PLAN | RESTRUCTURE | GRACE_PERIOD',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    new_due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    new_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(30),
      defaultValue: 'ACTIVE',
      validate: {
        isIn: [['ACTIVE', 'FULFILLED', 'BROKEN', 'CANCELLED']],
      },
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'payment_agreements',
    schema: 'collection',
    timestamps: false,
  }
);

module.exports = PaymentAgreement;
