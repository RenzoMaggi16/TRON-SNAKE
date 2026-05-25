// server.js — Punto de entrada del servidor Express para ARENA TRON.
// Levanta el servidor en el puerto 3000, configura middleware y rutas.

const express = require('express');
const path    = require('path');
const rutas   = require('./routes/index');

const app    = express();
const PUERTO = 3000;

// === MIDDLEWARE DE LOGGING ===
// Registra método HTTP, URL y timestamp en cada petición recibida
app.use((req, res, next) => {
  const ahora    = new Date().toISOString();
  const metodo   = req.method;
  const url      = req.url;
  console.log(`[${ahora}] ${metodo} ${url}`);
  next();
});

// === ARCHIVOS ESTÁTICOS ===
// Exponer las carpetas públicas para el navegador
app.use('/styles',  express.static(path.join(__dirname, 'public', 'styles')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/images',  express.static(path.join(__dirname, 'public', 'images')));
app.use('/sounds',  express.static(path.join(__dirname, 'public', 'Sounds')));
app.use('/public',  express.static(path.join(__dirname, 'public')));


// === RUTA RAÍZ ===
// La ruta principal sirve el menú principal del juego
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

// === RUTAS DE PÁGINAS ===
// Todas las demás rutas son manejadas por el router centralizado
app.use('/', rutas);

// === INICIO DEL SERVIDOR ===
const servidor = app.listen(PUERTO, () => {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   ARENA TRON — Ciclos de Luz             ║');
  console.log(`║   Servidor iniciado en puerto ${PUERTO}      ║`);
  console.log(`║   http://localhost:${PUERTO}                 ║`);
  console.log('╚══════════════════════════════════════════╝');
});

// === MANEJO DE ERROR DE PUERTO OCUPADO ===
// Si el puerto ya está en uso, informa claramente en español
servidor.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: El puerto ${PUERTO} ya está en uso.`);
    console.error('   Cierra el proceso que lo está usando y vuelve a intentarlo.');
    process.exit(1);
  } else {
    console.error('❌ Error inesperado del servidor:', error.message);
  }
});
