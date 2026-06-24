require('dotenv').config({ path: '../.env' });
const { app, initDB } = require('./app');

const PORT = process.env.PORT || 3006;

const start = async () => {
  await initDB();
  app.listen(PORT, () => {
    console.log(`[Notification, collecion y Disbursement] 🚀 Servicio corriendo en http://localhost:${PORT}`);
    console.log(`[Notification, collecion y Disbursement]    Health: http://localhost:${PORT}/health`);
    console.log(`[Notification, collecion y Disbursement]    API:    http://localhost:${PORT}/api/notifications`);
  });
};

start();
