// orbes.js — Sistema de orbes de poder: definición, spawn y efectos.
// Todos los tipos de orbe son datos con su efecto encapsulado.

// Constantes del sistema de orbes
const CONSTANTES_ORBES = {
  RADIO_DETECCION:     16,   // Píxeles de distancia para recolectar un orbe
  RADIO_MINIMO:         7,   // Radio mínimo del orbe en píxeles
  RADIO_MAXIMO:        11,   // Radio máximo del orbe en píxeles
  DISTANCIA_MINIMA_SPAWN: 60, // Distancia mínima al spawnear lejos de las motos
  TIEMPO_VIDA_MS:    30000,  // Un orbe desaparece si nadie lo toma en 30s
};

// Puntaje por tipo de orbe (antes del multiplicador de nivel)
const PUNTOS_ORBE = {
  velocidad: 100,
  longitud:  150,
  turbo:      80,
  cortador:  120,
  escudo:     90,
};

// Definición de todos los tipos de orbes disponibles
const TIPOS_ORBE = {
  velocidad: {
    nombre:   'Impulso de Velocidad',
    color:    '#FFD700',
    radio:    9,
    icono:    '⚡',
    /**
     * Aumenta la velocidad un 20% durante 5 segundos.
     * @param {Jugador} jugador - Jugador que recoge el orbe.
     */
    aplicarEfecto(jugador) {
      const velocidadOriginal = jugador.velocidadBase;
      jugador.velocidadBase *= 1.2;
      if (!jugador.turboActivo) {
        jugador.velocidad = jugador.velocidadBase;
      }
      setTimeout(() => {
        jugador.velocidadBase = velocidadOriginal;
        if (!jugador.turboActivo) {
          jugador.velocidad = velocidadOriginal;
        }
      }, 5000);
    },
  },
  longitud: {
    nombre:   'Extensión de Estela',
    color:    '#00FF88',
    radio:    9,
    icono:    '➕',
    /**
     * Aumenta la longitud de la estela en 10 segmentos permanentemente.
     * @param {Jugador} jugador - Jugador que recoge el orbe.
     */
    aplicarEfecto(jugador) {
      jugador.longitud += 10;
    },
  },
  turbo: {
    nombre:   'Recarga de Turbo',
    color:    '#FF00FF',
    radio:    10,
    icono:    '🔋',
    /**
     * Recarga el 30% de turbo inmediatamente.
     * @param {Jugador} jugador - Jugador que recoge el orbe.
     */
    aplicarEfecto(jugador) {
      jugador.turboDisponible = Math.min(100, jugador.turboDisponible + 30);
    },
  },
  cortador: {
    nombre:   'Cortador de Estela',
    color:    '#FF4500',
    radio:    9,
    icono:    '✂',
    /**
     * Activa la capacidad de cortar la estela enemiga durante 8 segundos.
     * @param {Jugador} jugador - Jugador que recoge el orbe.
     */
    aplicarEfecto(jugador) {
      jugador.puedeCortar    = true;
      jugador.tiempoCortador = 8000;
    },
  },
  escudo: {
    nombre:   'Escudo de Energía',
    color:    '#87CEEB',
    radio:    10,
    icono:    '🛡',
    /**
     * Activa un escudo que absorbe la siguiente colisión durante 5 segundos.
     * @param {Jugador} jugador - Jugador que recoge el orbe.
     */
    aplicarEfecto(jugador) {
      jugador.escudoActivo = true;
      jugador.tiempoEscudo = 5000;
    },
  },
};

// Lista ordenada de tipos para el spawn aleatorio balanceado
const LISTA_TIPOS_ORBE = Object.keys(TIPOS_ORBE);

// ============================================================
// GESTIÓN DE ORBES EN EL MAPA
// ============================================================

/**
 * Crea un nuevo orbe en una posición aleatoria libre del mapa.
 * @param {{ancho:number, alto:number}} limites - Dimensiones del arena.
 * @param {Array<Jugador>} jugadores - Jugadores activos (para evitar spawn encima).
 * @param {Array} orbesActuales - Orbes ya en el mapa.
 * @returns {Object} Nuevo orbe con posición, tipo y estado.
 */
function crearOrbeAleatorio(limites, jugadores, orbesActuales) {
  const tipoKey = LISTA_TIPOS_ORBE[enteroAleatorioEntre(0, LISTA_TIPOS_ORBE.length - 1)];
  const tipo    = TIPOS_ORBE[tipoKey];

  // Intentar encontrar una posición libre (máx 30 intentos)
  let posicion;
  const margen = 50;
  for (let intento = 0; intento < 30; intento++) {
    posicion = {
      x: aleatorioEntre(margen, limites.ancho - margen),
      y: aleatorioEntre(margen, limites.alto - margen),
    };
    if (posicionEstaLibre(posicion, jugadores, orbesActuales)) break;
  }

  return {
    id:          generarId(),
    tipo:        tipoKey,
    posicion:    posicion,
    radio:       tipo.radio,
    color:       tipo.color,
    activo:      true,
    tiempoVidaMs: CONSTANTES_ORBES.TIEMPO_VIDA_MS,
    // Para la animación de pulso sinusoidal
    fasePulso:   Math.random() * Math.PI * 2,
  };
}

/**
 * Verifica que una posición no esté demasiado cerca de las motos ni de otros orbes.
 * @param {{x:number,y:number}} posicion - Posición candidata.
 * @param {Array<Jugador>} jugadores - Jugadores activos.
 * @param {Array} orbes - Orbes existentes en el mapa.
 * @returns {boolean} true si la posición está libre.
 */
function posicionEstaLibre(posicion, jugadores, orbes) {
  const cercaDeJugadores = jugadores.some(j =>
    calcularDistancia(posicion, j.posicion) < CONSTANTES_ORBES.DISTANCIA_MINIMA_SPAWN
  );
  const cercaDeOrbes = orbes.some(o =>
    calcularDistancia(posicion, o.posicion) < 30
  );
  return !cercaDeJugadores && !cercaDeOrbes;
}

/**
 * Aplica el efecto de un orbe al jugador que lo recogió.
 * Centraliza toda la lógica: aplicar efecto, sumar puntaje, reproducir sonido.
 * @param {Jugador} jugador - Jugador que recoge el orbe.
 * @param {Object} orbe - Orbe recogido.
 * @param {number} nivelActual - Nivel en curso (para multiplicador de puntaje).
 */
function recolectarOrbe(jugador, orbe, nivelActual) {
  const tipo = TIPOS_ORBE[orbe.tipo];
  if (!tipo) return;

  // Aplicar el efecto (cada tipo sabe cómo aplicarse a sí mismo)
  tipo.aplicarEfecto(jugador);

  // Añadir puntaje con multiplicador de nivel
  jugador.sumarPuntaje(PUNTOS_ORBE[orbe.tipo] || 100, nivelActual);

  // Marcar el orbe como inactivo para eliminarlo del mapa
  orbe.activo = false;
}

/**
 * Actualiza los temporizadores de todos los orbes activos.
 * Los orbes expiran si no son recogidos en tiempo máximo.
 * @param {Array} orbes - Orbes en el mapa.
 * @param {number} deltaMs - Tiempo transcurrido en ms.
 */
function actualizarOrbes(orbes, deltaMs) {
  orbes.forEach(orbe => {
    if (!orbe.activo) return;
    orbe.tiempoVidaMs -= deltaMs;
    if (orbe.tiempoVidaMs <= 0) {
      orbe.activo = false;
    }
    // Avanzar la fase de pulso para la animación sinusoidal
    orbe.fasePulso += 0.05;
  });
}

/**
 * Dibuja todos los orbes activos en el canvas con animación de pulso.
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas.
 * @param {Array} orbes - Orbes a dibujar.
 */
function dibujarOrbes(ctx, orbes) {
  orbes.forEach(orbe => {
    if (!orbe.activo) return;
    dibujarOrbeIndividual(ctx, orbe);
  });
}

/**
 * Dibuja un único orbe con animación de pulso sinusoidal y glow.
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas.
 * @param {Object} orbe - Orbe a dibujar.
 */
function dibujarOrbeIndividual(ctx, orbe) {
  const pulsacion = 1 + Math.sin(orbe.fasePulso) * 0.18;
  const radioActual = orbe.radio * pulsacion;

  ctx.save();

  // Halo exterior difuso
  ctx.beginPath();
  ctx.arc(orbe.posicion.x, orbe.posicion.y, radioActual + 6, 0, Math.PI * 2);
  ctx.fillStyle = hexARgba(orbe.color, 0.15);
  ctx.shadowBlur  = 20;
  ctx.shadowColor = orbe.color;
  ctx.fill();

  // Círculo principal
  ctx.beginPath();
  ctx.arc(orbe.posicion.x, orbe.posicion.y, radioActual, 0, Math.PI * 2);
  ctx.fillStyle   = orbe.color;
  ctx.shadowBlur  = 15;
  ctx.shadowColor = orbe.color;
  ctx.fill();

  // Punto brillante interior (especular)
  ctx.beginPath();
  ctx.arc(
    orbe.posicion.x - radioActual * 0.25,
    orbe.posicion.y - radioActual * 0.25,
    radioActual * 0.3, 0, Math.PI * 2
  );
  ctx.fillStyle  = 'rgba(255, 255, 255, 0.6)';
  ctx.shadowBlur = 0;
  ctx.fill();

  ctx.restore();
}
