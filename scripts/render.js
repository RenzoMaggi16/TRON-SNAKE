// render.js — Motor de renderizado completo en Canvas2D.
// Dibuja cada frame en 10 capas ordenadas de fondo a frente.

// Referencia al canvas y contexto (se inicializa en motor.js)
let canvasRef = null;
let ctxRef    = null;

// Tiempo global para animaciones del fondo
let tiempoRender = 0;

// Constantes de renderizado
const CONSTANTES_RENDER = {
  COLOR_FONDO:     '#050510',
  GROSOR_PARED:    4,
  RADIO_PORTAL:    22,
  GROSOR_PORTAL:   3,
  BLUR_MOTO:       18,
  BLUR_PARED:      8,
  // Tamaño de renderizado del sprite de moto (escala desde el original)
  ANCHO_SPRITE:    52,
  ALTO_SPRITE:     28,
};

// ============================================================
// SISTEMA DE SPRITES DE MOTO
// ============================================================

// Sprites originales cargados desde /images/
const spriteMotoOscura = new Image();  // spr_bike_0.png  — Jugador 1 (azul/verde)
const spriteMotoRoja   = new Image();  // spr_bike1_0.png — Jugador 2 (rojo/naranja)

// Cache de sprites tintados: clave = color hex, valor = ImageBitmap
const cacheTintMoto = {};

// Flags de carga de imágenes
let spritesListos = false;
let pendienteCarga = 2;

/**
 * Precarga los dos sprites de moto desde el servidor.
 * Una vez cargados activa el flag `spritesListos`.
 */
function precargarSprites() {
  const alCargar = () => {
    pendienteCarga--;
    if (pendienteCarga === 0) spritesListos = true;
  };
  spriteMotoOscura.onload = alCargar;
  spriteMotoRoja.onload   = alCargar;
  spriteMotoOscura.onerror = alCargar; // Si falla, no bloquear el juego
  spriteMotoRoja.onerror   = alCargar;
  spriteMotoOscura.src = '/images/spr_bike_0.png';
  spriteMotoRoja.src   = '/images/spr_bike1_0.png';
}

/**
 * Devuelve el sprite base que corresponde al tipo de moto del jugador.
 * - spr_bike_0 (oscura): moto azul y verde
 * - spr_bike1_0 (roja):  moto roja y naranja
 * @param {string} tipoMoto - Tipo de moto del jugador.
 * @returns {HTMLImageElement} Sprite base a usar.
 */
function obtenerSpriteBase(tipoMoto) {
  if (tipoMoto === 'rojo' || tipoMoto === 'naranja') return spriteMotoRoja;
  return spriteMotoOscura;
}

/**
 * Genera un canvas offscreen con el sprite tintado al color del jugador.
 * Técnica: dibujar el sprite, luego aplicar 'source-in' con el color del jugador,
 * después mezclar ambos con 'multiply' para conservar las sombras y detalles.
 * El resultado se guarda en caché para no recrearlo en cada frame.
 * @param {HTMLImageElement} sprite - Sprite base a tintar.
 * @param {string} color - Color hexadecimal del jugador.
 * @returns {HTMLCanvasElement} Canvas offscreen con el sprite tintado.
 */
function obtenerSpriteTintado(sprite, color) {
  const clave = `${sprite.src}_${color}`;
  if (cacheTintMoto[clave]) return cacheTintMoto[clave];

  const w = CONSTANTES_RENDER.ANCHO_SPRITE;
  const h = CONSTANTES_RENDER.ALTO_SPRITE;

  // Canvas A: sprite original
  const canvasOriginal = document.createElement('canvas');
  canvasOriginal.width  = w;
  canvasOriginal.height = h;
  const ctxOrig = canvasOriginal.getContext('2d');
  ctxOrig.drawImage(sprite, 0, 0, w, h);

  // Canvas B: silueta rellena con el color del jugador, recortada por la forma del sprite
  const canvasTint = document.createElement('canvas');
  canvasTint.width  = w;
  canvasTint.height = h;
  const ctxTint = canvasTint.getContext('2d');

  // 1. Dibujar el sprite para crear la máscara de forma
  ctxTint.drawImage(sprite, 0, 0, w, h);

  // 2. Aplicar el color del jugador sobre la silueta (respeta la transparencia del sprite)
  ctxTint.globalCompositeOperation = 'source-in';
  ctxTint.fillStyle = color;
  ctxTint.fillRect(0, 0, w, h);

  // Canvas final: combinar el sprite original con el tint usando 'multiply'
  const canvasFinal = document.createElement('canvas');
  canvasFinal.width  = w;
  canvasFinal.height = h;
  const ctxFinal = canvasFinal.getContext('2d');

  // Base: sprite original (conserva detalles, sombras y ruedas)
  ctxFinal.drawImage(canvasOriginal, 0, 0);

  // Encima: tint de color con opacidad parcial para que el detalle original se vea
  ctxFinal.globalAlpha = 0.65;
  ctxFinal.globalCompositeOperation = 'multiply';
  ctxFinal.drawImage(canvasTint, 0, 0);

  cacheTintMoto[clave] = canvasFinal;
  return canvasFinal;
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

/**
 * Vincula el renderizador al canvas del DOM y precarga los sprites.
 * Debe llamarse una sola vez al iniciar el juego.
 * @param {HTMLCanvasElement} canvas - El elemento canvas principal.
 */
function inicializarRender(canvas) {
  canvasRef = canvas;
  ctxRef    = canvas.getContext('2d');
  precargarSprites();
}

// ============================================================
// FRAME COMPLETO — Función principal de dibujado
// ============================================================

/**
 * Dibuja un frame completo del juego en el canvas.
 * El orden de capas va de fondo a frente para que todo se superponga correctamente.
 * @param {Object} estadoJuego - Estado global del juego.
 * @param {number} deltaMs - Tiempo desde el último frame.
 */
function renderizar(estadoJuego, deltaMs) {
  if (!canvasRef || !ctxRef) return;
  tiempoRender += deltaMs * 0.001;

  const ctx    = ctxRef;
  const ancho  = canvasRef.width;
  const alto   = canvasRef.height;

  // Capa 1: Fondo negro + grid animado de perspectiva
  dibujarFondo(ctx, ancho, alto);

  // Capa 2: Pared del arena (borde neón)
  dibujarBordesArena(ctx, ancho, alto);

  // Capa 3: Portales (si están activos en el nivel)
  if (estadoJuego.portales && estadoJuego.portales.length > 0) {
    dibujarPortales(ctx, estadoJuego.portales);
  }

  // Capa 4: Obstáculos dinámicos
  dibujarObstaculos(ctx, estadoJuego.obstaculos);

  // Capa 5: Orbes con pulso sinusoidal
  dibujarOrbes(ctx, estadoJuego.orbes);

  // Capa 6: Estelas de los jugadores (reflejo incluido en dibujarEstela)
  estadoJuego.jugadores.forEach(jugador => {
    if (!jugador.eliminado) {
      dibujarEstela(ctx, jugador);
    }
  });

  // Capa 7: Motos vectoriales de cada jugador
  estadoJuego.jugadores.forEach(jugador => {
    if (!jugador.eliminado && !jugador.enReanimacion) {
      dibujarMoto(ctx, jugador);
    }
  });

  // Capa 8: Partículas de explosión / efectos de colisión
  dibujarParticulas(ctx, estadoJuego.particulas);

  // Capa 9: Efectos de turbo y habilidades activas
  estadoJuego.jugadores.forEach(jugador => {
    if (!jugador.eliminado && !jugador.enReanimacion) {
      dibujarEfectosJugador(ctx, jugador);
    }
  });
}

// ============================================================
// CAPA 1 — FONDO CON GRID ANIMADO
// ============================================================

/**
 * Dibuja el fondo negro con un grid de perspectiva que avanza hacia el jugador.
 * El grid se anima suavemente para crear sensación de movimiento.
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas.
 * @param {number} ancho - Ancho del canvas.
 * @param {number} alto - Alto del canvas.
 */
function dibujarFondo(ctx, ancho, alto) {
  // Fondo sólido negro profundo
  ctx.fillStyle = CONSTANTES_RENDER.COLOR_FONDO;
  ctx.fillRect(0, 0, ancho, alto);

  // Grid horizontal animado (se mueve de arriba hacia abajo)
  const tamañoCelda = 40;
  const desplazamiento = (tiempoRender * 40) % tamañoCelda;

  ctx.strokeStyle = 'rgba(0, 212, 255, 0.06)';
  ctx.lineWidth   = 0.5;
  ctx.shadowBlur  = 0;

  // Líneas horizontales del grid
  for (let y = desplazamiento; y < alto + tamañoCelda; y += tamañoCelda) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ancho, y);
    ctx.stroke();
  }

  // Líneas verticales del grid (estáticas)
  for (let x = 0; x < ancho; x += tamañoCelda) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, alto);
    ctx.stroke();
  }
}

// ============================================================
// CAPA 2 — BORDES DEL ARENA
// ============================================================

/**
 * Dibuja los bordes del arena con efecto de neón pulsante.
 * Los bordes son letales si el jugador los toca.
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas.
 * @param {number} ancho - Ancho del canvas.
 * @param {number} alto - Alto del canvas.
 */
function dibujarBordesArena(ctx, ancho, alto) {
  const pulsacion = 0.5 + Math.abs(Math.sin(tiempoRender * 1.5)) * 0.5;
  const grosor    = CONSTANTES_RENDER.GROSOR_PARED;

  ctx.strokeStyle = `rgba(0, 212, 255, ${0.5 * pulsacion})`;
  ctx.lineWidth   = grosor;
  ctx.shadowBlur  = CONSTANTES_RENDER.BLUR_PARED * pulsacion;
  ctx.shadowColor = '#00D4FF';

  ctx.strokeRect(
    grosor / 2,
    grosor / 2,
    ancho - grosor,
    alto - grosor
  );

  // Línea interior fina para dar profundidad
  ctx.strokeStyle = `rgba(0, 212, 255, ${0.2 * pulsacion})`;
  ctx.lineWidth   = 1;
  ctx.shadowBlur  = 0;
  ctx.strokeRect(grosor + 3, grosor + 3, ancho - grosor * 2 - 6, alto - grosor * 2 - 6);
}

// ============================================================
// CAPA 3 — PORTALES
// ============================================================

/**
 * Dibuja cada par de portales con anillo giratorio y partículas en espiral.
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas.
 * @param {Array} portales - Array de pares de portales del estado.
 */
function dibujarPortales(ctx, portales) {
  portales.forEach((par, i) => {
    const colorA = '#00D4FF';
    const colorB = '#FF2D78';
    dibujarPortalIndividual(ctx, par.posicionA, colorA);
    dibujarPortalIndividual(ctx, par.posicionB, colorB);
  });
}

/**
 * Dibuja un único portal con anillo exterior giratorio.
 * @param {CanvasRenderingContext2D} ctx - Contexto.
 * @param {{x:number,y:number}} posicion - Posición del portal.
 * @param {string} color - Color del portal.
 */
function dibujarPortalIndividual(ctx, posicion, color) {
  const r       = CONSTANTES_RENDER.RADIO_PORTAL;
  const angulo  = tiempoRender * 2;

  ctx.save();
  ctx.translate(posicion.x, posicion.y);

  // Halo exterior difuso
  ctx.beginPath();
  ctx.arc(0, 0, r + 10, 0, Math.PI * 2);
  ctx.fillStyle = hexARgba(color, 0.08);
  ctx.shadowBlur  = 25;
  ctx.shadowColor = color;
  ctx.fill();

  // Anillo exterior giratorio (arco con gap)
  ctx.strokeStyle = color;
  ctx.lineWidth   = CONSTANTES_RENDER.GROSOR_PORTAL;
  ctx.shadowBlur  = 12;
  ctx.shadowColor = color;
  ctx.beginPath();
  ctx.arc(0, 0, r, angulo, angulo + Math.PI * 1.6);
  ctx.stroke();

  // Anillo interior giratorio inverso
  ctx.strokeStyle = hexARgba(color, 0.5);
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r - 6, -angulo * 1.3, -angulo * 1.3 + Math.PI * 1.2);
  ctx.stroke();

  // Centro del portal (núcleo brillante)
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = hexARgba(color, 0.3 + Math.sin(tiempoRender * 4) * 0.15);
  ctx.shadowBlur  = 20;
  ctx.fill();

  ctx.restore();
}

// ============================================================
// CAPA 7 — MOTOS CON SPRITE
// ============================================================

/**
 * Dibuja la moto de un jugador usando el sprite PNG tintado con su color.
 * Si el sprite aún no está listo, cae de vuelta a la forma vectorial de emergencia.
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas.
 * @param {Jugador} jugador - Jugador a dibujar.
 */
function dibujarMoto(ctx, jugador) {
  // Parpadeo si el jugador está invulnerable
  if (jugador.invulnerable) {
    const cicloParpadeo = Math.floor(tiempoRender * 10) % 2;
    if (cicloParpadeo === 1) return;
  }

  ctx.save();
  ctx.translate(jugador.posicion.x, jugador.posicion.y);
  ctx.rotate(jugador.anguloRotacion);
  ctx.scale(jugador.escalaSalto, jugador.escalaSalto);

  // Glow alrededor de la moto (se aplica antes del sprite para que quede detrás)
  ctx.shadowBlur  = CONSTANTES_RENDER.BLUR_MOTO;
  ctx.shadowColor = jugador.color;

  if (spritesListos) {
    dibujarMotoSprite(ctx, jugador);
  } else {
    // Fallback vectorial mientras carga la imagen
    dibujarMotoFallback(ctx, jugador.color);
  }

  // Escudo energético (sobre el sprite)
  if (jugador.escudoActivo) {
    dibujarEscudoHalo(ctx, jugador.color);
  }

  ctx.restore();

  // Sombra proyectada en el suelo al saltar
  if (jugador.enSalto) {
    dibujarSombraSalto(ctx, jugador);
  }
}

/**
 * Dibuja la moto usando el sprite PNG tintado al color del jugador.
 * El sprite se centra en (0,0) dado que el contexto ya fue trasladado.
 * La imagen original apunta a la derecha, que coincide con ángulo 0 (dx=1,dy=0).
 * @param {CanvasRenderingContext2D} ctx - Contexto ya trasladado y rotado.
 * @param {Jugador} jugador - Jugador a dibujar.
 */
function dibujarMotoSprite(ctx, jugador) {
  const w = CONSTANTES_RENDER.ANCHO_SPRITE;
  const h = CONSTANTES_RENDER.ALTO_SPRITE;

  const spriteBase    = obtenerSpriteBase(jugador.tipoMoto);
  const spriteTintado = obtenerSpriteTintado(spriteBase, jugador.color);

  // Glow extra alrededor del sprite (halo de neón)
  ctx.shadowBlur  = 14;
  ctx.shadowColor = jugador.color;

  // Dibujar el sprite centrado en el punto de la moto
  // (el origen del sprite está en el centro del cuerpo de la moto)
  ctx.drawImage(spriteTintado, -w / 2, -h / 2, w, h);

  // Segunda pasada sin tint para reforzar el glow sobre el sprite
  ctx.globalAlpha = 0.25;
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = jugador.color;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

/**
 * Fallback vectorial mínimo mientras los sprites aún están cargando.
 * Solo se muestra durante el primer frame si la conexión es muy lenta.
 * @param {CanvasRenderingContext2D} ctx - Contexto.
 * @param {string} color - Color del jugador.
 */
function dibujarMotoFallback(ctx, color) {
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-8, -6);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-8, 6);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Dibuja el halo circular del escudo girando alrededor de la moto.
 * @param {CanvasRenderingContext2D} ctx - Contexto.
 * @param {string} color - Color base de la moto.
 */
function dibujarEscudoHalo(ctx, color) {
  const radio  = 22;
  const angulo = tiempoRender * 3;

  ctx.strokeStyle = hexARgba('#87CEEB', 0.7 + Math.sin(tiempoRender * 5) * 0.3);
  ctx.lineWidth   = 2;
  ctx.shadowBlur  = 15;
  ctx.shadowColor = '#87CEEB';

  ctx.beginPath();
  ctx.arc(0, 0, radio, angulo, angulo + Math.PI * 1.5);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radio, angulo + Math.PI, angulo + Math.PI * 2.2);
  ctx.stroke();
}

/**
 * Dibuja la sombra proyectada en el suelo cuando la moto está saltando.
 * @param {CanvasRenderingContext2D} ctx - Contexto.
 * @param {Jugador} jugador - Jugador en salto.
 */
function dibujarSombraSalto(ctx, jugador) {
  ctx.save();
  ctx.globalAlpha = 0.25 * (1 - jugador.escalaSalto);
  ctx.fillStyle   = '#000000';
  ctx.shadowBlur  = 0;
  ctx.beginPath();
  ctx.ellipse(
    jugador.posicion.x + 4,
    jugador.posicion.y + 10,
    12 * (1 - jugador.escalaSalto + 0.5),
    4,
    jugador.anguloRotacion,
    0, Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

// ============================================================
// CAPA 8 — PARTÍCULAS DE EXPLOSIÓN
// ============================================================

/**
 * Dibuja y actualiza todas las partículas de explosión activas.
 * Las partículas se desvanecen progresivamente con su vida.
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas.
 * @param {Array} particulas - Array global de partículas del estado.
 */
function dibujarParticulas(ctx, particulas) {
  ctx.save();
  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i];
    p.x    += p.vx;
    p.y    += p.vy;
    p.vx   *= 0.94; // Fricción
    p.vy   *= 0.94;
    p.vida -= 16;   // Aprox. 16ms por frame a 60fps

    if (p.vida <= 0) {
      particulas.splice(i, 1);
      continue;
    }

    const opacidad = p.vida / p.vidaMax;
    ctx.globalAlpha = opacidad;
    ctx.fillStyle   = p.color;
    ctx.shadowBlur  = 6;
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radio * opacidad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ============================================================
// CAPA 9 — EFECTOS DE TURBO Y HABILIDADES
// ============================================================

/**
 * Dibuja los efectos visuales activos en un jugador:
 * partículas de propulsión al turbo, brillo de salto, etc.
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas.
 * @param {Jugador} jugador - Jugador cuyos efectos se dibujan.
 */
function dibujarEfectosJugador(ctx, jugador) {
  // Partículas de propulsión al usar turbo
  if (jugador.turboActivo) {
    dibujarParticulasTurbo(ctx, jugador);
  }

  // Brillo extra durante el salto
  if (jugador.enSalto) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle   = jugador.color;
    ctx.shadowBlur  = 25;
    ctx.shadowColor = jugador.color;
    ctx.beginPath();
    ctx.arc(jugador.posicion.x, jugador.posicion.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Efecto EMP recibido (distorsión visual parpadeante)
  if (jugador.empActivo) {
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(tiempoRender * 20) * 0.2;
    ctx.strokeStyle = '#FF1744';
    ctx.lineWidth   = 2;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#FF1744';
    ctx.beginPath();
    ctx.arc(jugador.posicion.x, jugador.posicion.y, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Indicador de orbe cortador activo (borde brillante alrededor de la moto)
  if (jugador.puedeCortar) {
    ctx.save();
    ctx.strokeStyle = '#FF4500';
    ctx.lineWidth   = 2;
    ctx.shadowBlur  = 12;
    ctx.shadowColor = '#FF4500';
    ctx.globalAlpha = 0.6 + Math.sin(tiempoRender * 8) * 0.4;
    ctx.beginPath();
    ctx.arc(jugador.posicion.x, jugador.posicion.y, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Dibuja partículas de propulsión detrás de la moto cuando usa turbo.
 * Las partículas salen en dirección opuesta al movimiento.
 * @param {CanvasRenderingContext2D} ctx - Contexto.
 * @param {Jugador} jugador - Jugador con turbo activo.
 */
function dibujarParticulasTurbo(ctx, jugador) {
  const anguloOpuesto = jugador.anguloRotacion + Math.PI;
  const cantidadParticular = 3;

  ctx.save();
  for (let i = 0; i < cantidadParticular; i++) {
    const dispersion   = aleatorioEntre(-0.5, 0.5);
    const distancia    = aleatorioEntre(5, 20);
    const px = jugador.posicion.x + Math.cos(anguloOpuesto + dispersion) * distancia;
    const py = jugador.posicion.y + Math.sin(anguloOpuesto + dispersion) * distancia;

    ctx.globalAlpha = aleatorioEntre(0.2, 0.6);
    ctx.fillStyle   = jugador.color;
    ctx.shadowBlur  = 8;
    ctx.shadowColor = jugador.color;
    ctx.beginPath();
    ctx.arc(px, py, aleatorioEntre(1, 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ============================================================
// REDIMENSIONADO DEL CANVAS
// ============================================================

/**
 * Ajusta el tamaño del canvas al del viewport disponible.
 * Se llama al iniciar el juego y al redimensionar la ventana.
 * @param {HTMLCanvasElement} canvas - El elemento canvas.
 * @param {{limites:Object}} estadoJuego - Estado del juego para actualizar los límites.
 */
function redimensionarCanvas(canvas, estadoJuego) {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  if (estadoJuego) {
    estadoJuego.limites.ancho = canvas.width;
    estadoJuego.limites.alto  = canvas.height;
  }
}
