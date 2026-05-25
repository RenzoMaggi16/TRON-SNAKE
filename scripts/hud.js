// hud.js — HUD overlay HTML y efectos visuales de eventos del juego.
// Actualiza los elementos DOM del HUD en cada frame.

// Referencias a los elementos DOM del HUD (se inicializan en inicializarHUD)
const elementosHUD = {
  j1Nombre:    null,
  j1Turbo:     null,
  j1TurboContenedor: null,
  j1Vidas:     [],
  j1Puntaje:   null,
  j1HabIcono:  null,
  j1HabNombre: null,
  j1HabEstado: null,
  j1SaltoContenedor: null,  // Contenedor del indicador de salto J1
  j2Nombre:    null,
  j2Turbo:     null,
  j2TurboContenedor: null,
  j2Vidas:     [],
  j2Puntaje:   null,
  j2HabIcono:  null,
  j2HabNombre: null,
  j2HabEstado: null,
  j2SaltoContenedor: null,  // Contenedor del indicador de salto J2
  nivelTexto:  null,
  temporizador:null,
  contenedorFlotantes: null,
  overlayContador:     null,
};

// ============================================================
// INICIALIZACIÓN
// ============================================================

/**
 * Conecta las referencias a los elementos DOM del HUD.
 * Debe llamarse una sola vez antes de iniciar el juego.
 */
function inicializarHUD() {
  elementosHUD.j1Nombre    = document.getElementById('hud1Nombre');
  elementosHUD.j1Turbo     = document.getElementById('hud1Turbo');
  elementosHUD.j1TurboContenedor = document.getElementById('hud1BarraTurboContenedor');
  elementosHUD.j1Vidas     = [
    document.getElementById('hud1Vida1'),
    document.getElementById('hud1Vida2'),
    document.getElementById('hud1Vida3'),
  ];
  elementosHUD.j1Puntaje   = document.getElementById('hud1Puntaje');
  elementosHUD.j1HabIcono  = document.getElementById('hud1HabIcono');
  elementosHUD.j1HabNombre = document.getElementById('hud1HabNombre');
  elementosHUD.j1HabEstado = document.getElementById('hud1HabEstado');

  elementosHUD.j2Nombre    = document.getElementById('hud2Nombre');
  elementosHUD.j2Turbo     = document.getElementById('hud2Turbo');
  elementosHUD.j2TurboContenedor = document.getElementById('hud2BarraTurboContenedor');
  elementosHUD.j2Vidas     = [
    document.getElementById('hud2Vida1'),
    document.getElementById('hud2Vida2'),
    document.getElementById('hud2Vida3'),
  ];
  elementosHUD.j2Puntaje   = document.getElementById('hud2Puntaje');
  elementosHUD.j2HabIcono  = document.getElementById('hud2HabIcono');
  elementosHUD.j2HabNombre = document.getElementById('hud2HabNombre');
  elementosHUD.j2HabEstado = document.getElementById('hud2HabEstado');
  // Indicadores de cooldown de salto (pueden ser null si no existen en el HTML)
  elementosHUD.j1SaltoContenedor = document.getElementById('hud1SaltoContenedor');
  elementosHUD.j2SaltoContenedor = document.getElementById('hud2SaltoContenedor');

  elementosHUD.nivelTexto   = document.getElementById('hudNivelTexto');
  elementosHUD.temporizador = document.getElementById('hudTemporizador');
  elementosHUD.contenedorFlotantes = document.getElementById('contenedorFlotantes');
  elementosHUD.overlayContador     = document.getElementById('overlayContador');
}

// ============================================================
// ACTUALIZACIÓN DEL HUD
// ============================================================

/**
 * Actualiza todos los elementos del HUD con el estado actual del juego.
 * Se llama en cada frame del game loop.
 * @param {Object} estadoJuego - Estado global del juego.
 */
function actualizarHUD(estadoJuego) {
  const [j1, j2] = estadoJuego.jugadores;

  // Actualizar HUD de cada jugador
  actualizarHUDJugador(j1, 1);
  actualizarHUDJugador(j2, 2);

  // Actualizar información central (nivel y temporizador)
  actualizarCentroHUD(estadoJuego);
}

/**
 * Actualiza el panel HUD de un jugador individual.
 * @param {Jugador} jugador - Jugador cuyos datos actualizar.
 * @param {number} numeroJugador - 1 o 2.
 */
function actualizarHUDJugador(jugador, numeroJugador) {
  const prefijo = `j${numeroJugador}`;
  const turboEl  = elementosHUD[`${prefijo}Turbo`];
  const turboContenedor = elementosHUD[`${prefijo}TurboContenedor`];

  if (!turboEl) return;

  // Barra de turbo: ancho proporcional al porcentaje disponible
  turboEl.style.width = `${jugador.turboDisponible}%`;

  // Parpadeo cuando el turbo está casi vacío
  if (jugador.turboDisponible < 20) {
    turboContenedor.classList.add('baja');
  } else {
    turboContenedor.classList.remove('baja');
  }

  // Vidas: apagar íconos de las vidas perdidas
  const vidasEls = elementosHUD[`${prefijo}Vidas`];
  vidasEls.forEach((el, i) => {
    if (i < jugador.vidas) {
      el.classList.remove('perdida');
    } else {
      el.classList.add('perdida');
    }
  });

  // Puntaje formateado con 6 dígitos
  const puntajeEl = elementosHUD[`${prefijo}Puntaje`];
  if (puntajeEl) {
    puntajeEl.textContent = formatearPuntaje(jugador.puntaje);
  }

  // Estado de la habilidad especial
  actualizarIndicadorHabilidad(jugador, prefijo);

  // Indicador de cooldown de salto
  actualizarIndicadorSalto(jugador, prefijo);
}

/**
 * Actualiza el indicador circular de habilidad (listo / cooldown en segundos).
 * @param {Jugador} jugador - Jugador.
 * @param {string} prefijo - 'j1' o 'j2'.
 */
function actualizarIndicadorHabilidad(jugador, prefijo) {
  const estadoEl  = elementosHUD[`${prefijo}HabEstado`];
  const iconoEl   = elementosHUD[`${prefijo}HabIcono`];
  const nombreEl  = elementosHUD[`${prefijo}HabNombre`];
  if (!estadoEl) return;

  // Sincronizar ícono y nombre con la habilidad de la moto
  if (iconoEl && jugador.habilidad) {
    iconoEl.textContent = jugador.habilidad.icono || '⚡';
  }
  if (nombreEl && jugador.habilidad) {
    nombreEl.textContent = jugador.habilidad.nombre || '—';
  }

  if (jugador.cooldownHabilidad <= 0) {
    estadoEl.textContent = 'LISTO';
    estadoEl.className   = 'hud-habilidad-estado listo texto-ui';
  } else {
    const segundosRestantes = Math.ceil(jugador.cooldownHabilidad / 1000);
    estadoEl.textContent = `${segundosRestantes}s`;
    estadoEl.className   = 'hud-habilidad-estado cooldown texto-ui';
  }
}

/**
 * Actualiza el indicador visual del cooldown de salto en el HUD.
 * Muestra el cooldown restante en segundos; si el salto está disponible, brilla.
 * @param {Jugador} jugador - Jugador.
 * @param {string} prefijo - 'j1' o 'j2'.
 */
function actualizarIndicadorSalto(jugador, prefijo) {
  const contenedor = elementosHUD[`${prefijo}SaltoContenedor`];
  if (!contenedor) return; // El elemento no existe en el HTML, ignorar sin error

  const iconoEl  = contenedor.querySelector('.hud-salto-icono');
  const textoEl  = contenedor.querySelector('.hud-salto-estado');

  if (jugador.cooldownSalto > 0) {
    // Salto en cooldown: apagar el ícono y mostrar segundos restantes
    if (iconoEl) iconoEl.style.opacity = '0.3';
    if (textoEl) textoEl.textContent   = `${Math.ceil(jugador.cooldownSalto / 1000)}s`;
    contenedor.classList.add('cooldown');
    contenedor.classList.remove('disponible');
  } else if (jugador.saltosDisponibles > 0) {
    // Salto disponible: brillar con el color del jugador
    if (iconoEl) iconoEl.style.opacity = '1';
    if (textoEl) textoEl.textContent   = jugador.saltosDisponibles === 2 ? '■■' : '□■';
    contenedor.classList.add('disponible');
    contenedor.classList.remove('cooldown');
  } else {
    // Saltando o sin saltos: icono vacío
    if (iconoEl) iconoEl.style.opacity = '0.5';
    if (textoEl) textoEl.textContent   = '□□';
    contenedor.classList.remove('disponible', 'cooldown');
  }
}

/**
 * Actualiza el nivel y temporizador centrales del HUD.
 * @param {Object} estadoJuego - Estado global del juego.
 */
function actualizarCentroHUD(estadoJuego) {
  if (elementosHUD.nivelTexto) {
    const configNivel = obtenerConfigNivel(estadoJuego.nivelActual);
    elementosHUD.nivelTexto.textContent = `NIVEL ${estadoJuego.nivelActual} — ${configNivel.nombre.toUpperCase()}`;
  }

  if (elementosHUD.temporizador) {
    const segundosTranscurridos = Math.floor(estadoJuego.tiempoTranscurrido / 1000);
    elementosHUD.temporizador.textContent = formatearTiempo(segundosTranscurridos);
  }
}

// ============================================================
// EFECTOS VISUALES DEL HUD
// ============================================================

/**
 * Muestra un texto de puntaje flotante en la posición indicada.
 * El texto sube y se desvanece en 1.2 segundos.
 * @param {number} x - Posición X en el canvas.
 * @param {number} y - Posición Y en el canvas.
 * @param {string} texto - Texto a mostrar (ej: "+100").
 * @param {string} color - Color del texto.
 */
function crearPuntajeFlotante(x, y, texto, color) {
  const contenedor = elementosHUD.contenedorFlotantes;
  if (!contenedor) return;

  const el = document.createElement('div');
  el.className     = 'puntaje-flotante';
  el.textContent   = texto;
  el.style.left    = `${x}px`;
  el.style.top     = `${y}px`;
  el.style.color   = color;

  contenedor.appendChild(el);

  // Remover el elemento del DOM al terminar la animación
  el.addEventListener('animationend', () => el.remove());
}

/**
 * Muestra el contador de cuenta regresiva antes de iniciar la partida.
 * Muestra 3, 2, 1 y luego llama al callback para arrancar.
 * @param {number} desde - Número desde el cual contar (ej: 3).
 * @param {Function} alTerminar - Función a llamar cuando llegue a 0.
 */
function mostrarContadorInicio(desde, alTerminar) {
  const overlay = elementosHUD.overlayContador;
  if (!overlay) { alTerminar(); return; }

  overlay.innerHTML = '';
  overlay.style.display = 'flex';

  SoundManager.play('ui_countdown');

  let actual = desde;

  const mostrarNumero = () => {
    overlay.innerHTML = '';

    if (actual <= 0) {
      // Mostrar "¡YA!" brevemente antes de arrancar
      const el = document.createElement('div');
      el.className     = 'numero-cuenta';
      el.style.color   = '#39FF14';
      el.style.textShadow = '0 0 20px #39FF14, 0 0 40px #39FF14';
      el.textContent   = '¡YA!';
      overlay.appendChild(el);

      setTimeout(() => {
        overlay.innerHTML = '';
        overlay.style.display = 'none';
        alTerminar();
      }, 700);
      return;
    }

    const el = document.createElement('div');
    el.className   = 'numero-cuenta';
    el.textContent = actual;
    overlay.appendChild(el);

    actual--;
    setTimeout(mostrarNumero, 1000);
  };

  mostrarNumero();
}

/**
 * Muestra el contador de reanimación (3, 2, 1) para un jugador.
 * @param {number} desde - Número inicial (3).
 * @param {Function} alTerminar - Callback al llegar a 0.
 */
function mostrarContadorReanimacion(desde, alTerminar) {
  // Reutiliza el overlay central pero con texto diferenciado
  mostrarContadorInicio(desde, alTerminar);
}

/**
 * Muestra el overlay de fin de partida con el ganador y las estadísticas.
 * @param {Jugador|null} ganador - Jugador ganador (null si fue empate).
 * @param {Object} estadoJuego - Estado global para obtener estadísticas.
 */
function mostrarFinPartida(ganador, estadoJuego) {
  const overlay = document.getElementById('overlayFinPartida');
  if (!overlay) return;

  const [j1, j2] = estadoJuego.jugadores;

  // Textos del ganador
  document.getElementById('textoGanador').textContent =
    ganador ? '¡VICTORIA!' : 'EMPATE';
  const nombreGanadorEl = document.getElementById('nombreGanador');
  nombreGanadorEl.textContent = ganador ? ganador.nombre : '— —';
  nombreGanadorEl.style.color = ganador ? ganador.color : '#FFD700';

  // Estadísticas de la partida
  document.getElementById('statPuntaje1').textContent = formatearPuntaje(j1.puntaje);
  document.getElementById('statPuntaje2').textContent = formatearPuntaje(j2.puntaje);
  document.getElementById('statNivel').textContent    = estadoJuego.nivelActual;
  document.getElementById('statTiempo').textContent   =
    formatearTiempo(Math.floor(estadoJuego.tiempoTranscurrido / 1000));

  overlay.classList.add('visible');
  if (ganador) {
    SoundManager.play('bgm_stinger_victory');
  }
}

/**
 * Oculta el overlay de fin de partida.
 */
function ocultarFinPartida() {
  const overlay = document.getElementById('overlayFinPartida');
  if (overlay) overlay.classList.remove('visible');
}

/**
 * Muestra u oculta el overlay de pausa.
 * @param {boolean} mostrar - true para mostrar, false para ocultar.
 */
function toggleOverlayPausa(mostrar) {
  const overlay = document.getElementById('overlayPausa');
  if (!overlay) return;
  if (mostrar) {
    overlay.classList.add('visible');
  } else {
    overlay.classList.remove('visible');
  }
}

/**
 * Configura el HUD con los datos de inicio de cada jugador.
 * Se llama al comenzar la partida para que los nombres y colores sean correctos.
 * @param {Array<Jugador>} jugadores - Array con los dos jugadores.
 */
function configurarHUDParaPartida(jugadores) {
  const [j1, j2] = jugadores;

  if (elementosHUD.j1Nombre) {
    elementosHUD.j1Nombre.textContent = j1.nombre.toUpperCase();
    elementosHUD.j1Nombre.style.color = j1.color;
  }
  if (elementosHUD.j2Nombre) {
    elementosHUD.j2Nombre.textContent = j2.nombre.toUpperCase();
    elementosHUD.j2Nombre.style.color = j2.color;
  }

  // Actualizar colores de las vidas
  ['j1', 'j2'].forEach((prefijo, i) => {
    const jugador = i === 0 ? j1 : j2;
    elementosHUD[`${prefijo}Vidas`].forEach(el => {
      if (el) el.style.color = jugador.color;
    });
    const puntajeEl = elementosHUD[`${prefijo}Puntaje`];
    if (puntajeEl) puntajeEl.style.color = jugador.color;
  });
}
