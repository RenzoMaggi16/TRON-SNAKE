// obstaculos.js — Obstáculos dinámicos del arena: 4 tipos con movimiento propio.

const CONSTANTES_OBST = {
  ANCHO_ESTATICO:   28,   // Ancho del bloque estático en px
  ALTO_ESTATICO:    28,   // Alto del bloque estático en px
  ANCHO_HORIZONTAL: 32,   // Ancho del bloque horizontal en px
  ALTO_HORIZONTAL:  18,
  RADIO_DIAGONAL:   14,   // Radio del rombo diagonal
  RADIO_GIRATORIO:  20,   // Radio de la cruz giratoria
  VELOCIDAD_HORIZ:  1.8,  // Velocidad de los bloques horizontales
  VELOCIDAD_DIAG:   1.5,  // Velocidad de los rombos diagonales
  VELOCIDAD_GIR:    0.04, // Velocidad de rotación (radianes por tick)
  MARGEN_PARED:     30,   // Margen desde las paredes para no spawnear
  RADIO_COLISION:   16,   // Radio de colisión de obstáculos (aproximado)
};

// ============================================================
// CREACIÓN DE OBSTÁCULOS
// ============================================================

/**
 * Genera los obstáculos del nivel según la configuración.
 * @param {Object} configNivel - Configuración del nivel actual.
 * @param {{ancho:number, alto:number}} limites - Dimensiones del arena.
 * @param {Array<Jugador>} jugadores - Jugadores (para evitar spawn encima).
 * @returns {Array} Array de objetos de obstáculo.
 */
function generarObstaculos(configNivel, limites, jugadores) {
  const obstaculos = [];
  const tiposDisponibles = configNivel.obstaculos;
  if (tiposDisponibles.length === 0) return obstaculos;

  const cantidad = configNivel.cantidadObstaculos;
  const margen   = CONSTANTES_OBST.MARGEN_PARED + 40;

  for (let i = 0; i < cantidad; i++) {
    const tipo = tiposDisponibles[i % tiposDisponibles.length];
    let posicion;

    // Buscar posición libre lejos de los jugadores
    for (let intento = 0; intento < 20; intento++) {
      posicion = {
        x: aleatorioEntre(margen, limites.ancho - margen),
        y: aleatorioEntre(margen, limites.alto - margen),
      };
      const cercaJugador = jugadores.some(j =>
        calcularDistancia(posicion, j.posicion) < 100
      );
      const cercaObstaculo = obstaculos.some(o =>
        calcularDistancia(posicion, o.posicion) < 60
      );
      if (!cercaJugador && !cercaObstaculo) break;
    }

    obstaculos.push(crearObstaculo(tipo, posicion, limites));
  }

  return obstaculos;
}

/**
 * Crea un único obstáculo del tipo indicado.
 * @param {string} tipo - Tipo: 'estatico' | 'horizontal' | 'diagonal' | 'giratorio'.
 * @param {{x:number,y:number}} posicion - Posición inicial.
 * @param {{ancho:number,alto:number}} limites - Límites del arena.
 * @returns {Object} Objeto de obstáculo.
 */
function crearObstaculo(tipo, posicion, limites) {
  return {
    id:       generarId(),
    tipo,
    posicion: { ...posicion },
    limites:  { ...limites },
    activo:   true,
    // Movimiento para obstáculos dinámicos
    velocidadX: tipo === 'horizontal' ? (Math.random() > 0.5 ? 1 : -1) * CONSTANTES_OBST.VELOCIDAD_HORIZ : 0,
    velocidadY: 0,
    // Para el diagonal: velocidad en ambas direcciones
    velDiagX: tipo === 'diagonal' ? (Math.random() > 0.5 ? 1 : -1) * CONSTANTES_OBST.VELOCIDAD_DIAG : 0,
    velDiagY: tipo === 'diagonal' ? (Math.random() > 0.5 ? 1 : -1) * CONSTANTES_OBST.VELOCIDAD_DIAG : 0,
    // Para el giratorio
    angulo:    0,
    // Color según tipo
    color:     obtenerColorObstaculo(tipo),
    fasePulso: Math.random() * Math.PI * 2,
  };
}

/**
 * Devuelve el color de neón asignado a cada tipo de obstáculo.
 * @param {string} tipo - Tipo de obstáculo.
 * @returns {string} Color en hexadecimal.
 */
function obtenerColorObstaculo(tipo) {
  const colores = {
    estatico:   '#FF1744',
    horizontal: '#FF8C00',
    diagonal:   '#FF2D78',
    giratorio:  '#FF1744',
  };
  return colores[tipo] || '#FF1744';
}

// ============================================================
// ACTUALIZACIÓN DE POSICIONES
// ============================================================

/**
 * Actualiza la posición y rotación de todos los obstáculos dinámicos.
 * Los obstáculos rebotan al llegar a las paredes del arena.
 * @param {Array} obstaculos - Array de obstáculos activos.
 */
function actualizarObstaculos(obstaculos) {
  obstaculos.forEach(obs => {
    if (!obs.activo) return;
    switch (obs.tipo) {
      case 'horizontal':  actualizarObstaculoHorizontal(obs);  break;
      case 'diagonal':    actualizarObstaculoDiagonal(obs);    break;
      case 'giratorio':   actualizarObstaculoGiratorio(obs);   break;
      // 'estatico': no se mueve
    }
    // Avanzar fase de pulso para el glow animado
    obs.fasePulso += 0.04;
  });
}

/**
 * Mueve el obstáculo horizontalmente y lo hace rebotar en las paredes.
 * @param {Object} obs - Obstáculo horizontal.
 */
function actualizarObstaculoHorizontal(obs) {
  obs.posicion.x += obs.velocidadX;
  const margen = CONSTANTES_OBST.ANCHO_HORIZONTAL / 2 + 5;
  if (obs.posicion.x <= margen || obs.posicion.x >= obs.limites.ancho - margen) {
    obs.velocidadX *= -1;
    obs.posicion.x  = clamp(obs.posicion.x, margen, obs.limites.ancho - margen);
  }
}

/**
 * Mueve el rombo diagonal y lo hace rebotar en todas las paredes.
 * @param {Object} obs - Obstáculo diagonal.
 */
function actualizarObstaculoDiagonal(obs) {
  obs.posicion.x += obs.velDiagX;
  obs.posicion.y += obs.velDiagY;
  const margen = CONSTANTES_OBST.RADIO_DIAGONAL + 5;

  if (obs.posicion.x <= margen || obs.posicion.x >= obs.limites.ancho - margen) {
    obs.velDiagX  *= -1;
    obs.posicion.x = clamp(obs.posicion.x, margen, obs.limites.ancho - margen);
  }
  if (obs.posicion.y <= margen || obs.posicion.y >= obs.limites.alto - margen) {
    obs.velDiagY  *= -1;
    obs.posicion.y = clamp(obs.posicion.y, margen, obs.limites.alto - margen);
  }
}

/**
 * Rota el obstáculo giratorio sobre su eje.
 * @param {Object} obs - Obstáculo giratorio.
 */
function actualizarObstaculoGiratorio(obs) {
  obs.angulo += CONSTANTES_OBST.VELOCIDAD_GIR;
}

// ============================================================
// DIBUJO DE OBSTÁCULOS
// ============================================================

/**
 * Dibuja todos los obstáculos activos en el canvas.
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas.
 * @param {Array} obstaculos - Array de obstáculos activos.
 */
function dibujarObstaculos(ctx, obstaculos) {
  obstaculos.forEach(obs => {
    if (!obs.activo) return;
    const brillo = 1 + Math.sin(obs.fasePulso) * 0.3;
    ctx.save();
    ctx.shadowColor = obs.color;
    ctx.shadowBlur  = 12 * brillo;

    switch (obs.tipo) {
      case 'estatico':   dibujarBloqueEstatico(ctx, obs);   break;
      case 'horizontal': dibujarBloqueHorizontal(ctx, obs); break;
      case 'diagonal':   dibujarRomboDiagonal(ctx, obs);    break;
      case 'giratorio':  dibujarCruzGiratoria(ctx, obs);    break;
    }
    ctx.restore();
  });
}

/**
 * Dibuja un bloque estático rectangular con borde neón.
 * @param {CanvasRenderingContext2D} ctx - Contexto.
 * @param {Object} obs - Obstáculo estático.
 */
function dibujarBloqueEstatico(ctx, obs) {
  const mitadAncho = CONSTANTES_OBST.ANCHO_ESTATICO / 2;
  const mitadAlto  = CONSTANTES_OBST.ALTO_ESTATICO  / 2;

  ctx.fillStyle   = hexARgba(obs.color, 0.25);
  ctx.strokeStyle = obs.color;
  ctx.lineWidth   = 2;

  ctx.beginPath();
  ctx.rect(
    obs.posicion.x - mitadAncho,
    obs.posicion.y - mitadAlto,
    CONSTANTES_OBST.ANCHO_ESTATICO,
    CONSTANTES_OBST.ALTO_ESTATICO
  );
  ctx.fill();
  ctx.stroke();
}

/**
 * Dibuja el bloque horizontal con un trail (estela de movimiento).
 * @param {CanvasRenderingContext2D} ctx - Contexto.
 * @param {Object} obs - Obstáculo horizontal.
 */
function dibujarBloqueHorizontal(ctx, obs) {
  const mitadAncho = CONSTANTES_OBST.ANCHO_HORIZONTAL / 2;
  const mitadAlto  = CONSTANTES_OBST.ALTO_HORIZONTAL  / 2;

  // Trail de velocidad
  const direccionTrail = obs.velocidadX > 0 ? -1 : 1;
  const gradiente = ctx.createLinearGradient(
    obs.posicion.x + direccionTrail * mitadAncho,
    obs.posicion.y,
    obs.posicion.x - direccionTrail * mitadAncho * 2.5,
    obs.posicion.y
  );
  gradiente.addColorStop(0, hexARgba(obs.color, 0.4));
  gradiente.addColorStop(1, 'transparent');
  ctx.fillStyle = gradiente;
  ctx.fillRect(
    obs.posicion.x - mitadAncho * 2.5,
    obs.posicion.y - mitadAlto,
    mitadAncho * 3,
    CONSTANTES_OBST.ALTO_HORIZONTAL
  );

  // Cuerpo principal
  ctx.fillStyle   = hexARgba(obs.color, 0.3);
  ctx.strokeStyle = obs.color;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.rect(
    obs.posicion.x - mitadAncho,
    obs.posicion.y - mitadAlto,
    CONSTANTES_OBST.ANCHO_HORIZONTAL,
    CONSTANTES_OBST.ALTO_HORIZONTAL
  );
  ctx.fill();
  ctx.stroke();
}

/**
 * Dibuja el rombo diagonal rotado.
 * @param {CanvasRenderingContext2D} ctx - Contexto.
 * @param {Object} obs - Obstáculo diagonal.
 */
function dibujarRomboDiagonal(ctx, obs) {
  const r = CONSTANTES_OBST.RADIO_DIAGONAL;
  ctx.translate(obs.posicion.x, obs.posicion.y);
  ctx.rotate(Math.PI / 4);

  ctx.fillStyle   = hexARgba(obs.color, 0.3);
  ctx.strokeStyle = obs.color;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.rect(-r / 2, -r / 2, r, r);
  ctx.fill();
  ctx.stroke();
}

/**
 * Dibuja la cruz giratoria (aspa). Letal si el jugador toca las aspas.
 * @param {CanvasRenderingContext2D} ctx - Contexto.
 * @param {Object} obs - Obstáculo giratorio.
 */
function dibujarCruzGiratoria(ctx, obs) {
  const r = CONSTANTES_OBST.RADIO_GIRATORIO;
  ctx.translate(obs.posicion.x, obs.posicion.y);
  ctx.rotate(obs.angulo);

  ctx.strokeStyle = obs.color;
  ctx.lineWidth   = 5;
  ctx.lineCap     = 'round';

  // Aspa horizontal
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.stroke();

  // Aspa vertical
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(0, r);
  ctx.stroke();

  // Centro
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fillStyle = obs.color;
  ctx.fill();
}

// ============================================================
// COLISIÓN CON OBSTÁCULOS
// ============================================================

/**
 * Verifica si la posición del jugador colisiona con algún obstáculo.
 * Usa radio de colisión circular simplificado para todos los tipos.
 * @param {{x:number,y:number}} posicion - Posición del jugador.
 * @param {Array} obstaculos - Obstáculos activos en el mapa.
 * @returns {boolean} true si hay colisión con algún obstáculo.
 */
function colisionaConObstaculo(posicion, obstaculos) {
  return obstaculos.some(obs => {
    if (!obs.activo) return false;
    return calcularDistancia(posicion, obs.posicion) < CONSTANTES_OBST.RADIO_COLISION;
  });
}
