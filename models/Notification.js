const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

/**
 * Modelo: notification.notifications
 * Registra cada notificación enviada o pendiente.
 * channel: WHATSAPP | SMS | EMAIL
 * status:  PENDING | SENT | FAILED
 */
const Notification = sequelize.define(
  'Notification',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    channel: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        isIn: [['WHATSAPP', 'SMS', 'EMAIL']],
      },
    },
    recipient: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(30),
      defaultValue: 'PENDING',
      validate: {
        isIn: [['PENDING', 'SENT', 'FAILED']],
      },
    },
    related_entity_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    related_entity_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'notifications',
    schema: 'notification',
    timestamps: false,
  }
);

module.exports = Notification;
