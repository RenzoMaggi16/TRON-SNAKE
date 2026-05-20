// niveles.js — Configuración de los 7 niveles con dificultad progresiva.
// Cada nivel define obstáculos, velocidad, portales y reglas únicas.

const NIVELES = [
  {
    id:                    1,
    nombre:                'Sector Inicial',
    descripcion:           'Sin obstáculos. Aprende los controles.',
    velocidadBase:         2.0,
    multiplicadorVelocidad: 1.0,
    obstaculos:            [],
    cantidadObstaculos:    0,
    portalActivo:          false,
    maxOrbes:              3,
    tiempoSpawnOrbeMs:     5000,
    colorGrid:             'rgba(0, 212, 255, 0.06)',
    estelaRegenerativa:    false,
  },
  {
    id:                    2,
    nombre:                'Zona de Detritos',
    descripcion:           'Obstáculos estáticos en el mapa.',
    velocidadBase:         2.2,
    multiplicadorVelocidad: 1.1,
    obstaculos:            ['estatico'],
    cantidadObstaculos:    6,
    portalActivo:          false,
    maxOrbes:              4,
    tiempoSpawnOrbeMs:     4500,
    colorGrid:             'rgba(0, 212, 255, 0.05)',
    estelaRegenerativa:    false,
  },
  {
    id:                    3,
    nombre:                'Corredor Pulsante',
    descripcion:           'Obstáculos que se mueven horizontalmente.',
    velocidadBase:         2.5,
    multiplicadorVelocidad: 1.2,
    obstaculos:            ['horizontal'],
    cantidadObstaculos:    4,
    portalActivo:          false,
    maxOrbes:              4,
    tiempoSpawnOrbeMs:     4000,
    colorGrid:             'rgba(0, 140, 255, 0.05)',
    estelaRegenerativa:    false,
  },
  {
    id:                    4,
    nombre:                'Nexo de Portales',
    descripcion:           '¡Ambos deben cruzar para activar el portal!',
    velocidadBase:         2.8,
    multiplicadorVelocidad: 1.3,
    obstaculos:            ['estatico'],
    cantidadObstaculos:    5,
    portalActivo:          true,
    maxOrbes:              5,
    tiempoSpawnOrbeMs:     3500,
    colorGrid:             'rgba(0, 100, 255, 0.05)',
    estelaRegenerativa:    false,
  },
  {
    id:                    5,
    nombre:                'Tormenta Eléctrica',
    descripcion:           'Obstáculos que rebotan en diagonal.',
    velocidadBase:         3.2,
    multiplicadorVelocidad: 1.5,
    obstaculos:            ['diagonal', 'estatico'],
    cantidadObstaculos:    6,
    portalActivo:          true,
    maxOrbes:              5,
    tiempoSpawnOrbeMs:     3000,
    colorGrid:             'rgba(0, 80, 255, 0.05)',
    estelaRegenerativa:    false,
  },
  {
    id:                    6,
    nombre:                'Caos del Grid',
    descripcion:           'Todos los tipos de obstáculos. Portales obligatorios.',
    velocidadBase:         3.6,
    multiplicadorVelocidad: 1.7,
    obstaculos:            ['estatico', 'horizontal', 'diagonal', 'giratorio'],
    cantidadObstaculos:    8,
    portalActivo:          true,
    maxOrbes:              6,
    tiempoSpawnOrbeMs:     2500,
    colorGrid:             'rgba(120, 0, 255, 0.05)',
    estelaRegenerativa:    false,
  },
  {
    id:                    7,
    nombre:                'MODO MAESTRO',
    descripcion:           'Velocidad alta. Obstáculos en todos lados. Los portales son obligatorios para ganar.',
    // Velocidad reducida un 15% respecto a la versión anterior para mayor jugabilidad
    velocidadBase:         3.8,
    multiplicadorVelocidad: 1.7,
    obstaculos:            ['estatico', 'horizontal', 'diagonal', 'giratorio'],
    cantidadObstaculos:    10,
    portalActivo:          true,
    maxOrbes:              6,        // Reducido para evitar saturación
    tiempoSpawnOrbeMs:     2500,     // Más tiempo entre orbes
    colorGrid:             'rgba(255, 0, 100, 0.05)',
    estelaRegenerativa:    false,    // Las estelas se borran normalmente
    // Mecánica especial: bonus de puntos al usar el portal
    portalOtorgaBonus:     true,
    bonusPortal:           500,
  },
];

/**
 * Obtiene la configuración de un nivel por su número (1-7).
 * @param {number} numeroNivel - Número del nivel (1 a 7).
 * @returns {Object} Configuración del nivel.
 */
function obtenerConfigNivel(numeroNivel) {
  const indice = clamp(numeroNivel - 1, 0, NIVELES.length - 1);
  return NIVELES[indice];
}

/**
 * Calcula el multiplicador de puntaje para un nivel dado.
 * Fórmula: 1 + (nivel - 1) × 0.3
 * @param {number} nivel - Número del nivel.
 * @returns {number} Multiplicador de puntaje.
 */
function calcularMultiplicadorPuntaje(nivel) {
  return 1 + (nivel - 1) * 0.3;
}
