const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: './.env' });

// ── Importación de rutas ────────────────────────────
const notificationRoutes = require('./routes/notification.routes');
const disbursementRoutes = require('./routes/disbursement.routes'); //
const collectionRoutes = require('./routes/collection.routes');     //

const sequelize = require('./database/config');
require('./models/Notification');
require('./models/Disbursement');
require('./models/Installment');  
require('./models/Payment');
require('./models/PaymentAgreement');

const app = express();

// ── Middleware ──────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check ────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'api-service', // Cambié el nombre ya que ahora maneja más cosas
    version: process.env.APP_VERSION || '1.0.0',
    notifications_enabled: process.env.NOTIFICATIONS_ENABLED !== 'false',
    timestamp: new Date().toISOString(),
  });
});

// ── Rutas ───────────────────────────────────────────
app.use('/api/disbursements', disbursementRoutes); // 👈 Ruta nueva
app.use('/api/collections', collectionRoutes);     // 👈 Ruta nueva
app.use('/api/notifications', notificationRoutes);

// ── 404 handler ─────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ ok: false, message: 'Ruta no encontrada en el servicio' });
});

// ── Sync DB ──────────────────────────────────────────
const initDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('[DATABASE] ✅ Conexión a base de datos establecida');
    await sequelize.sync({ alter: true });
    console.log('[DATABASE] ✅ Modelos sincronizados con la base de datos');
  } catch (error) {
    console.error('[DATABASE] ❌ Error al conectar con la base de datos:', error.message);
    process.exit(1);
  }
};

module.exports = { app, initDB };