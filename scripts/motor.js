// motor.js — Orquestador principal del juego.
// Controla el ciclo de actualización (update) y dibujado (render).

// ============================================================
// ESTADO CENTRAL DEL JUEGO
// El "cerebro" del juego. Contiene todo lo que necesita saber el motor.
// ============================================================
const estadoJuego = {
  activo:            false,  // true cuando el juego está corriendo
  pausado:           false,  // true cuando está pausado con Escape
  nivelActual:       1,      // Número del nivel en curso (1-7)
  turno:             0,      // Cantidad de ticks transcurridos desde el inicio
  tiempoTranscurrido: 0,     // Ms desde el inicio de la partida
  tiempoUltimoOrbe:  0,      // Ms desde el último orbe spawneado
  tiempoSupervivencia: 0,    // Ms para el bonus de supervivencia
  jugadores:         [],     // Array con los 2 objetos Jugador
  orbes:             [],     // Array con todos los orbes activos en el mapa
  obstaculos:        [],     // Array con todos los obstáculos dinámicos
  portales:          [],     // Array con pares de portales activos
  particulas:        [],     // Array con partículas de explosión en curso
  ganador:           null,   // null | objeto Jugador ganador
  limites:           { ancho: 0, alto: 0 },
  configNivelActual: null,   // Configuración del nivel actual
};

// Referencia al canvas del DOM
let canvasJuego = null;

// Variables del game loop
let ultimoTimestamp = 0;
let idAnimacion     = null;

// Puntaje de bonus por supervivencia (cada 10 segundos)
const MS_BONUS_SUPERVIVENCIA = 10000;
const PUNTOS_SUPERVIVENCIA   = 50;

// ============================================================
// INICIALIZACIÓN
// ============================================================

/**
 * Punto de entrada del juego desde juego.html.
 * Configura el canvas, HUD, eventos y muestra el overlay de inicio.
 */
function inicializarMotor() {
  canvasJuego = document.getElementById('arenaCanvas');

  // Ajustar el canvas al tamaño actual de la ventana
  redimensionarCanvas(canvasJuego, estadoJuego);

  // Inicializar el renderizador con el canvas
  inicializarRender(canvasJuego);

  // Inicializar los elementos del HUD
  inicializarHUD();

  // Escuchar cambios de tamaño de ventana para reescalar el canvas
  window.addEventListener('resize', () => {
    redimensionarCanvas(canvasJuego, estadoJuego);
  });

  // Cargar los perfiles guardados en los selectores de la pantalla de inicio
  cargarPerfilesEnSelectores();
}

/**
 * Carga los perfiles de localStorage en los selectores del overlay de inicio.
 */
function cargarPerfilesEnSelectores() {
  const perfiles    = obtenerPerfiles();
  const select1     = document.getElementById('selectPerfil1');
  const select2     = document.getElementById('selectPerfil2');
  if (!select1 || !select2) return;

  const opcionInvitado = '<option value="">— Jugar como Invitado —</option>';

  [select1, select2].forEach(select => {
    select.innerHTML = opcionInvitado;
    perfiles.forEach(perfil => {
      const option       = document.createElement('option');
      option.value       = perfil.id;
      option.textContent = perfil.nombre;
      option.style.color = perfil.color;
      select.appendChild(option);
    });
  });
}

// ============================================================
// CONFIGURACIÓN Y ARRANQUE DE PARTIDA
// ============================================================

/**
 * Lee la configuración de la pantalla de inicio y arranca la partida.
 * Llamada desde el botón "COMENZAR PARTIDA" del overlay de inicio.
 */
function comenzarJuego() {
  // Leer moto seleccionada para cada jugador
  const motoJ1 = obtenerMotoSeleccionada(1) || 'azul';
  const motoJ2 = obtenerMotoSeleccionada(2) || 'naranja';

  // Leer nivel seleccionado
  const nivelSelEl = document.querySelector('#gridNiveles .opcion-nivel.seleccionado');
  const nivel       = nivelSelEl ? parseInt(nivelSelEl.dataset.nivel) : 1;

  // Leer perfiles vinculados (opcional)
  const idPerfil1 = document.getElementById('selectPerfil1')?.value || null;
  const idPerfil2 = document.getElementById('selectPerfil2')?.value || null;

  // Configurar y lanzar la partida
  configurarPartida(nivel, motoJ1, motoJ2, idPerfil1, idPerfil2);
}

/**
 * Obtiene la moto seleccionada por un jugador en el overlay de inicio.
 * @param {number} numJugador - 1 o 2.
 * @returns {string} Clave de la moto seleccionada ('azul', 'rojo', etc.).
 */
function obtenerMotoSeleccionada(numJugador) {
  const sel = document.querySelector(
    `#gridMotosJ${numJugador} .opcion-moto.seleccionada`
  );
  return sel ? sel.dataset.moto : 'azul';
}

/**
 * Configura toda la partida: crea los jugadores, obstáculos, portales
 * y arranca el game loop.
 * @param {number} nivel - Número del nivel seleccionado (1-7).
 * @param {string} motoJ1 - Tipo de moto del jugador 1.
 * @param {string} motoJ2 - Tipo de moto del jugador 2.
 * @param {string|null} idPerfil1 - ID del perfil del jugador 1 (opcional).
 * @param {string|null} idPerfil2 - ID del perfil del jugador 2 (opcional).
 */
function configurarPartida(nivel, motoJ1, motoJ2, idPerfil1, idPerfil2) {
  const configNivel = obtenerConfigNivel(nivel);

  // Guardar estado global del nivel
  estadoJuego.nivelActual        = nivel;
  estadoJuego.configNivelActual  = configNivel;
  estadoJuego.turno              = 0;
  estadoJuego.tiempoTranscurrido = 0;
  estadoJuego.tiempoUltimoOrbe   = 0;
  estadoJuego.tiempoSupervivencia = 0;
  estadoJuego.orbes              = [];
  estadoJuego.particulas         = [];
  estadoJuego.ganador            = null;

  // Posiciones de spawn simétricas (un tercio y dos tercios del ancho)
  const cx = estadoJuego.limites.ancho;
  const cy = estadoJuego.limites.alto;

  // Crear los dos jugadores
  const velocidadBase = configNivel.velocidadBase;
  const perfiles = obtenerPerfiles();

  estadoJuego.jugadores = [
    crearJugadorConPerfil(1, motoJ1, idPerfil1, perfiles,
      { x: Math.floor(cx * 0.25), y: Math.floor(cy / 2) },
      { dx: 1, dy: 0 }, velocidadBase),
    crearJugadorConPerfil(2, motoJ2, idPerfil2, perfiles,
      { x: Math.floor(cx * 0.75), y: Math.floor(cy / 2) },
      { dx: -1, dy: 0 }, velocidadBase),
  ];

  // Generar obstáculos del nivel
  estadoJuego.obstaculos = generarObstaculos(
    configNivel,
    estadoJuego.limites,
    estadoJuego.jugadores
  );

  // Generar portales si el nivel los requiere
  estadoJuego.portales = configNivel.portalActivo
    ? generarPortales(estadoJuego.limites, estadoJuego.jugadores)
    : [];

  // Configurar el HUD con los datos de los jugadores
  configurarHUDParaPartida(estadoJuego.jugadores);

  // Inicializar el sistema de audio (requiere gesto del usuario)
  inicializarAudio();
  if (sistemaAudio) sistemaAudio.iniciarMusicaAmbiente();

  // Registrar los controles táctiles para móvil
  inicializarControlesTactiles(estadoJuego.jugadores);

  // Registrar listeners de teclado
  inicializarEventos();

  // Ocultar el overlay de inicio
  const overlayInicio = document.getElementById('overlayInicio');
  if (overlayInicio) overlayInicio.style.display = 'none';

  // Inicializar eventos de los overlays de pausa y fin de partida
  configurarBotonesOverlay();

  // Añadir listeners a los selectores de moto
  configurarSelectoresMoto();

  // Mostrar la cuenta regresiva y arrancar el juego al terminar
  mostrarContadorInicio(3, () => {
    estadoJuego.activo = true;
    ultimoTimestamp    = 0;
    idAnimacion        = requestAnimationFrame(bucleJuego);
  });
}

/**
 * Crea un jugador con su perfil vinculado (si existe) o como invitado.
 * @returns {Jugador} Instancia del jugador configurada.
 */
function crearJugadorConPerfil(id, tipoMoto, idPerfil, perfiles, posicion, direccion, velocidadBase) {
  const configMoto = CONFIGURACION_MOTOS[tipoMoto] || CONFIGURACION_MOTOS.celeste;
  const perfil     = perfiles.find(p => p.id === idPerfil);

  const jugador = new Jugador({
    id,
    nombre:           perfil ? perfil.nombre : configMoto.nombre,
    tipoMoto,
    posicion,
    direccionInicial: direccion,
    teclas:           TECLAS_JUGADOR[id],
  });

  jugador.reiniciarParaNuevaPartida(velocidadBase);
  jugador.idPerfil = idPerfil || null;

  return jugador;
}

/**
 * Genera un par de portales en posiciones opuestas del mapa.
 * @param {{ancho:number,alto:number}} limites - Dimensiones del arena.
 * @param {Array<Jugador>} jugadores - Jugadores (para evitar spawn encima).
 * @returns {Array} Array con un par de portales.
 */
function generarPortales(limites, jugadores) {
  return [{
    posicionA:   { x: Math.floor(limites.ancho * 0.15), y: Math.floor(limites.alto * 0.5) },
    posicionB:   { x: Math.floor(limites.ancho * 0.85), y: Math.floor(limites.alto * 0.5) },
    cooldown:    0,
    activaciones: {},
  }];
}

// ============================================================
// GAME LOOP PRINCIPAL — El corazón del juego
// ============================================================

/**
 * Bucle principal del juego sincronizado con requestAnimationFrame.
 * Calcula el delta entre frames y llama a actualizar() y renderizar().
 * @param {number} timestamp - Timestamp del frame en ms.
 */
function bucleJuego(timestamp) {
  if (!estadoJuego.activo) return;

  // Calcular tiempo transcurrido desde el último frame (delta)
  if (ultimoTimestamp === 0) ultimoTimestamp = timestamp;
  const deltaMs   = Math.min(timestamp - ultimoTimestamp, 50); // Cap a 50ms para evitar saltos
  ultimoTimestamp = timestamp;

  if (!estadoJuego.pausado) {
    // Secuencia lineal de 12 pasos de actualización
    actualizar(deltaMs);
  }

  // Renderizar siempre (incluso pausado, para mostrar el overlay)
  renderizar(estadoJuego, deltaMs);
  actualizarHUD(estadoJuego);

  // Programar el siguiente frame
  idAnimacion = requestAnimationFrame(bucleJuego);
}

// ============================================================
// ACTUALIZACIÓN — 12 pasos del tick de juego
// ============================================================

/**
 * Ejecuta todos los pasos de lógica del juego en un tick.
 * Esta secuencia lineal es la "receta" de lo que pasa en cada frame.
 * @param {number} deltaMs - Tiempo transcurrido desde el último frame en ms.
 */
function actualizar(deltaMs) {
  // 1. Leer teclas y aplicar cambios de dirección
  procesarEntradas(
    estadoJuego.jugadores,
    estadoJuego.jugadores[1], // enemigo del j1
    estadoJuego.jugadores[0]  // enemigo del j2
  );

  // 2. Mover cada moto según su velocidad
  moverTodosLosJugadores();

  // 3. Extender las estelas con la nueva posición
  agregarSegmentosDeEstela();

  // 4. Recortar estelas si exceden la longitud máxima
  recortarEstelasSiExcedenLongitud();

  // 5. Mover los obstáculos dinámicos
  actualizarObstaculos(estadoJuego.obstaculos);

  // 6. Detectar todas las colisiones
  verificarTodasLasColisiones(estadoJuego);

  // 7. Ver si alguna moto tocó un orbe
  verificarRecoleccionDeOrbes(estadoJuego);

  // 8. Gestionar activaciones de portales
  if (estadoJuego.portales.length > 0) {
    verificarPortales(estadoJuego, deltaMs);
  }

  // 9. Reducir cooldowns, efectos y temporizadores de cada jugador
  actualizarCooldownsYTemporizadores(deltaMs);

  // 10. Actualizar temporizadores de los orbes activos
  actualizarOrbes(estadoJuego.orbes, deltaMs);

  // 11. Aparece un nuevo orbe si pasó suficiente tiempo
  spawnearOrbeSiCorresponde(deltaMs);

  // 12. Acumular tiempo y dar bonus de supervivencia
  acumularTiempoYBonus(deltaMs);
}

// ============================================================
// PASOS DE ACTUALIZACIÓN (Funciones de cada paso)
// ============================================================

/**
 * Paso 2: Mueve todas las motos activas un tick.
 */
function moverTodosLosJugadores() {
  estadoJuego.jugadores.forEach(jugador => {
    if (!jugador.eliminado && !jugador.enReanimacion) {
      jugador.moverUnTick();
    }
  });
}

/**
 * Paso 3: Añade la posición actual al inicio de la estela de cada jugador.
 */
function agregarSegmentosDeEstela() {
  estadoJuego.jugadores.forEach(jugador => {
    if (!jugador.eliminado && !jugador.enReanimacion) {
      jugador.agregarSegmentoEstela();
    }
  });
}

/**
 * Paso 4: Recorta las estelas que superan la longitud máxima.
 * En el nivel 7 (regenerativo), no se recortan.
 */
function recortarEstelasSiExcedenLongitud() {
  const esRegenerativa = estadoJuego.configNivelActual?.estelaRegenerativa || false;
  estadoJuego.jugadores.forEach(jugador => {
    jugador.recortarEstelaExcedente(esRegenerativa);
  });
}

/**
 * Paso 9: Actualiza cooldowns y efectos activos de todos los jugadores.
 * @param {number} deltaMs - Tiempo transcurrido en ms.
 */
function actualizarCooldownsYTemporizadores(deltaMs) {
  estadoJuego.jugadores.forEach(jugador => {
    jugador.actualizarEfectos(deltaMs);
  });
}

/**
 * Paso 11: Hace aparecer un nuevo orbe si transcurrió el tiempo de spawn.
 * @param {number} deltaMs - Tiempo transcurrido en ms.
 */
function spawnearOrbeSiCorresponde(deltaMs) {
  estadoJuego.tiempoUltimoOrbe += deltaMs;
  const intervaloSpawn = estadoJuego.configNivelActual?.tiempoSpawnOrbeMs || 5000;
  const maxOrbes       = estadoJuego.configNivelActual?.maxOrbes || 3;

  // Contar solo los orbes activos
  const orbesActivos = estadoJuego.orbes.filter(o => o.activo).length;

  if (estadoJuego.tiempoUltimoOrbe >= intervaloSpawn && orbesActivos < maxOrbes) {
    const nuevoOrbe = crearOrbeAleatorio(
      estadoJuego.limites,
      estadoJuego.jugadores,
      estadoJuego.orbes.filter(o => o.activo)
    );
    estadoJuego.orbes.push(nuevoOrbe);

    // Limpiar orbes inactivos (para no acumular memoria)
    if (estadoJuego.orbes.length > 50) {
      estadoJuego.orbes = estadoJuego.orbes.filter(o => o.activo);
    }

    estadoJuego.tiempoUltimoOrbe = 0;
  }
}

/**
 * Paso 12: Acumula el tiempo de la partida y da bonus de supervivencia.
 * @param {number} deltaMs - Tiempo transcurrido en ms.
 */
function acumularTiempoYBonus(deltaMs) {
  estadoJuego.tiempoTranscurrido  += deltaMs;
  estadoJuego.tiempoSupervivencia += deltaMs;
  estadoJuego.turno               += 1;

  // Bonus de supervivencia: +50 puntos cada 10 segundos (ambos jugadores)
  if (estadoJuego.tiempoSupervivencia >= MS_BONUS_SUPERVIVENCIA) {
    estadoJuego.jugadores.forEach(j => {
      if (!j.eliminado) {
        j.sumarPuntaje(PUNTOS_SUPERVIVENCIA, estadoJuego.nivelActual);
      }
    });
    estadoJuego.tiempoSupervivencia = 0;
  }
}

// ============================================================
// FIN DE PARTIDA, PAUSA Y NAVEGACIÓN
// ============================================================

/**
 * Termina la partida, muestra el overlay de victoria y guarda los récords.
 * @param {Jugador|null} ganador - El jugador ganador, o null si fue empate.
 */
function terminarJuego(ganador) {
  estadoJuego.activo  = false;
  estadoJuego.ganador = ganador;

  // Cancelar el loop si aún está corriendo
  if (idAnimacion) {
    cancelAnimationFrame(idAnimacion);
    idAnimacion = null;
  }

  // Detener música
  if (sistemaAudio) sistemaAudio.detenerMusicaAmbiente();
  eliminarEventos();

  // Mostrar overlay de fin de partida
  mostrarFinPartida(ganador, estadoJuego);

  // Guardar los récords de la partida
  estadoJuego.jugadores.forEach(jugador => {
    // Guardar en el marcador global
    guardarRecord({
      nombre:  jugador.nombre,
      puntaje: jugador.puntaje,
      nivel:   estadoJuego.nivelActual,
      color:   jugador.color,
    });

    // Actualizar estadísticas del perfil si tiene uno vinculado
    if (jugador.idPerfil) {
      actualizarEstadisticas(jugador.idPerfil, {
        victoria: ganador && ganador.id === jugador.id,
        puntaje:  jugador.puntaje,
        nivel:    estadoJuego.nivelActual,
      });
    }
  });
}

/**
 * Alterna entre pausado y activo.
 * Llamada desde la tecla Escape y el botón del overlay.
 */
function togglePausa() {
  if (!estadoJuego.activo && !estadoJuego.pausado) return;
  estadoJuego.pausado = !estadoJuego.pausado;
  toggleOverlayPausa(estadoJuego.pausado);
}

/**
 * Reanuda el juego desde el overlay de pausa.
 * Llamada desde el botón "Continuar" del overlay.
 */
function continuarJuego() {
  if (!estadoJuego.pausado) return;
  estadoJuego.pausado = false;
  toggleOverlayPausa(false);
}

/**
 * Abandona la partida y regresa al menú principal.
 * Llamada desde el botón "Abandonar" del overlay de pausa.
 */
function abandonarPartida() {
  estadoJuego.activo  = false;
  estadoJuego.pausado = false;
  if (idAnimacion) {
    cancelAnimationFrame(idAnimacion);
    idAnimacion = null;
  }
  if (sistemaAudio) sistemaAudio.detenerMusicaAmbiente();
  eliminarEventos();
  window.location.href = '/';
}

/**
 * Reinicia el juego con la misma configuración.
 * Llamada desde el botón "Jugar de Nuevo" del overlay de fin.
 */
function reiniciarJuego() {
  ocultarFinPartida();
  // Volver al overlay de inicio
  const overlayInicio = document.getElementById('overlayInicio');
  if (overlayInicio) overlayInicio.style.display = 'flex';
}

// ============================================================
// CONFIGURACIÓN DE LA INTERFAZ
// ============================================================

/**
 * Configura los selectores de moto en el overlay de inicio.
 * Al hacer click en una moto, la marca como seleccionada.
 */
function configurarSelectoresMoto() {
  [1, 2].forEach(numJugador => {
    const grid = document.getElementById(`gridMotosJ${numJugador}`);
    if (!grid) return;

    grid.querySelectorAll('.opcion-moto').forEach(btn => {
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.opcion-moto').forEach(b => {
          b.classList.remove('seleccionada');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('seleccionada');
        btn.setAttribute('aria-pressed', 'true');
      });

      // Soporte para teclado (Enter/Space activan el botón)
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
    });
  });

  // Selectores de nivel
  const gridNiveles = document.getElementById('gridNiveles');
  if (gridNiveles) {
    gridNiveles.querySelectorAll('.opcion-nivel').forEach(btn => {
      btn.addEventListener('click', () => {
        gridNiveles.querySelectorAll('.opcion-nivel').forEach(b => {
          b.classList.remove('seleccionado');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('seleccionado');
        btn.setAttribute('aria-pressed', 'true');
      });
    });
  }
}

/**
 * Configura los botones de los overlays (pausa y fin de partida).
 * Conecta los IDs de los botones a las funciones del motor.
 */
function configurarBotonesOverlay() {
  // Los botones del overlay de pausa ya tienen onclick="" en el HTML
  // Solo necesitamos confirmar que las funciones son globales (lo son, están en este archivo)
}

// ============================================================
// AUTO-INICIO AL CARGAR LA PÁGINA
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  inicializarMotor();
  configurarSelectoresMoto();
});
