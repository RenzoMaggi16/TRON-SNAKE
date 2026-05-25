// eventos.js — Captura de teclado y controles táctiles.
// Gestiona el estado de teclas presionadas para el game loop.

// Objeto central de teclas presionadas — true si está presionada ahora mismo
const teclasPresionadas = {};

// Mapa de teclas por jugador (usado en motor.js para procesar entradas)
const TECLAS_JUGADOR = {
  1: {
    arriba:    'w',
    abajo:     's',
    izquierda: 'a',
    derecha:   'd',
    turbo:     'q',
    salto:     'e',
    habilidad: 'r',
  },
  2: {
    arriba:    'ArrowUp',
    abajo:     'ArrowDown',
    izquierda: 'ArrowLeft',
    derecha:   'ArrowRight',
    turbo:     'Numpad0',
    salto:     'NumpadDecimal',
    habilidad: 'NumpadEnter',
  },
};

// Flags de dirección para evitar múltiples giros en el mismo frame
const estadoEntrada = {
  j1CambioEsteFrame: false,
  j2CambioEsteFrame: false,
};

// ============================================================
// LISTENERS DE TECLADO
// ============================================================

/**
 * Registra los listeners de teclado para el juego.
 * También registra la tecla Escape para pausar.
 */
function inicializarEventos() {
  document.addEventListener('keydown', manejarKeyDown);
  document.addEventListener('keyup',   manejarKeyUp);
}

/**
 * Elimina los listeners de teclado al terminar el juego.
 */
function eliminarEventos() {
  document.removeEventListener('keydown', manejarKeyDown);
  document.removeEventListener('keyup',   manejarKeyUp);
}

/**
 * Maneja el evento keydown: registra la tecla en el objeto de estado.
 * @param {KeyboardEvent} evento - Evento de teclado del navegador.
 */
function manejarKeyDown(evento) {
  // Guardar tanto la tecla (minúscula) como el código de la tecla
  teclasPresionadas[evento.key.toLowerCase()] = true;
  teclasPresionadas[evento.code]              = true;

  // Pause con Escape
  if (evento.key === 'Escape') {
    togglePausa();
  }

  // Prevenir el scroll de la página con las teclas de flecha y espacio
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(evento.key)) {
    evento.preventDefault();
  }
}

/**
 * Maneja el evento keyup: libera la tecla del objeto de estado.
 * @param {KeyboardEvent} evento - Evento de teclado del navegador.
 */
function manejarKeyUp(evento) {
  teclasPresionadas[evento.key.toLowerCase()] = false;
  teclasPresionadas[evento.code]              = false;
}

// ============================================================
// PROCESAMIENTO DE ENTRADAS EN EL GAME LOOP
// ============================================================

/**
 * Lee el estado de las teclas y aplica los cambios de dirección/acción
 * a cada jugador. Se llama una vez por tick en motor.js.
 * @param {Array<Jugador>} jugadores - Array con los dos jugadores.
 * @param {Jugador} jugadorEnemigo1 - Enemigo del jugador 1 (para habilidades).
 * @param {Jugador} jugadorEnemigo2 - Enemigo del jugador 2 (para habilidades).
 */
function procesarEntradas(jugadores, jugadorEnemigo1, jugadorEnemigo2) {
  // Resetear los flags de cambio de dirección para este frame
  estadoEntrada.j1CambioEsteFrame = false;
  estadoEntrada.j2CambioEsteFrame = false;

  const [j1, j2] = jugadores;

  // Procesar entradas del Jugador 1
  if (!j1.eliminado && !j1.enReanimacion) {
    procesarEntradasJugador(j1, TECLAS_JUGADOR[1], jugadorEnemigo1, 'j1');
  }

  // Procesar entradas del Jugador 2
  if (!j2.eliminado && !j2.enReanimacion) {
    procesarEntradasJugador(j2, TECLAS_JUGADOR[2], jugadorEnemigo2, 'j2');
  }
}

/**
 * Procesa todas las entradas de un jugador específico en este tick.
 * @param {Jugador} jugador - Jugador a actualizar.
 * @param {Object} teclas - Mapa de teclas de este jugador.
 * @param {Jugador} enemigo - Jugador contrario (para habilidades).
 * @param {string} flagKey - 'j1' o 'j2' para el flag de cambio de dirección.
 */
function procesarEntradasJugador(jugador, teclas, enemigo, flagKey) {
  // === CAMBIO DE DIRECCIÓN ===
  // Solo se permite un cambio de dirección por frame para evitar giros imposibles
  if (!estadoEntrada[`${flagKey}CambioEsteFrame`]) {

    if (teclasPresionadas[teclas.arriba]) {
      if (jugador.direccion.dy !== -1) SoundManager.play('fx_bike_turn');
      jugador.cambiarDireccion({ dx: 0, dy: -1 });
      estadoEntrada[`${flagKey}CambioEsteFrame`] = true;
    } else if (teclasPresionadas[teclas.abajo]) {
      if (jugador.direccion.dy !== 1) SoundManager.play('fx_bike_turn');
      jugador.cambiarDireccion({ dx: 0, dy: 1 });
      estadoEntrada[`${flagKey}CambioEsteFrame`] = true;
    } else if (teclasPresionadas[teclas.izquierda]) {
      if (jugador.direccion.dx !== -1) SoundManager.play('fx_bike_turn');
      jugador.cambiarDireccion({ dx: -1, dy: 0 });
      estadoEntrada[`${flagKey}CambioEsteFrame`] = true;
    } else if (teclasPresionadas[teclas.derecha]) {
      if (jugador.direccion.dx !== 1) SoundManager.play('fx_bike_turn');
      jugador.cambiarDireccion({ dx: 1, dy: 0 });
      estadoEntrada[`${flagKey}CambioEsteFrame`] = true;
    }
  }

  // === TURBO ===
  if (teclasPresionadas[teclas.turbo] || teclasPresionadas[teclas.turbo.toLowerCase()]) {
    if (!jugador.turboActivo && jugador.turboDisponible > 0 && !jugador.empActivo) {
      SoundManager.play('fx_bike_boost');
    }
    jugador.activarTurbo();
  } else {
    jugador.desactivarTurbo();
  }

  // === SALTO (edge-triggered: solo se activa al pulsar, no al mantener) ===
  // La lógica de edge-trigger se maneja con el flag en el objeto jugador
  if ((teclasPresionadas[teclas.salto] || teclasPresionadas[teclas.salto?.toLowerCase()])
       && !jugador._teclasSaltoPrevias) {
    if (jugador.puedeRealizarSalto()) {
      jugador.iniciarSalto();
      SoundManager.play('fx_bike_jump');
    }
  }
  jugador._teclasSaltoPrevias = teclasPresionadas[teclas.salto]
    || teclasPresionadas[teclas.salto?.toLowerCase()];

  // === HABILIDAD ESPECIAL (edge-triggered) ===
  const habPresionada = teclasPresionadas[teclas.habilidad]
    || teclasPresionadas[teclas.habilidad?.toLowerCase()];
  if (habPresionada && !jugador._teclasHabilidadPrevias) {
    if (jugador.cooldownHabilidad <= 0 && !jugador.eliminado) {
      jugador.activarHabilidad(enemigo);
      SoundManager.play('fx_ability_activate');
    }
  }
  jugador._teclasHabilidadPrevias = habPresionada;
}

// ============================================================
// CONTROLES TÁCTILES (MÓVIL)
// ============================================================

/**
 * Inicializa los controles táctiles del D-pad para móviles.
 * Conecta los botones virtuales a las teclas lógicas del juego.
 * @param {Array<Jugador>} jugadores - Array con los dos jugadores.
 */
function inicializarControlesTactiles(jugadores) {
  // Solo mostrar en dispositivos táctiles
  const esTactil = window.matchMedia('(max-width: 768px)').matches
                || ('ontouchstart' in window);
  if (!esTactil) return;

  const controles = document.getElementById('controlesTactiles');
  if (controles) controles.removeAttribute('hidden');

  const asignaciones = [
    // Jugador 1
    { idBtn: 'dpadJ1Up',     accion: () => { if (jugadores[0].direccion.dy !== -1) SoundManager.play('fx_bike_turn'); jugadores[0].cambiarDireccion({ dx: 0, dy: -1 }); } },
    { idBtn: 'dpadJ1Down',   accion: () => { if (jugadores[0].direccion.dy !== 1) SoundManager.play('fx_bike_turn'); jugadores[0].cambiarDireccion({ dx: 0, dy: 1 }); } },
    { idBtn: 'dpadJ1Left',   accion: () => { if (jugadores[0].direccion.dx !== -1) SoundManager.play('fx_bike_turn'); jugadores[0].cambiarDireccion({ dx: -1, dy: 0 }); } },
    { idBtn: 'dpadJ1Right',  accion: () => { if (jugadores[0].direccion.dx !== 1) SoundManager.play('fx_bike_turn'); jugadores[0].cambiarDireccion({ dx: 1, dy: 0 }); } },
    { idBtn: 'dpadJ1Turbo',  accion: () => { if (!jugadores[0].turboActivo) SoundManager.play('fx_bike_boost'); jugadores[0].activarTurbo(); }, esToggle: true },
    { idBtn: 'dpadJ1Salto',  accion: () => { if (jugadores[0].puedeRealizarSalto()) { jugadores[0].iniciarSalto(); SoundManager.play('fx_bike_jump'); } } },
    { idBtn: 'dpadJ1Hab',    accion: () => { if (jugadores[0].cooldownHabilidad <= 0) { jugadores[0].activarHabilidad(jugadores[1]); SoundManager.play('fx_ability_activate'); } } },
    // Jugador 2
    { idBtn: 'dpadJ2Up',     accion: () => { if (jugadores[1].direccion.dy !== -1) SoundManager.play('fx_bike_turn'); jugadores[1].cambiarDireccion({ dx: 0, dy: -1 }); } },
    { idBtn: 'dpadJ2Down',   accion: () => { if (jugadores[1].direccion.dy !== 1) SoundManager.play('fx_bike_turn'); jugadores[1].cambiarDireccion({ dx: 0, dy: 1 }); } },
    { idBtn: 'dpadJ2Left',   accion: () => { if (jugadores[1].direccion.dx !== -1) SoundManager.play('fx_bike_turn'); jugadores[1].cambiarDireccion({ dx: -1, dy: 0 }); } },
    { idBtn: 'dpadJ2Right',  accion: () => { if (jugadores[1].direccion.dx !== 1) SoundManager.play('fx_bike_turn'); jugadores[1].cambiarDireccion({ dx: 1, dy: 0 }); } },
    { idBtn: 'dpadJ2Turbo',  accion: () => { if (!jugadores[1].turboActivo) SoundManager.play('fx_bike_boost'); jugadores[1].activarTurbo(); }, esToggle: true },
    { idBtn: 'dpadJ2Salto',  accion: () => { if (jugadores[1].puedeRealizarSalto()) { jugadores[1].iniciarSalto(); SoundManager.play('fx_bike_jump'); } } },
    { idBtn: 'dpadJ2Hab',    accion: () => { if (jugadores[1].cooldownHabilidad <= 0) { jugadores[1].activarHabilidad(jugadores[0]); SoundManager.play('fx_ability_activate'); } } },
  ];

  asignaciones.forEach(({ idBtn, accion }) => {
    const btn = document.getElementById(idBtn);
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      accion();
    }, { passive: false });
  });
}
