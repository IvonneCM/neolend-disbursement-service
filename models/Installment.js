const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

/**
 * Modelo: collection.installments
 * Representa cada cuota del préstamo.
 * Status: PENDING | PAID | OVERDUE | RESTRUCTURED
 */
const Installment = sequelize.define(
  'Installment',
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
    installment_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    principal_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    interest_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(30),
      defaultValue: 'PENDING',
      validate: {
        isIn: [['PENDING', 'PAID', 'OVERDUE', 'RESTRUCTURED']],
      },
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'installments',
    schema: 'collection',
    timestamps: false,
  }
);

module.exports = Installment;
