// jugador.js — Clase Jugador con todas las propiedades y mecánicas de cada moto.

// Constantes del sistema de jugadores
const CONSTANTES_JUGADOR = {
  MULTIPLICADOR_TURBO:     1.6,   // El turbo aumenta la velocidad un 60%
  CONSUMO_TURBO_POR_TICK:  2,     // % de turbo que se gasta por frame activo
  RECARGA_TURBO_POR_TICK:  0.5,   // % de turbo que se recarga por frame inactivo
  DURACION_SALTO_MS:       400,   // Milisegundos que dura un salto
  SALTOS_MAXIMOS:          2,     // Cantidad de saltos antes de tocar el suelo
  SEGMENTOS_GRACIA:     8,    // Segmentos nuevos que no causan colisión propia
                               // Con velocidad=2: distancia=16px >> tolerancia=5px
  DURACION_INVULNERABLE_MS: 3000, // Ms de invulnerabilidad tras reanimación
  DURACION_DESTELLO_MS:    500,   // Ms de parpadeo al recibir daño
  LONGITUD_INICIAL:        5,     // Segmentos iniciales de estela
  RADIO_MOTO:              8,     // Radio de colisión de la moto en píxeles
};

// Configuración de las 4 motos disponibles
const CONFIGURACION_MOTOS = {
  azul: {
    nombre:     'Ciclo Azul',
    color:      '#00D4FF',
    colorSecundario: '#0088AA',
    tipoEstela: 'solida',
    habilidad:  'pulsoEMP',
  },
  rojo: {
    nombre:     'Ciclo Rojo',
    color:      '#FF2D78',
    colorSecundario: '#AA1050',
    tipoEstela: 'punteada',
    habilidad:  'cortadorLaser',
  },
  naranja: {
    nombre:     'Ciclo Naranja',
    color:      '#FF8C00',
    colorSecundario: '#AA5A00',
    tipoEstela: 'plasma',
    habilidad:  'senualelo',
  },
  verde: {
    nombre:     'Ciclo Verde',
    color:      '#39FF14',
    colorSecundario: '#1FAA00',
    tipoEstela: 'electrica',
    habilidad:  'escudoEnergetico',
  },
};

// Definición de habilidades únicas por moto
const HABILIDADES = {
  pulsoEMP: {
    nombre:   'Pulso EMP',
    icono:    '⚡',
    cooldown: 15000,
    /**
     * Desactiva el turbo enemigo y drena su energía.
     * @param {Jugador} propio - Jugador que activa la habilidad.
     * @param {Jugador} enemigo - Jugador afectado.
     */
    accion(propio, enemigo) {
      if (!enemigo || enemigo.eliminado) return;
      enemigo.turboActivo     = false;
      enemigo.turboDisponible = Math.max(0, enemigo.turboDisponible - 50);
      enemigo.empActivo       = true;
      enemigo.tiempoEMP       = 3000; // 3 segundos de turbo desactivado
    },
  },
  cortadorLaser: {
    nombre:   'Cortador Láser',
    icono:    '✂',
    cooldown: 12000,
    /**
     * Elimina los últimos 20 segmentos de la estela enemiga.
     * @param {Jugador} propio - Jugador que activa la habilidad.
     * @param {Jugador} enemigo - Jugador afectado.
     */
    accion(propio, enemigo) {
      if (!enemigo || enemigo.eliminado) return;
      const cantidad = Math.min(20, enemigo.estelaSegmentos.length);
      enemigo.estelaSegmentos.splice(-cantidad);
      propio.puntaje += 250; // Bonus por uso de habilidad
    },
  },
  senualelo: {
    nombre:   'Señuelo',
    icono:    '👁',
    cooldown: 20000,
    /**
     * Crea una estela fantasma falsa durante 4 segundos.
     * @param {Jugador} propio - Jugador que activa la habilidad.
     */
    accion(propio) {
      propio.senueloActivo    = true;
      propio.tiempoSenuelo    = 4000;
      // La estela fantasma se renderiza en render.js con opacidad reducida
      propio.estelaFantasma   = [...propio.estelaSegmentos];
    },
  },
  escudoEnergetico: {
    nombre:   'Escudo Energético',
    icono:    '🛡',
    cooldown: 18000,
    /**
     * Activa un escudo que absorbe la siguiente colisión fatal.
     * @param {Jugador} propio - Jugador que activa la habilidad.
     */
    accion(propio) {
      propio.escudoActivo  = true;
      propio.tiempoEscudo  = 5000; // El escudo dura 5 segundos
    },
  },
};

// ============================================================
// CLASE JUGADOR
// ============================================================

class Jugador {
  /**
   * Crea una instancia de jugador con todas sus propiedades iniciales.
   * @param {{id:number, nombre:string, tipoMoto:string, posicion:{x:number,y:number}, direccionInicial:{dx:number,dy:number}, teclas:Object}} config
   */
  constructor({ id, nombre, tipoMoto, posicion, direccionInicial, teclas }) {
    const configMoto = CONFIGURACION_MOTOS[tipoMoto] || CONFIGURACION_MOTOS.azul;

    // Identidad
    this.id              = id;
    this.nombre          = nombre || configMoto.nombre;
    this.tipoMoto        = tipoMoto;
    this.color           = configMoto.color;
    this.colorSecundario = configMoto.colorSecundario;
    this.tipoEstela      = configMoto.tipoEstela;
    this.teclas          = teclas;

    // Posición y movimiento
    this.posicion         = { ...posicion };
    this.posicionAnterior = { ...posicion };
    this.direccion        = { ...direccionInicial };
    this.velocidad        = 2;
    this.velocidadBase    = 2;
    this.anguloRotacion   = calcularAnguloDireccion(direccionInicial);

    // Turbo
    this.turboDisponible = 100;
    this.turboActivo     = false;
    this.empActivo       = false;
    this.tiempoEMP       = 0;

    // Estela
    this.estelaSegmentos = [];
    this.longitud        = CONSTANTES_JUGADOR.LONGITUD_INICIAL;
    this.estelaFantasma  = [];
    this.senueloActivo   = false;
    this.tiempoSenuelo   = 0;

    // Salto
    this.saltosDisponibles = CONSTANTES_JUGADOR.SALTOS_MAXIMOS;
    this.enSalto           = false;
    this.tiempoSaltoMs     = 0;

    // Escudo y habilidad
    this.escudoActivo      = false;
    this.tiempoEscudo      = 0;
    this.puedeCortar       = false;
    this.tiempoCortador    = 0;

    // Habilidad especial
    const configHab        = HABILIDADES[configMoto.habilidad];
    this.habilidad         = { ...configHab, tipoKey: configMoto.habilidad };
    this.cooldownHabilidad = 0;   // 0 = disponible, >0 = en recarga (ms restantes)

    // Estado de vida
    this.vidas         = 3;
    this.puntaje       = 0;
    this.eliminado     = false;
    this.invulnerable  = false;
    this.tiempoInvulnerable = 0;
    this.enReanimacion = false;
    this.tiempoReanimacion = 0;

    // Visual
    this.destellando      = false;
    this.contadorDestello = 0;
    this.escalaSalto      = 1;   // 1 = normal, <1 = saltando
    this.factorTurboVis   = 0;   // 0 = sin turbo visual, 1 = turbo completo

    // Posición de spawn guardada para reanimación
    this.posicionSpawn    = { ...posicion };
    this.direccionSpawn   = { ...direccionInicial };

    // ID de perfil vinculado (opcional)
    this.idPerfil = null;
  }

  // ============================================================
  // MOVIMIENTO
  // ============================================================

  /**
   * Mueve la moto un tick según su dirección y velocidad actual.
   * Guarda la posición anterior para detección de colisiones.
   */
  moverUnTick() {
    this.posicionAnterior = { ...this.posicion };
    this.posicion.x += this.direccion.dx * this.velocidad;
    this.posicion.y += this.direccion.dy * this.velocidad;
  }

  /**
   * Cambia la dirección de la moto, evitando girar en 180° (dirección opuesta).
   * @param {{dx:number,dy:number}} nuevaDireccion - Nueva dirección a aplicar.
   */
  cambiarDireccion(nuevaDireccion) {
    const esOpuesta = sonDireccionesOpuestas(this.direccion, nuevaDireccion);
    if (!esOpuesta) {
      this.direccion     = nuevaDireccion;
      this.anguloRotacion = calcularAnguloDireccion(nuevaDireccion);
    }
  }

  // ============================================================
  // TURBO
  // ============================================================

  /**
   * Activa el turbo si hay energía disponible y el EMP no está activo.
   * El turbo aumenta la velocidad un 60% mientras consume energía.
   */
  activarTurbo() {
    if (this.turboDisponible <= 0 || this.empActivo) return;
    this.turboActivo = true;
    this.velocidad   = this.velocidadBase * CONSTANTES_JUGADOR.MULTIPLICADOR_TURBO;
    this.turboDisponible = Math.max(0, this.turboDisponible - CONSTANTES_JUGADOR.CONSUMO_TURBO_POR_TICK);

    // Desactivar si se agota el turbo
    if (this.turboDisponible === 0) {
      this.desactivarTurbo();
    }
  }

  /**
   * Desactiva el turbo y restaura la velocidad base.
   */
  desactivarTurbo() {
    this.turboActivo = false;
    this.velocidad   = this.velocidadBase;
  }

  /**
   * Recarga el turbo cuando no está activo.
   */
  recargarTurbo() {
    if (!this.turboActivo) {
      this.turboDisponible = Math.min(100, this.turboDisponible + CONSTANTES_JUGADOR.RECARGA_TURBO_POR_TICK);
    }
  }

  // ============================================================
  // SALTO
  // ============================================================

  /**
   * Inicia un salto corto si el jugador tiene saltos disponibles.
   * Durante el salto no colisiona con estelas.
   */
  iniciarSalto() {
    if (!this.puedeRealizarSalto()) return;
    this.enSalto           = true;
    this.tiempoSaltoMs     = CONSTANTES_JUGADOR.DURACION_SALTO_MS;
    this.saltosDisponibles -= 1;
    this.escalaSalto        = 0.65; // Visual: moto más pequeña
  }

  /**
   * Verifica si el jugador puede realizar un salto.
   * Requiere saltos disponibles, no estar ya saltando, y no estar invulnerable.
   * @returns {boolean} true si puede saltar.
   */
  puedeRealizarSalto() {
    return this.saltosDisponibles > 0
        && !this.enSalto
        && !this.eliminado;
  }

  /**
   * Actualiza el temporizador del salto y termina el salto cuando expira.
   * @param {number} deltaMs - Tiempo transcurrido en ms.
   */
  actualizarSalto(deltaMs) {
    if (!this.enSalto) return;
    this.tiempoSaltoMs -= deltaMs;
    if (this.tiempoSaltoMs <= 0) {
      this.enSalto          = false;
      this.tiempoSaltoMs    = 0;
      this.saltosDisponibles = CONSTANTES_JUGADOR.SALTOS_MAXIMOS; // Recargar al aterrizar
      this.escalaSalto       = 1;
    }
  }

  // ============================================================
  // HABILIDAD ESPECIAL
  // ============================================================

  /**
   * Activa la habilidad especial si el cooldown ha expirado.
   * @param {Jugador} jugadorEnemigo - El otro jugador (necesario para algunas habilidades).
   */
  activarHabilidad(jugadorEnemigo) {
    if (this.cooldownHabilidad > 0 || this.eliminado) return;
    this.habilidad.accion(this, jugadorEnemigo);
    this.cooldownHabilidad = this.habilidad.cooldown;
  }

  /**
   * Reduce el cooldown de la habilidad por el tiempo transcurrido.
   * @param {number} deltaMs - Tiempo transcurrido en ms.
   */
  reducirCooldownHabilidad(deltaMs) {
    if (this.cooldownHabilidad > 0) {
      this.cooldownHabilidad = Math.max(0, this.cooldownHabilidad - deltaMs);
    }
  }

  // ============================================================
  // ESTELA
  // ============================================================

  /**
   * Añade la posición actual al inicio del array de segmentos de estela.
   * Los segmentos más recientes están al principio del array.
   */
  agregarSegmentoEstela() {
    this.estelaSegmentos.unshift({ x: this.posicion.x, y: this.posicion.y });
  }

  /**
   * Recorta la estela si supera la longitud máxima permitida.
   * En el nivel 7 (estelaRegenerativa) no se recorta nunca.
   * @param {boolean} esRegenerativa - Si true, la estela nunca se recorta.
   */
  recortarEstelaExcedente(esRegenerativa) {
    if (!esRegenerativa && this.estelaSegmentos.length > this.longitud) {
      this.estelaSegmentos = this.estelaSegmentos.slice(0, this.longitud);
    }
  }

  // ============================================================
  // TEMPORALIZADORES DE EFECTOS
  // ============================================================

  /**
   * Actualiza todos los temporizadores de efectos activos.
   * @param {number} deltaMs - Tiempo transcurrido en ms.
   */
  actualizarEfectos(deltaMs) {
    // Temporizador de invulnerabilidad post-reanimación
    if (this.invulnerable && this.tiempoInvulnerable > 0) {
      this.tiempoInvulnerable -= deltaMs;
      if (this.tiempoInvulnerable <= 0) {
        this.invulnerable       = false;
        this.tiempoInvulnerable = 0;
        this.destellando        = false;
      }
    }

    // Temporizador del EMP (turbo bloqueado)
    if (this.empActivo && this.tiempoEMP > 0) {
      this.tiempoEMP -= deltaMs;
      if (this.tiempoEMP <= 0) {
        this.empActivo = false;
        this.tiempoEMP = 0;
      }
    }

    // Temporizador del escudo por habilidad o por orbe
    if (this.escudoActivo && this.tiempoEscudo > 0) {
      this.tiempoEscudo -= deltaMs;
      if (this.tiempoEscudo <= 0) {
        this.escudoActivo = false;
        this.tiempoEscudo = 0;
      }
    }

    // Temporizador del señuelo
    if (this.senueloActivo && this.tiempoSenuelo > 0) {
      this.tiempoSenuelo -= deltaMs;
      if (this.tiempoSenuelo <= 0) {
        this.senueloActivo  = false;
        this.tiempoSenuelo  = 0;
        this.estelaFantasma = [];
      }
    }

    // Temporizador del orbe cortador
    if (this.puedeCortar && this.tiempoCortador > 0) {
      this.tiempoCortador -= deltaMs;
      if (this.tiempoCortador <= 0) {
        this.puedeCortar    = false;
        this.tiempoCortador = 0;
      }
    }

    // Actualizar el salto
    this.actualizarSalto(deltaMs);

    // Reducir cooldown de habilidad
    this.reducirCooldownHabilidad(deltaMs);

    // Recargar turbo si no está activo
    this.recargarTurbo();
  }

  // ============================================================
  // ELIMINACIÓN Y REANIMACIÓN
  // ============================================================

  /**
   * Inicia el proceso de eliminación del jugador.
   * Si tiene vidas, inicia la reanimación. Si no, es eliminado definitivamente.
   * @returns {boolean} true si queda por reanimar, false si fue eliminado definitivamente.
   */
  recibirDano() {
    if (this.invulnerable || this.escudoActivo) {
      // El escudo absorbe el golpe
      if (this.escudoActivo) {
        this.escudoActivo = false;
        this.tiempoEscudo = 0;
      }
      return false; // No pierde vida
    }

    this.vidas -= 1;
    this.estelaSegmentos = []; // Limpiar la estela al morir

    if (this.vidas > 0) {
      this.enReanimacion    = true;
      this.tiempoReanimacion = 3000; // 3 segundos de countdown
      return true; // Puede reanimar
    } else {
      this.eliminado = true;
      return false; // Eliminado definitivamente
    }
  }

  /**
   * Reanima al jugador en su posición de spawn con invulnerabilidad.
   */
  reanimar() {
    this.posicion      = { ...this.posicionSpawn };
    this.direccion     = { ...this.direccionSpawn };
    this.anguloRotacion = calcularAnguloDireccion(this.direccionSpawn);
    this.estelaSegmentos = [];
    this.saltosDisponibles = CONSTANTES_JUGADOR.SALTOS_MAXIMOS;
    this.enSalto           = false;
    this.turboActivo       = false;
    this.velocidad         = this.velocidadBase;
    this.enReanimacion     = false;
    this.tiempoReanimacion = 0;
    this.invulnerable      = true;
    this.tiempoInvulnerable = CONSTANTES_JUGADOR.DURACION_INVULNERABLE_MS;
    this.destellando       = true;
  }

  /**
   * Añade puntos al puntaje del jugador, aplicando el multiplicador de nivel.
   * @param {number} puntos - Puntos a añadir (antes del multiplicador).
   * @param {number} nivel - Nivel actual para calcular el multiplicador.
   */
  sumarPuntaje(puntos, nivel) {
    const multiplicador = calcularMultiplicadorPuntaje(nivel);
    this.puntaje += Math.floor(puntos * multiplicador);
  }

  /**
   * Reinicia el jugador completamente para una nueva partida.
   * @param {number} velocidadBase - Velocidad base del nivel seleccionado.
   */
  reiniciarParaNuevaPartida(velocidadBase) {
    this.posicion         = { ...this.posicionSpawn };
    this.direccion        = { ...this.direccionSpawn };
    this.anguloRotacion   = calcularAnguloDireccion(this.direccionSpawn);
    this.velocidad        = velocidadBase;
    this.velocidadBase    = velocidadBase;
    this.turboDisponible  = 100;
    this.turboActivo      = false;
    this.vidas            = 3;
    this.puntaje          = 0;
    this.estelaSegmentos  = [];
    this.estelaFantasma   = [];
    this.longitud         = CONSTANTES_JUGADOR.LONGITUD_INICIAL;
    this.saltosDisponibles = CONSTANTES_JUGADOR.SALTOS_MAXIMOS;
    this.enSalto          = false;
    this.tiempoSaltoMs    = 0;
    this.escudoActivo     = false;
    this.tiempoEscudo     = 0;
    this.puedeCortar      = false;
    this.tiempoCortador   = 0;
    this.senueloActivo    = false;
    this.tiempoSenuelo    = 0;
    this.empActivo        = false;
    this.tiempoEMP        = 0;
    this.cooldownHabilidad = 0;
    this.eliminado        = false;
    this.invulnerable     = false;
    this.tiempoInvulnerable = 0;
    this.enReanimacion    = false;
    this.destellando      = false;
    this.escalaSalto      = 1;
  }
}
