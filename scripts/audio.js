// audio.js — Sistema de audio procedural con Web Audio API.
// Todos los sonidos se generan en tiempo real, sin archivos externos.

// Variable global para el sistema de audio (se inicializa al primer input del usuario)
let sistemaAudio = null;

// ============================================================
// CLASE SISTEMA DE AUDIO
// ============================================================

class SistemaAudio {
  constructor() {
    // El AudioContext requiere un gesto del usuario para iniciarse en navegadores modernos
    this.contexto        = new (window.AudioContext || window.webkitAudioContext)();
    this.volumenMaestro  = this.contexto.createGain();
    this.volumenMaestro.connect(this.contexto.destination);
    this.volumenMaestro.gain.value = 0.5;

    // Nodo de efectos: compresor para evitar picos de volumen
    this.compresor = this.contexto.createDynamicsCompressor();
    this.compresor.connect(this.volumenMaestro);

    // Nodo para la música ambiente (loop electrónico)
    this.nodoMusicaAmbiente = null;
    this.musicaActiva       = false;
  }

  /**
   * Crea y devuelve un oscilador básico conectado al compresor.
   * Función base reutilizada por todos los sonidos.
   * @param {string} tipo - Tipo de onda: 'sine' | 'square' | 'sawtooth' | 'triangle'.
   * @param {number} frecuencia - Frecuencia en Hz.
   * @returns {{oscilador:OscillatorNode, ganancia:GainNode}} Nodos creados.
   */
  crearOscilador(tipo, frecuencia) {
    const oscilador = this.contexto.createOscillator();
    const ganancia  = this.contexto.createGain();
    oscilador.type      = tipo;
    oscilador.frequency.value = frecuencia;
    oscilador.connect(ganancia);
    ganancia.connect(this.compresor);
    return { oscilador, ganancia };
  }

  /**
   * Reproduce el sonido del turbo: tono ascendente sawtooth de 200→800Hz en 0.3s.
   */
  reproducirTurbo() {
    const { oscilador, ganancia } = this.crearOscilador('sawtooth', 200);
    const ahora = this.contexto.currentTime;

    oscilador.frequency.setValueAtTime(200, ahora);
    oscilador.frequency.exponentialRampToValueAtTime(800, ahora + 0.25);

    ganancia.gain.setValueAtTime(0.08, ahora);
    ganancia.gain.exponentialRampToValueAtTime(0.001, ahora + 0.35);

    oscilador.start(ahora);
    oscilador.stop(ahora + 0.35);
  }

  /**
   * Reproduce el sonido de colisión: ruido filtrado con decay rápido.
   */
  reproducirColision() {
    const bufferSize = this.contexto.sampleRate * 0.15;
    const buffer     = this.contexto.createBuffer(1, bufferSize, this.contexto.sampleRate);
    const datos      = buffer.getChannelData(0);

    // Llenar buffer con ruido blanco
    for (let i = 0; i < bufferSize; i++) {
      datos[i] = (Math.random() * 2 - 1);
    }

    const fuente  = this.contexto.createBufferSource();
    const filtro  = this.contexto.createBiquadFilter();
    const ganancia = this.contexto.createGain();

    fuente.buffer = buffer;
    filtro.type   = 'lowpass';
    filtro.frequency.value = 600;

    const ahora = this.contexto.currentTime;
    ganancia.gain.setValueAtTime(0.4, ahora);
    ganancia.gain.exponentialRampToValueAtTime(0.001, ahora + 0.15);

    fuente.connect(filtro);
    filtro.connect(ganancia);
    ganancia.connect(this.compresor);
    fuente.start(ahora);
  }

  /**
   * Reproduce el sonido al recoger un orbe: tono breve sine wave a 880Hz.
   */
  reproducirOrbe() {
    const { oscilador, ganancia } = this.crearOscilador('sine', 880);
    const ahora = this.contexto.currentTime;

    ganancia.gain.setValueAtTime(0.12, ahora);
    ganancia.gain.exponentialRampToValueAtTime(0.001, ahora + 0.2);

    // Pequeña subida de tono al final para que suene "positivo"
    oscilador.frequency.setValueAtTime(880, ahora);
    oscilador.frequency.setValueAtTime(1100, ahora + 0.1);

    oscilador.start(ahora);
    oscilador.stop(ahora + 0.22);
  }

  /**
   * Reproduce el sonido de activar una habilidad: arpegio de 3 notas cortas.
   */
  reproducirHabilidad() {
    const notas   = [440, 550, 660];
    const ahora   = this.contexto.currentTime;

    notas.forEach((frecuencia, i) => {
      const { oscilador, ganancia } = this.crearOscilador('triangle', frecuencia);
      const inicio = ahora + i * 0.07;
      ganancia.gain.setValueAtTime(0, inicio);
      ganancia.gain.linearRampToValueAtTime(0.1, inicio + 0.02);
      ganancia.gain.exponentialRampToValueAtTime(0.001, inicio + 0.1);
      oscilador.start(inicio);
      oscilador.stop(inicio + 0.12);
    });
  }

  /**
   * Reproduce el sonido de salto: sweep ascendente de 300→600Hz.
   */
  reproducirSalto() {
    const { oscilador, ganancia } = this.crearOscilador('triangle', 300);
    const ahora = this.contexto.currentTime;

    oscilador.frequency.setValueAtTime(300, ahora);
    oscilador.frequency.exponentialRampToValueAtTime(600, ahora + 0.15);

    ganancia.gain.setValueAtTime(0.08, ahora);
    ganancia.gain.exponentialRampToValueAtTime(0.001, ahora + 0.2);

    oscilador.start(ahora);
    oscilador.stop(ahora + 0.22);
  }

  /**
   * Reproduce el sonido de portal: tono complejo con efecto de eco simulado.
   */
  reproducirPortal() {
    const frecuencias = [220, 440, 330];
    const ahora       = this.contexto.currentTime;

    frecuencias.forEach((frec, i) => {
      const { oscilador, ganancia } = this.crearOscilador('sine', frec);
      const inicio = ahora + i * 0.04;
      ganancia.gain.setValueAtTime(0.12, inicio);
      ganancia.gain.exponentialRampToValueAtTime(0.001, inicio + 0.4);

      oscilador.frequency.setValueAtTime(frec, inicio);
      oscilador.frequency.exponentialRampToValueAtTime(frec * 1.5, inicio + 0.2);

      oscilador.start(inicio);
      oscilador.stop(inicio + 0.45);
    });
  }

  /**
   * Reproduce la melodía de victoria: 5 notas ascendentes en Do mayor.
   */
  reproducirVictoria() {
    // Escala de Do mayor: Do Re Mi Sol La
    const notas  = [261.63, 293.66, 329.63, 392.00, 440.00];
    const ahora  = this.contexto.currentTime;
    const pausa  = 0.12;

    notas.forEach((frecuencia, i) => {
      const { oscilador, ganancia } = this.crearOscilador('triangle', frecuencia);
      const inicio = ahora + i * pausa;
      ganancia.gain.setValueAtTime(0, inicio);
      ganancia.gain.linearRampToValueAtTime(0.15, inicio + 0.02);
      ganancia.gain.exponentialRampToValueAtTime(0.001, inicio + pausa * 1.5);
      oscilador.start(inicio);
      oscilador.stop(inicio + pausa * 2);
    });
  }

  /**
   * Reproduce el sonido de eliminación definitiva: descenso de tono 0.5s.
   */
  reproducirEliminacion() {
    const { oscilador, ganancia } = this.crearOscilador('sawtooth', 400);
    const ahora = this.contexto.currentTime;

    oscilador.frequency.setValueAtTime(400, ahora);
    oscilador.frequency.exponentialRampToValueAtTime(80, ahora + 0.5);

    ganancia.gain.setValueAtTime(0.15, ahora);
    ganancia.gain.exponentialRampToValueAtTime(0.001, ahora + 0.55);

    oscilador.start(ahora);
    oscilador.stop(ahora + 0.6);
  }

  /**
   * Inicia la música ambiente: pulso electrónico con osciladores a ~110 BPM.
   * Se ejecuta en loop de fondo mientras el juego está activo.
   */
  iniciarMusicaAmbiente() {
    if (this.musicaActiva) return;
    this.musicaActiva = true;

    // BPM 110 → intervalo = 60000/110 ≈ 545ms por beat
    const bpmMs = 545;

    // Acorde de fondo (notas graves) que pulsa al ritmo
    const tocarPulsoBeatAmbiente = () => {
      if (!this.musicaActiva) return;
      const { oscilador, ganancia } = this.crearOscilador('sine', 55);
      const ahora = this.contexto.currentTime;
      ganancia.gain.setValueAtTime(0, ahora);
      ganancia.gain.linearRampToValueAtTime(0.06, ahora + 0.02);
      ganancia.gain.exponentialRampToValueAtTime(0.001, ahora + 0.4);
      oscilador.start(ahora);
      oscilador.stop(ahora + 0.45);
      setTimeout(tocarPulsoBeatAmbiente, bpmMs);
    };

    // Melodía de fondo sutil
    const tocarMelodiaAmbiente = () => {
      if (!this.musicaActiva) return;
      const notas   = [110, 130, 110, 98, 110, 130, 146, 130];
      const duracion = bpmMs * 2;
      notas.forEach((frec, i) => {
        setTimeout(() => {
          if (!this.musicaActiva) return;
          const { oscilador, ganancia } = this.crearOscilador('triangle', frec);
          const ahora = this.contexto.currentTime;
          ganancia.gain.setValueAtTime(0.025, ahora);
          ganancia.gain.exponentialRampToValueAtTime(0.001, ahora + 0.4);
          oscilador.start(ahora);
          oscilador.stop(ahora + 0.45);
        }, i * bpmMs);
      });
      setTimeout(tocarMelodiaAmbiente, notas.length * bpmMs);
    };

    tocarPulsoBeatAmbiente();
    setTimeout(tocarMelodiaAmbiente, bpmMs * 2);
  }

  /**
   * Detiene la música ambiente.
   */
  detenerMusicaAmbiente() {
    this.musicaActiva = false;
  }

  /**
   * Ajusta el volumen maestro del sistema.
   * @param {number} nivel - Nivel de volumen (0 a 1).
   */
  ajustarVolumen(nivel) {
    this.volumenMaestro.gain.value = clamp(nivel, 0, 1);
  }
}

// ============================================================
// API PÚBLICA DE AUDIO (llamada desde otros módulos)
// ============================================================

/**
 * Inicializa el sistema de audio tras el primer gesto del usuario.
 * El AudioContext requiere interacción para iniciarse en navegadores modernos.
 */
function inicializarAudio() {
  if (!sistemaAudio) {
    try {
      sistemaAudio = new SistemaAudio();
    } catch (e) {
      // El audio no está disponible en este navegador
      sistemaAudio = null;
    }
  }
}

/**
 * Reproduce un sonido por nombre de evento.
 * Esta función es el punto de entrada desde cualquier otro módulo.
 * @param {string} evento - Nombre del evento de audio.
 */
function reproducirSonido(evento) {
  if (!sistemaAudio) return;
  // Reanudar el contexto si estaba suspendido por política del navegador
  if (sistemaAudio.contexto.state === 'suspended') {
    sistemaAudio.contexto.resume();
  }

  switch (evento) {
    case 'turbo':      sistemaAudio.reproducirTurbo();      break;
    case 'colision':   sistemaAudio.reproducirColision();   break;
    case 'orbe':       sistemaAudio.reproducirOrbe();       break;
    case 'habilidad':  sistemaAudio.reproducirHabilidad();  break;
    case 'salto':      sistemaAudio.reproducirSalto();      break;
    case 'portal':     sistemaAudio.reproducirPortal();     break;
    case 'victoria':   sistemaAudio.reproducirVictoria();   break;
    case 'eliminacion':sistemaAudio.reproducirEliminacion();break;
  }
}
