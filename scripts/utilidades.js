// utilidades.js — Funciones puras de matemáticas, vectores y colores.
// No depende de ningún otro módulo del juego.

// ============================================================
// CONSTANTES MATEMÁTICAS
// ============================================================
const MATH_PI2 = Math.PI * 2;

// ============================================================
// DISTANCIAS Y VECTORES
// ============================================================

/**
 * Calcula la distancia euclidiana entre dos puntos.
 * @param {{x:number,y:number}} a - Primer punto.
 * @param {{x:number,y:number}} b - Segundo punto.
 * @returns {number} Distancia en píxeles.
 */
function calcularDistancia(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Limita un valor numérico entre un mínimo y un máximo.
 * @param {number} valor - Valor a limitar.
 * @param {number} min - Límite inferior.
 * @param {number} max - Límite superior.
 * @returns {number} Valor restringido al rango [min, max].
 */
function clamp(valor, min, max) {
  return Math.max(min, Math.min(max, valor));
}

/**
 * Interpola linealmente entre dos valores.
 * @param {number} a - Valor inicial.
 * @param {number} b - Valor final.
 * @param {number} t - Factor de interpolación (0-1).
 * @returns {number} Valor interpolado.
 */
function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Genera un número aleatorio entre min y max (inclusive).
 * @param {number} min - Mínimo.
 * @param {number} max - Máximo.
 * @returns {number} Número aleatorio.
 */
function aleatorioEntre(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Genera un entero aleatorio entre min y max (inclusive).
 * @param {number} min - Mínimo.
 * @param {number} max - Máximo.
 * @returns {number} Entero aleatorio.
 */
function enteroAleatorioEntre(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Elige un elemento al azar de un array.
 * @param {Array} array - Array del que elegir.
 * @returns {*} Elemento aleatorio.
 */
function elegirAlAzar(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// ============================================================
// COLORES
// ============================================================

/**
 * Convierte un color hexadecimal a RGBA con opacidad.
 * @param {string} hex - Color en formato #RRGGBB.
 * @param {number} opacidad - Valor de opacidad (0-1).
 * @returns {string} Color en formato rgba().
 */
function hexARgba(hex, opacidad) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacidad})`;
}

/**
 * Aclara un color hexadecimal sumando brillo.
 * @param {string} hex - Color base en #RRGGBB.
 * @param {number} cantidad - Cantidad de brillo a sumar (0-255).
 * @returns {string} Color aclarado.
 */
function aclarColor(hex, cantidad) {
  const r = clamp(parseInt(hex.slice(1, 3), 16) + cantidad, 0, 255);
  const g = clamp(parseInt(hex.slice(3, 5), 16) + cantidad, 0, 255);
  const b = clamp(parseInt(hex.slice(5, 7), 16) + cantidad, 0, 255);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// ============================================================
// GEOMETRÍA
// ============================================================

/**
 * Verifica si un punto está dentro de un rectángulo.
 * @param {{x:number,y:number}} punto - Punto a verificar.
 * @param {{x:number,y:number,ancho:number,alto:number}} rect - Rectángulo.
 * @returns {boolean} true si el punto está dentro.
 */
function puntoEnRectangulo(punto, rect) {
  return punto.x >= rect.x && punto.x <= rect.x + rect.ancho
      && punto.y >= rect.y && punto.y <= rect.y + rect.alto;
}

/**
 * Verifica si dos círculos se superponen.
 * @param {{x:number,y:number,radio:number}} c1 - Círculo 1.
 * @param {{x:number,y:number,radio:number}} c2 - Círculo 2.
 * @returns {boolean} true si hay intersección.
 */
function circulosSeSolapan(c1, c2) {
  return calcularDistancia(c1, c2) < c1.radio + c2.radio;
}

// ============================================================
// FORMATO DE TEXTO
// ============================================================

/**
 * Formatea un número a 6 dígitos con ceros a la izquierda.
 * Útil para mostrar puntajes en el HUD.
 * @param {number} numero - Número a formatear.
 * @returns {string} Número formateado con 6 dígitos.
 */
function formatearPuntaje(numero) {
  return String(Math.floor(numero)).padStart(6, '0');
}

/**
 * Formatea segundos a formato MM:SS para el temporizador.
 * @param {number} segundos - Segundos totales.
 * @returns {string} Tiempo en formato "MM:SS".
 */
function formatearTiempo(segundos) {
  const min = Math.floor(segundos / 60);
  const seg = Math.floor(segundos % 60);
  return `${String(min).padStart(2,'0')}:${String(seg).padStart(2,'0')}`;
}

/**
 * Genera un ID único basado en timestamp + aleatoriedad.
 * @returns {string} ID único.
 */
function generarId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ============================================================
// ÁNGULOS Y ROTACIÓN
// ============================================================

/**
 * Calcula el ángulo de rotación de la moto según su dirección de movimiento.
 * La moto apunta hacia donde se mueve.
 * @param {{dx:number,dy:number}} direccion - Vector de dirección unitario.
 * @returns {number} Ángulo en radianes.
 */
function calcularAnguloDireccion(direccion) {
  return Math.atan2(direccion.dy, direccion.dx);
}

/**
 * Verifica si dos vectores de dirección son opuestos (colisión frontal).
 * @param {{dx:number,dy:number}} d1 - Dirección 1.
 * @param {{dx:number,dy:number}} d2 - Dirección 2.
 * @returns {boolean} true si van en direcciones opuestas.
 */
function sonDireccionesOpuestas(d1, d2) {
  return d1.dx === -d2.dx && d1.dy === -d2.dy;
}
