// estela.js — Gestión y renderizado visual de las estelas de cada moto.
// Define los 4 tipos de estela y sus propiedades visuales.

// Constantes de la estela
const CONSTANTES_ESTELA = {
  GROSOR_LINEA:        4,    // Grosor base de la estela en píxeles
  BLUR_GLOW:           8,    // Blur del shadowBlur para el glow
  BLUR_GLOW_INTENSO:   16,   // Blur intensificado para el núcleo de la estela
  SEGMENTOS_GRACIA:    4,    // Segmentos nuevos que se dibujan semitransparentes
  OPACIDAD_REFLEJO:    0.12, // Opacidad del reflejo en el suelo
  DESPLAZAMIENTO_REFLEJO: 6, // Píxeles de desplazamiento del reflejo vertical
  INTERVALO_GUION:     12,   // Píxeles entre guiones de la estela punteada
  LONGITUD_GUION:      7,    // Longitud de cada guión en px
};

// ============================================================
// DIBUJAR ESTELA SEGÚN TIPO
// ============================================================

/**
 * Dibuja la estela completa de un jugador en el canvas.
 * Incluye glow, reflejo y zona de gracia semitransparente.
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas.
 * @param {Jugador} jugador - Jugador cuya estela se dibuja.
 */
function dibujarEstela(ctx, jugador) {
  const segmentos = jugador.estelaSegmentos;
  if (segmentos.length < 2) return;

  // Dibujar reflejo en el suelo (versión tenue desplazada hacia abajo)
  dibujarReflejoEstela(ctx, segmentos, jugador.color);

  // Elegir función según el tipo de estela de la moto
  switch (jugador.tipoEstela) {
    case 'punteada':
      dibujarEstelaPunteada(ctx, segmentos, jugador.color, jugador.invulnerable);
      break;
    case 'electrica':
      dibujarEstelaElectrica(ctx, segmentos, jugador.color, jugador.invulnerable);
      break;
    case 'plasma':
      dibujarEstelaPlasma(ctx, segmentos, jugador.color, jugador.invulnerable);
      break;
    default:
      dibujarEstelaSolida(ctx, segmentos, jugador.color, jugador.invulnerable);
      break;
  }

  // Dibujar la estela señuelo si está activa (visible pero no colisiona)
  if (jugador.senueloActivo && jugador.estelaFantasma.length > 2) {
    dibujarEstelaFantasma(ctx, jugador.estelaFantasma, jugador.color, jugador.opacidadSenuelo);
  }
}

/**
 * Dibuja el reflejo tenue de la estela en el suelo (debajo de los segmentos).
 * Simula el suelo brillante y mojado del universo TRON.
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas.
 * @param {Array<{x:number,y:number}>} segmentos - Segmentos de la estela.
 * @param {string} color - Color principal de la estela.
 */
function dibujarReflejoEstela(ctx, segmentos, color) {
  if (segmentos.length < 2) return;

  ctx.save();
  ctx.globalAlpha   = CONSTANTES_ESTELA.OPACIDAD_REFLEJO;
  ctx.strokeStyle   = color;
  ctx.lineWidth     = CONSTANTES_ESTELA.GROSOR_LINEA;
  ctx.lineCap       = 'round';
  ctx.lineJoin      = 'round';
  ctx.shadowBlur    = 0;

  ctx.beginPath();
  ctx.moveTo(
    segmentos[0].x,
    segmentos[0].y + CONSTANTES_ESTELA.DESPLAZAMIENTO_REFLEJO
  );

  for (let i = 1; i < segmentos.length; i++) {
    ctx.lineTo(
      segmentos[i].x,
      segmentos[i].y + CONSTANTES_ESTELA.DESPLAZAMIENTO_REFLEJO
    );
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Dibuja la estela sólida estándar con doble capa de glow.
 * Usada por el Ciclo Azul.
 * @param {CanvasRenderingContext2D} ctx - Contexto.
 * @param {Array} segmentos - Puntos de la estela.
 * @param {string} color - Color de la estela.
 * @param {boolean} invulnerable - Si true, dibuja con parpadeo.
 */
function dibujarEstelaSolida(ctx, segmentos, color, invulnerable) {
  if (segmentos.length < 2) return;
  ctx.save();
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  // Dibujar segmento a segmento con fade de opacidad hacia la cola
  for (let i = 0; i < segmentos.length - 1; i++) {
    const progreso    = i / (segmentos.length - 1); // 0=cabeza, 1=cola
    const opacidadBase = invulnerable ? 0.5 : 1.0;
    const opacidad    = opacidadBase * (1 - progreso * 0.75); // 100% cabeza → 25% cola

    // Capa exterior: glow difuso
    ctx.globalAlpha = opacidad * 0.7;
    ctx.strokeStyle = color;
    ctx.lineWidth   = CONSTANTES_ESTELA.GROSOR_LINEA + 4;
    ctx.shadowBlur  = CONSTANTES_ESTELA.BLUR_GLOW_INTENSO * (1 - progreso * 0.6);
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.moveTo(segmentos[i].x, segmentos[i].y);
    ctx.lineTo(segmentos[i + 1].x, segmentos[i + 1].y);
    ctx.stroke();

    // Capa interior: núcleo brillante
    ctx.globalAlpha = opacidad;
    ctx.lineWidth   = CONSTANTES_ESTELA.GROSOR_LINEA;
    ctx.shadowBlur  = CONSTANTES_ESTELA.BLUR_GLOW * (1 - progreso * 0.6);
    ctx.beginPath();
    ctx.moveTo(segmentos[i].x, segmentos[i].y);
    ctx.lineTo(segmentos[i + 1].x, segmentos[i + 1].y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Dibuja la estela punteada (guiones neón). Usada por el Ciclo Rojo.
 * El efecto de "chispas" se logra con guiones separados.
 * @param {CanvasRenderingContext2D} ctx - Contexto.
 * @param {Array} segmentos - Puntos de la estela.
 * @param {string} color - Color de la estela.
 * @param {boolean} invulnerable - Si true, dibuja con parpadeo.
 */
function dibujarEstelaPunteada(ctx, segmentos, color, invulnerable) {
  if (segmentos.length < 2) return;
  ctx.save();
  ctx.lineCap     = 'round';
  ctx.shadowColor = color;
  ctx.setLineDash([CONSTANTES_ESTELA.LONGITUD_GUION, CONSTANTES_ESTELA.INTERVALO_GUION]);

  // Dibujar segmento a segmento con fade de opacidad hacia la cola
  for (let i = 0; i < segmentos.length - 1; i++) {
    const progreso    = i / (segmentos.length - 1);
    const opacidadBase = invulnerable ? 0.4 : 1.0;
    const opacidad    = opacidadBase * (1 - progreso * 0.75);

    ctx.globalAlpha = opacidad;
    ctx.strokeStyle = color;
    ctx.lineWidth   = CONSTANTES_ESTELA.GROSOR_LINEA;
    ctx.shadowBlur  = CONSTANTES_ESTELA.BLUR_GLOW_INTENSO * (1 - progreso * 0.6);
    ctx.beginPath();
    ctx.moveTo(segmentos[i].x, segmentos[i].y);
    ctx.lineTo(segmentos[i + 1].x, segmentos[i + 1].y);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Dibuja la estela eléctrica con desvíos aleatorios que simulan arcos.
 * Usada por el Ciclo Verde.
 * @param {CanvasRenderingContext2D} ctx - Contexto.
 * @param {Array} segmentos - Puntos de la estela.
 * @param {string} color - Color de la estela.
 * @param {boolean} invulnerable - Si true, dibuja con parpadeo.
 */
function dibujarEstelaElectrica(ctx, segmentos, color, invulnerable) {
  if (segmentos.length < 2) return;
  ctx.save();
  ctx.lineCap     = 'round';
  ctx.shadowColor = color;

  // Dibujar segmento a segmento con fade de opacidad y desviación eléctrica
  for (let i = 0; i < segmentos.length - 1; i++) {
    const progreso    = i / (segmentos.length - 1);
    const opacidadBase = invulnerable ? 0.4 : 0.9;
    const opacidad    = opacidadBase * (1 - progreso * 0.75);
    // Micro-variación para efecto de arco eléctrico (solo en segmentos alternos)
    const desviacion  = (i % 3 === 0) ? (Math.random() - 0.5) * 4 : 0;

    ctx.globalAlpha = opacidad;
    ctx.strokeStyle = color;
    ctx.lineWidth   = CONSTANTES_ESTELA.GROSOR_LINEA - 1;
    ctx.shadowBlur  = CONSTANTES_ESTELA.BLUR_GLOW_INTENSO * (1 - progreso * 0.6);
    ctx.beginPath();
    ctx.moveTo(segmentos[i].x, segmentos[i].y);
    ctx.lineTo(segmentos[i + 1].x + desviacion, segmentos[i + 1].y + desviacion);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Dibuja la estela plasma con gradiente de opacidad decreciente hacia la cola.
 * Usada por el Ciclo Naranja.
 * @param {CanvasRenderingContext2D} ctx - Contexto.
 * @param {Array} segmentos - Puntos de la estela.
 * @param {string} color - Color de la estela.
 * @param {boolean} invulnerable - Si true, dibuja con parpadeo.
 */
function dibujarEstelaPlasma(ctx, segmentos, color, invulnerable) {
  if (segmentos.length < 2) return;
  ctx.save();

  // Dibujar en grupos de segmentos con opacidad decreciente
  const pasoOpacidad = 1 / segmentos.length;

  for (let i = 0; i < segmentos.length - 1; i++) {
    const opacidad = invulnerable
      ? (1 - i * pasoOpacidad) * 0.5
      : (1 - i * pasoOpacidad) * 0.9;

    ctx.globalAlpha = Math.max(0.05, opacidad);
    ctx.strokeStyle = color;
    ctx.lineWidth   = CONSTANTES_ESTELA.GROSOR_LINEA;
    ctx.lineCap     = 'round';
    ctx.shadowBlur  = CONSTANTES_ESTELA.BLUR_GLOW;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.moveTo(segmentos[i].x, segmentos[i].y);
    ctx.lineTo(segmentos[i + 1].x, segmentos[i + 1].y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Dibuja la estela fantasma del señuelo (semitransparente y parpadeante).
 * El enemigo la ve pero no puede colisionar con ella.
 * @param {CanvasRenderingContext2D} ctx - Contexto.
 * @param {Array} segmentosFantasma - Segmentos del señuelo.
 * @param {string} color - Color base de la estela.
 */
function dibujarEstelaFantasma(ctx, segmentosFantasma, color, opacidad) {
  if (segmentosFantasma.length < 2) return;
  // Usar la opacidad dinámica del jugador (permite el parpadeo en los últimos ms)
  const alpha = (typeof opacidad === 'number') ? opacidad : 0.35;
  ctx.save();

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth   = CONSTANTES_ESTELA.GROSOR_LINEA;
  ctx.lineCap     = 'round';
  ctx.setLineDash([5, 8]); // Línea punteada para distinguirla de la estela real
  ctx.shadowBlur  = 4;
  ctx.shadowColor = color;

  trazarSegmentos(ctx, segmentosFantasma);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ============================================================
// FUNCIONES AUXILIARES DE TRAZADO
// ============================================================

/**
 * Traza el path de todos los segmentos sin hacer stroke.
 * Reutilizable por todos los tipos de estela.
 * @param {CanvasRenderingContext2D} ctx - Contexto.
 * @param {Array<{x:number,y:number}>} segmentos - Puntos a trazar.
 */
function trazarSegmentos(ctx, segmentos) {
  ctx.beginPath();
  ctx.moveTo(segmentos[0].x, segmentos[0].y);
  for (let i = 1; i < segmentos.length; i++) {
    ctx.lineTo(segmentos[i].x, segmentos[i].y);
  }
}
