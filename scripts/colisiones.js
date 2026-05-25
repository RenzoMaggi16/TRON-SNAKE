// colisiones.js — Detección y resolución de todas las colisiones del juego.
// Cada tipo de colisión es una función booleana independiente.

// Tolerancia de detección en píxeles.
// Con velocidad=2 y gracia=8 la distancia mínima al primer segmento peligroso
// es 8*2=16px, mucho mayor que esta tolerancia.
const TOLERANCIA_COLISION = 5;

// Longitud mínima de estela antes de verificar auto-colisión.
// Evita muertes falsas en los primeros frames.
const MIN_LONGITUD_AUTOKOLISION = 12;

// ============================================================
// FUNCIONES DE DETECCIÓN (retornan boolean)
// ============================================================

/**
 * ¿La posición del jugador está fuera del área de juego?
 * @param {{x:number,y:number}} posicion - Posición a verificar.
 * @param {{ancho:number,alto:number}} limites - Dimensiones del arena.
 * @returns {boolean} true si está fuera de los límites.
 */
function estaFueraDelArena(posicion, limites) {
  return posicion.x < TOLERANCIA_COLISION
      || posicion.x > limites.ancho - TOLERANCIA_COLISION
      || posicion.y < TOLERANCIA_COLISION
      || posicion.y > limites.alto - TOLERANCIA_COLISION;
}

/**
 * ¿El jugador chocó con algún segmento de una estela dada?
 * Ignora los segmentos más nuevos (zona de gracia) para evitar
 * que la moto colisione consigo misma al girar.
 * @param {{x:number,y:number}} posicion - Posición del jugador.
 * @param {Array<{x:number,y:number}>} segmentos - Segmentos de la estela.
 * @param {number} segmentosIgnorar - Cantidad de segmentos recientes a ignorar.
 * @returns {boolean} true si hay colisión con la estela.
 */
function chocaConEstela(posicion, segmentos, segmentosIgnorar) {
  if (segmentos.length <= segmentosIgnorar) return false;
  const segmentosRelevantes = segmentos.slice(segmentosIgnorar);
  return segmentosRelevantes.some(seg => mismasCoordenadas(posicion, seg));
}

/**
 * ¿Dos posiciones son efectivamente la misma celda del grid de colisión?
 * Usa tolerancia en píxeles en vez de igualdad exacta.
 * @param {{x:number,y:number}} posA - Primera posición.
 * @param {{x:number,y:number}} posB - Segunda posición.
 * @returns {boolean} true si están dentro de la tolerancia.
 */
function mismasCoordenadas(posA, posB) {
  return Math.abs(posA.x - posB.x) < TOLERANCIA_COLISION
      && Math.abs(posA.y - posB.y) < TOLERANCIA_COLISION;
}

/**
 * ¿El jugador tocó un orbe?
 * La detección es circular basada en el radio del orbe más el radio de la moto.
 * @param {{x:number,y:number}} posicionJugador - Posición de la moto.
 * @param {Object} orbe - Orbe a verificar.
 * @returns {boolean} true si el jugador toca el orbe.
 */
function tocaOrbe(posicionJugador, orbe) {
  const distancia = calcularDistancia(posicionJugador, orbe.posicion);
  return distancia <= orbe.radio + CONSTANTES_JUGADOR.RADIO_MOTO;
}

/**
 * ¿El jugador está dentro del rango de activación de un portal?
 * @param {{x:number,y:number}} posicion - Posición del jugador.
 * @param {{x:number,y:number}} portal - Posición del portal.
 * @returns {boolean} true si está dentro del rango.
 */
function estaEnPortal(posicion, portal) {
  return calcularDistancia(posicion, portal) < 20;
}

// ============================================================
// FUNCIÓN PRINCIPAL DE VERIFICACIÓN
// ============================================================

/**
 * Verifica todas las colisiones posibles para ambos jugadores en un tick.
 * Si hay colisión, llama a resolverColision() para procesar la consecuencia.
 * @param {Object} estadoJuego - Estado global del juego.
 */
function verificarTodasLasColisiones(estadoJuego) {
  const [j1, j2] = estadoJuego.jugadores;

  // No verificar colisiones si el juego no está activo
  if (!estadoJuego.activo || estadoJuego.pausado) return;

  [j1, j2].forEach(jugador => {
    // Jugadores eliminados o en proceso de reanimación no colisionan
    if (jugador.eliminado || jugador.enReanimacion) return;

    // Los jugadores en salto no colisionan con estelas
    const verificarEstelasPorSalto = !jugador.enSalto;

    // 1. Colisión con la pared del arena
    if (estaFueraDelArena(jugador.posicion, estadoJuego.limites)) {
      resolverColision(jugador, estadoJuego, 'pared', null);
      return;
    }

    // 2. Colisión con obstáculos dinámicos
    if (colisionaConObstaculo(jugador.posicion, estadoJuego.obstaculos)) {
      resolverColision(jugador, estadoJuego, 'obstaculo', null);
      return;
    }

    if (verificarEstelasPorSalto) {
      const enemigo = jugador.id === j1.id ? j2 : j1;

      // 3. Colisión con la estela propia (auto-colisión).
      // Solo se comprueba si la estela es lo suficientemente larga para que sea físicamente posible.
      const estelaLargaSuficiente = jugador.estelaSegmentos.length >= MIN_LONGITUD_AUTOKOLISION;
      if (estelaLargaSuficiente && chocaConEstela(jugador.posicion, jugador.estelaSegmentos, CONSTANTES_JUGADOR.SEGMENTOS_GRACIA)) {
        resolverColision(jugador, estadoJuego, 'estelaPropia', null);
        return;
      }

      // 4. Colisión con la estela del enemigo.
      // Se ignoran los primeros 3 segmentos del enemigo para evitar colisiones
      // falsas en los frames inmediatos al cruce de trayectorias.
      if (!enemigo.eliminado && !enemigo.enReanimacion) {
        if (chocaConEstela(jugador.posicion, enemigo.estelaSegmentos, 3)) {
          // Si el jugador tiene orbe cortador activo, corta en vez de morir
          if (jugador.puedeCortar) {
            cortarEstelaEnemiga(jugador, enemigo, estadoJuego);
          } else {
            resolverColision(jugador, estadoJuego, 'estelaEnemiga', enemigo);
          }
          return;
        }
      }
    }
  });
}

/**
 * Verifica si algún jugador recogió un orbe en este tick.
 * @param {Object} estadoJuego - Estado global del juego.
 */
function verificarRecoleccionDeOrbes(estadoJuego) {
  estadoJuego.jugadores.forEach(jugador => {
    if (jugador.eliminado || jugador.enReanimacion) return;

    estadoJuego.orbes.forEach(orbe => {
      if (!orbe.activo) return;
      if (tocaOrbe(jugador.posicion, orbe)) {
        recolectarOrbe(jugador, orbe, estadoJuego.nivelActual);
        // Notificar al HUD para mostrar el puntaje flotante
        crearPuntajeFlotante(
          orbe.posicion.x,
          orbe.posicion.y,
          `+${PUNTOS_ORBE[orbe.tipo] || 100}`,
          orbe.color
        );
        SoundManager.play('fx_item_orb');
      }
    });
  });
}

/**
 * Verifica si algún jugador está en un portal y gestiona la teletransportación.
 * Ambos jugadores deben activar el mismo portal en ≤2 segundos.
 * @param {Object} estadoJuego - Estado global del juego.
 * @param {number} deltaMs - Tiempo transcurrido en ms.
 */
function verificarPortales(estadoJuego, deltaMs) {
  if (!estadoJuego.portales || estadoJuego.portales.length === 0) return;

  estadoJuego.portales.forEach(par => {
    // Reducir cooldown de activación
    if (par.cooldown > 0) {
      par.cooldown = Math.max(0, par.cooldown - deltaMs);
      return; // En cooldown, no procesar
    }

    estadoJuego.jugadores.forEach(jugador => {
      if (jugador.eliminado || jugador.enReanimacion) return;

      // Verificar si el jugador toca el portal A o el portal B
      const tocaA = estaEnPortal(jugador.posicion, par.posicionA);
      const tocaB = estaEnPortal(jugador.posicion, par.posicionB);

      if (tocaA || tocaB) {
        const portalTocado = tocaA ? 'A' : 'B';
        // Registrar la activación
        if (!par.activaciones) par.activaciones = {};
        par.activaciones[jugador.id] = { portal: portalTocado, tiempo: Date.now() };

        // Verificar si ambos jugadores activaron el mismo par de portales
        const ids = Object.keys(par.activaciones);
        if (ids.length === 2) {
          const tiempoJ1 = par.activaciones[ids[0]].tiempo;
          const tiempoJ2 = par.activaciones[ids[1]].tiempo;
          const diferencia = Math.abs(tiempoJ1 - tiempoJ2);

          if (diferencia <= 2000) {
            // ¡Ambos activaron en tiempo! Teletransportar
            teletransportarJugadores(estadoJuego.jugadores, par);
            par.activaciones = {};
            par.cooldown = 3000; // 3 segundos de cooldown antes de reactivar
          } else {
            // Expiró el tiempo, limpiar activaciones
            par.activaciones = {};
          }
        }
      }
    });
  });
}

/**
 * Corta la estela enemiga en vez de eliminar al jugador (orbe/habilidad cortadora).
 * Elimina los últimos 20 segmentos de la estela del enemigo.
 * @param {Jugador} cortador - Jugador que tiene la capacidad de corte.
 * @param {Jugador} enemigo - Jugador cuya estela se corta.
 * @param {Object} estadoJuego - Estado global del juego.
 */
function cortarEstelaEnemiga(cortador, enemigo, estadoJuego) {
  const segmentosACortart = Math.min(20, enemigo.estelaSegmentos.length);
  enemigo.estelaSegmentos.splice(-segmentosACortart);

  // Puntaje por corte
  cortador.sumarPuntaje(500, estadoJuego.nivelActual);
  crearPuntajeFlotante(cortador.posicion.x, cortador.posicion.y, '+500', cortador.color);

  // Efecto de partículas en el punto de corte
  crearExplosionParticulas(
    enemigo.posicion.x,
    enemigo.posicion.y,
    enemigo.color,
    estadoJuego.particulas,
    12
  );

  SoundManager.play('fx_ability_activate');
}

/**
 * Teletransporta a ambos jugadores al portal complementario.
 * @param {Array<Jugador>} jugadores - Array con los dos jugadores.
 * @param {Object} par - Par de portales con posiciones A y B.
 */
function teletransportarJugadores(jugadores, par) {
  jugadores.forEach(jugador => {
    const activacion = par.activaciones && par.activaciones[jugador.id];
    if (!activacion) return;

    // Llevar al jugador al portal contrario
    const destino = activacion.portal === 'A' ? par.posicionB : par.posicionA;
    jugador.posicion = { x: destino.x, y: destino.y };
    jugador.sumarPuntaje(200, 1); // Puntaje fijo por usar portal (sin multiplicador)
  });
  SoundManager.play('fx_env_portal');
}

// ============================================================
// RESOLUCIÓN DE COLISIONES
// ============================================================

/**
 * Resuelve la consecuencia de una colisión detectada.
 * Si el jugador puede reanimar, inicia el proceso. Si no, lo elimina definitivamente.
 * @param {Jugador} jugador - Jugador que colisionó.
 * @param {Object} estadoJuego - Estado global del juego.
 * @param {string} tipoColision - Tipo de colisión detectada.
 * @param {Jugador|null} enemigo - Jugador enemigo (si aplica).
 */
function resolverColision(jugador, estadoJuego, tipoColision, enemigo) {
  // El escudo absorbe la colisión — otorga invulnerabilidad post-absorción
  if (jugador.escudoActivo) {
    jugador.escudoActivo    = false;
    jugador.tiempoEscudo    = 0;
    // Invulnerabilidad temporal de 1500ms tras absorber el golpe
    jugador.invulnerable    = true;
    jugador.tiempoInvulnerable = 1500;
    jugador.destellando     = true;
    // Explosión de partículas azul cielo para indicar la absorción
    crearExplosionParticulas(
      jugador.posicion.x,
      jugador.posicion.y,
      '#87CEEB',
      estadoJuego.particulas,
      18
    );
    SoundManager.play('fx_ability_activate');
    return;
  }

  // Crear explosión de partículas en el punto de colisión
  crearExplosionParticulas(
    jugador.posicion.x,
    jugador.posicion.y,
    jugador.color,
    estadoJuego.particulas,
    20
  );

  SoundManager.play('fx_crash_explosion');

  const puedeReanimar = jugador.recibirDano();

  if (puedeReanimar) {
    // Iniciar reanimación: mostrar countdown en HUD
    iniciarReanimacion(jugador, estadoJuego);
  } else if (jugador.eliminado) {
    // Si no tiene más vidas, terminar la partida
    setTimeout(() => {
      SoundManager.play('fx_player_death');
    }, 300);
    
    const ganador = estadoJuego.jugadores.find(j => j.id !== jugador.id && !j.eliminado);
    if (ganador) {
      ganador.sumarPuntaje(1000, estadoJuego.nivelActual);
    }
    terminarJuego(ganador);
  }
}

/**
 * Inicia la secuencia de reanimación de un jugador:
 * muestra el contador 3-2-1 y reaparece en posición de spawn.
 * @param {Jugador} jugador - Jugador a reanimar.
 * @param {Object} estadoJuego - Estado global del juego.
 */
function iniciarReanimacion(jugador, estadoJuego) {
  jugador.enReanimacion    = true;
  jugador.tiempoReanimacion = 3000;
  mostrarContadorReanimacion(3, () => {
    jugador.reanimar();
  });
}

// ============================================================
// PARTÍCULAS DE EXPLOSIÓN
// ============================================================

/**
 * Crea un grupo de partículas de explosión en un punto.
 * Las partículas se añaden al array global de partículas del estado.
 * @param {number} x - Posición X del centro de la explosión.
 * @param {number} y - Posición Y del centro de la explosión.
 * @param {string} color - Color de las partículas.
 * @param {Array} particulas - Array global de partículas del estado.
 * @param {number} cantidad - Número de partículas a crear.
 */
function crearExplosionParticulas(x, y, color, particulas, cantidad) {
  for (let i = 0; i < cantidad; i++) {
    const angulo    = (Math.PI * 2 * i) / cantidad + aleatorioEntre(-0.3, 0.3);
    const velocidad = aleatorioEntre(1.5, 5);
    particulas.push({
      x,
      y,
      vx:      Math.cos(angulo) * velocidad,
      vy:      Math.sin(angulo) * velocidad,
      vida:    aleatorioEntre(400, 700),
      vidaMax: 700,
      color,
      radio:   aleatorioEntre(1.5, 3.5),
    });
  }
}
