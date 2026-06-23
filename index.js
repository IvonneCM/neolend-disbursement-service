require('dotenv').config({ path: '../.env' });
const { app, initDB } = require('./app');

const PORT = process.env.NOTIFICATION_PORT || 3006;

const start = async () => {
  await initDB();
  app.listen(PORT, () => {
    console.log(`[NOTIFICATION] 🚀 Servicio corriendo en http://localhost:${PORT}`);
    console.log(`[NOTIFICATION]    Health: http://localhost:${PORT}/health`);
    console.log(`[NOTIFICATION]    API:    http://localhost:${PORT}/api/notifications`);
  });
};

start();
