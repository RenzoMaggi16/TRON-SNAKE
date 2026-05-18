// menu.js — Lógica del menú principal: partículas flotantes y perfiles activos.
// Solo se carga en index.html.

// ============================================================
// SISTEMA DE PARTÍCULAS FLOTANTES
// ============================================================

const CONSTANTES_PARTICULAS_MENU = {
  CANTIDAD:          40,    // Total de partículas en pantalla
  RADIO_MIN:          1,
  RADIO_MAX:          3,
  VELOCIDAD_MAX:      0.5,
  DISTANCIA_LINEA:   80,    // Distancia máxima para dibujar línea entre partículas
  OPACIDAD_LINEA:    0.12,  // Opacidad de las líneas entre partículas
  COLORES: ['#00D4FF', '#FF2D78', '#00D4FF', '#00D4FF'], // Mayoría cyan
};

// Estado de las partículas del menú
const particulasMenu = [];
let canvasMenuRef    = null;
let ctxMenu          = null;
let animMenuActiva   = false;

/**
 * Inicializa el canvas de partículas del menú y crea las partículas iniciales.
 */
function inicializarParticulasMenu() {
  canvasMenuRef = document.getElementById('canvasParticulas');
  if (!canvasMenuRef) return;

  ctxMenu = canvasMenuRef.getContext('2d');
  ajustarTamañoCanvasMenu();
  crearParticulasIniciales();

  animMenuActiva = true;
  requestAnimationFrame(animarParticulasMenu);

  // Reajustar al cambiar el tamaño de la ventana
  window.addEventListener('resize', ajustarTamañoCanvasMenu);
}

/**
 * Ajusta el tamaño del canvas de partículas al tamaño de la ventana.
 */
function ajustarTamañoCanvasMenu() {
  if (!canvasMenuRef) return;
  canvasMenuRef.width  = window.innerWidth;
  canvasMenuRef.height = window.innerHeight;
}

/**
 * Crea el conjunto inicial de partículas en posiciones aleatorias.
 */
function crearParticulasIniciales() {
  particulasMenu.length = 0;
  for (let i = 0; i < CONSTANTES_PARTICULAS_MENU.CANTIDAD; i++) {
    particulasMenu.push(crearParticulaMenu());
  }
}

/**
 * Crea una única partícula con propiedades aleatorias para el menú.
 * @returns {Object} Partícula del menú.
 */
function crearParticulaMenu() {
  const ancho = canvasMenuRef ? canvasMenuRef.width  : window.innerWidth;
  const alto  = canvasMenuRef ? canvasMenuRef.height : window.innerHeight;
  const { RADIO_MIN, RADIO_MAX, VELOCIDAD_MAX, COLORES } = CONSTANTES_PARTICULAS_MENU;

  return {
    x:      Math.random() * ancho,
    y:      Math.random() * alto,
    vx:     (Math.random() - 0.5) * VELOCIDAD_MAX,
    vy:     (Math.random() - 0.5) * VELOCIDAD_MAX,
    radio:  aleatorioEntre(RADIO_MIN, RADIO_MAX),
    color:  COLORES[Math.floor(Math.random() * COLORES.length)],
  };
}

/**
 * Bucle de animación de las partículas del menú.
 * Actualiza posiciones, dibuja partículas y las líneas entre ellas.
 */
function animarParticulasMenu() {
  if (!animMenuActiva || !ctxMenu || !canvasMenuRef) return;

  const ancho = canvasMenuRef.width;
  const alto  = canvasMenuRef.height;

  // Limpiar el canvas con transparencia total (el fondo lo pone el CSS)
  ctxMenu.clearRect(0, 0, ancho, alto);

  // Actualizar y dibujar cada partícula
  particulasMenu.forEach((p, i) => {
    // Mover la partícula
    p.x += p.vx;
    p.y += p.vy;

    // Rebotar suavemente en los bordes
    if (p.x < 0 || p.x > ancho) p.vx *= -1;
    if (p.y < 0 || p.y > alto)  p.vy *= -1;

    // Mantener dentro del canvas
    p.x = clamp(p.x, 0, ancho);
    p.y = clamp(p.y, 0, alto);

    // Dibujar la partícula
    ctxMenu.beginPath();
    ctxMenu.arc(p.x, p.y, p.radio, 0, Math.PI * 2);
    ctxMenu.fillStyle   = p.color;
    ctxMenu.shadowBlur  = 6;
    ctxMenu.shadowColor = p.color;
    ctxMenu.fill();
    ctxMenu.shadowBlur  = 0;

    // Dibujar líneas entre partículas cercanas
    for (let j = i + 1; j < particulasMenu.length; j++) {
      const q   = particulasMenu[j];
      const dis = calcularDistancia(p, q);
      if (dis < CONSTANTES_PARTICULAS_MENU.DISTANCIA_LINEA) {
        const opacidad = (1 - dis / CONSTANTES_PARTICULAS_MENU.DISTANCIA_LINEA)
                       * CONSTANTES_PARTICULAS_MENU.OPACIDAD_LINEA;
        ctxMenu.beginPath();
        ctxMenu.moveTo(p.x, p.y);
        ctxMenu.lineTo(q.x, q.y);
        ctxMenu.strokeStyle = hexARgba(p.color, opacidad);
        ctxMenu.lineWidth   = 0.5;
        ctxMenu.stroke();
      }
    }
  });

  requestAnimationFrame(animarParticulasMenu);
}

// ============================================================
// PERFILES ACTIVOS EN EL MENÚ
// ============================================================

/**
 * Carga y muestra los últimos 2 perfiles activos debajo de los botones del menú.
 */
function cargarPerfilesEnMenu() {
  const perfiles  = obtenerUltimosPerfiles();
  const seccion   = document.getElementById('seccionPerfilesActivos');
  const contenedor = document.getElementById('contenedorPerfiles');

  if (!seccion || !contenedor) return;

  if (perfiles.length === 0) {
    seccion.hidden = true;
    return;
  }

  seccion.hidden  = false;
  contenedor.innerHTML = '';

  perfiles.forEach(perfil => {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'tarjeta-perfil-mini';
    tarjeta.innerHTML = `
      <div class="indicador-color-perfil"
           style="background:${perfil.color};box-shadow:0 0 6px ${perfil.color};"></div>
      <div>
        <div class="nombre-perfil-mini" style="color:${perfil.color};">
          ${perfil.nombre}
        </div>
        <div class="victorias-perfil-mini">
          ${perfil.victorias || 0} victorias
        </div>
      </div>
    `;
    contenedor.appendChild(tarjeta);
  });
}

// ============================================================
// AUTO-INICIO
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  inicializarParticulasMenu();
  cargarPerfilesEnMenu();
});
