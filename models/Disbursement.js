const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

/**
 * Modelo: disbursement.disbursements
 * Channels: WALLET | BANK | CORRESPONDENT | CASH
 * Status:   PENDING | PROCESSING | COMPLETED | FAILED
 */
const Disbursement = sequelize.define(
  'Disbursement',
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
    applicant_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    channel: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        isIn: [['WALLET', 'BANK', 'CORRESPONDENT', 'CASH']],
      },
    },
    destination_account: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(30),
      defaultValue: 'PENDING',
      validate: {
        isIn: [['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']],
      },
    },
    provider_reference: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    requested_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'disbursements',
    schema: 'disbursement',
    timestamps: false,
  }
);

module.exports = Disbursement;
