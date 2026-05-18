// routes/index.js — Router centralizado para todas las páginas del juego.
// Maneja las rutas de las páginas secundarias y el catch-all 404.

const express = require('express');
const path    = require('path');
const router  = express.Router();

// Directorio donde viven las páginas HTML
const CARPETA_PAGINAS = path.join(__dirname, '..', 'pages');

// GET /juego → Pantalla principal del juego (canvas + HUD)
router.get('/juego', (req, res) => {
  res.sendFile(path.join(CARPETA_PAGINAS, 'juego.html'));
});

// GET /instrucciones → Reglas, controles y mecánicas
router.get('/instrucciones', (req, res) => {
  res.sendFile(path.join(CARPETA_PAGINAS, 'instrucciones.html'));
});

// GET /jugadores → Gestión de perfiles de usuario
router.get('/jugadores', (req, res) => {
  res.sendFile(path.join(CARPETA_PAGINAS, 'jugadores.html'));
});

// GET /marcador → Tabla de récords globales
router.get('/marcador', (req, res) => {
  res.sendFile(path.join(CARPETA_PAGINAS, 'marcador.html'));
});

// Catch-all: cualquier ruta no encontrada muestra página 404 en español
router.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>404 — Página No Encontrada | ARENA TRON</title>
      <style>
        body { background: #050510; color: #00D4FF; font-family: monospace;
               display: flex; align-items: center; justify-content: center;
               height: 100vh; margin: 0; flex-direction: column; gap: 20px; }
        h1 { font-size: 4rem; text-shadow: 0 0 20px #00D4FF; margin: 0; }
        p  { color: #aaa; font-size: 1.1rem; }
        a  { color: #FF2D78; text-decoration: none; border: 1px solid #FF2D78;
             padding: 10px 24px; border-radius: 4px; }
        a:hover { background: #FF2D7822; }
      </style>
    </head>
    <body>
      <h1>404</h1>
      <p>La ruta <strong>${req.url}</strong> no existe en el sistema.</p>
      <a href="/">← Volver al Inicio</a>
    </body>
    </html>
  `);
});

module.exports = router;
