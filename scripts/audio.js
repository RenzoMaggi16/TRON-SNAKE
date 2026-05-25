/**
 * audio.js — Sistema de audio renovado para SnakeTron.
 * Centraliza la carga y reproducción de archivos .wav.
 */

const SoundManager = {
  // Configuración de rutas y archivos
  BASE_PATH: '/sounds/',
  sounds: {},
  muted: false,
  
  // Volúmenes predeterminados según requisitos
  volumes: {
    bgm: 0.4,
    engine: 0.5,
    sfx: 0.7,
    ui: 0.6
  },

  // Clave para localStorage
  STORAGE_KEY: 'arenaTron_volumen',

  // Definición de todos los assets de audio
  assets: {
    // UI Sounds
    ui_hover:     { file: 'ui_hover.wav',     type: 'ui' },
    ui_select:    { file: 'ui_select.wav',    type: 'ui' },
    ui_navigate:  { file: 'ui_navigate.wav',  type: 'ui' },
    ui_countdown: { file: 'ui_countdown.wav', type: 'ui' },

    // Bike / Player Actions
    fx_bike_engine_loop: { file: 'fx_bike_engine_loop.wav', type: 'engine', loop: true },
    fx_bike_turn:        { file: 'fx_bike_turn.wav',        type: 'sfx' },
    fx_bike_boost:       { file: 'fx_bike_boost.wav',       type: 'sfx' },
    fx_bike_jump:        { file: 'fx_bike_jump.wav',        type: 'sfx' },

    // Game Events
    fx_item_orb:         { file: 'fx_item_orb.wav',         type: 'sfx' },
    fx_ability_activate: { file: 'fx_ability_activate.wav', type: 'sfx' },
    fx_env_portal:       { file: 'fx_env_portal.wav',       type: 'sfx' },
    fx_crash_explosion:  { file: 'fx_crash_explosion.wav',  type: 'sfx' },
    fx_player_death:     { file: 'fx_player_death.wav',     type: 'sfx' },

    // Music
    bgm_main_menu:       { file: 'bgm_main_menu.wav',       type: 'bgm', loop: true },
    bgm_combat_loop:     { file: 'bgm_combat_loop.wav',     type: 'bgm', loop: true },
    bgm_stinger_victory: { file: 'bgm_stinger_victory.wav', type: 'bgm' }
  },

  /**
   * Inicializa y precarga todos los sonidos.
   */
  init() {
    this.loadVolumes();
    for (const [key, config] of Object.entries(this.assets)) {
      const audio = new Audio(this.BASE_PATH + config.file);
      audio.loop = config.loop || false;
      audio.volume = this.volumes[config.type] || 0.7;
      audio.preload = 'auto';
      this.sounds[key] = audio;
    }
  },

  /**
   * Carga los volúmenes desde localStorage si existen.
   */
  loadVolumes() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.volumes = { ...this.volumes, ...parsed };
      }
    } catch (e) {
      console.warn('No se pudieron cargar los ajustes de volumen');
    }
  },

  /**
   * Guarda los volúmenes actuales en localStorage.
   */
  saveVolumes() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.volumes));
  },

  /**
   * Reproduce un sonido por su nombre.
   * Maneja SFX superpuestos mediante clonación.
   * @param {string} name - Nombre del sonido.
   */
  play(name) {
    const sound = this.sounds[name];
    if (!sound || this.muted) return;

    // Si es música, detener otras pistas de música primero (canal exclusivo)
    if (this.assets[name].type === 'bgm') {
      this.stopAllBGM();
    }

    try {
      // Para SFX cortos, usamos cloneNode para permitir superposición
      if (this.assets[name].type !== 'bgm' && this.assets[name].type !== 'engine' && !this.assets[name].loop) {
        const clone = sound.cloneNode(true);
        clone.volume = sound.volume;
        const playPromise = clone.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => { /* Silenciar error de autoplay */ });
        }
      } else {
        // Para BGM y loops, reproducir el objeto original
        const playPromise = sound.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => { /* Silenciar error de autoplay */ });
        }
      }
    } catch (err) {
      console.warn(`Error al reproducir ${name}:`, err);
    }
  },

  /**
   * Detiene un sonido específico y lo reinicia al principio.
   * @param {string} name - Nombre del sonido.
   */
  stop(name) {
    const sound = this.sounds[name];
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  },

  /**
   * Detiene todas las pistas de música de fondo (BGM).
   */
  stopAllBGM() {
    for (const [key, config] of Object.entries(this.assets)) {
      if (config.type === 'bgm') {
        this.stop(key);
      }
    }
  },

  /**
   * Detiene todos los sonidos del juego (útil al morir o cambiar de estado).
   */
  stopAll() {
    for (const key in this.sounds) {
      this.stop(key);
    }
  },

  /**
   * Silencia todo el audio del sistema.
   */
  mute() {
    this.muted = true;
    for (const key in this.sounds) {
      this.sounds[key].pause();
    }
  },

  /**
   * Reactiva el audio del sistema.
   */
  unmute() {
    this.muted = false;
  },

  /**
   * Cambia el volumen de una categoría.
   * @param {string} type - 'bgm', 'engine', 'sfx', 'ui'.
   * @param {number} level - 0.0 a 1.0.
   */
  setVolume(type, level) {
    if (this.volumes[type] !== undefined) {
      this.volumes[type] = level;
      for (const [key, config] of Object.entries(this.assets)) {
        if (config.type === type && this.sounds[key]) {
          this.sounds[key].volume = level;
        }
      }
      this.saveVolumes();
    }
  },

  /**
   * Agrega manejadores de sonido (hover y click) a todos los elementos interactivos.
   */
  attachUIHandlers() {
    const selector = 'button, a, .opcion-moto, .opcion-nivel, .nav-link, .navbar-brand, select, input[type="button"], input[type="submit"]';
    const elements = document.querySelectorAll(selector);
    
    elements.forEach(el => {
      // Evitar duplicados si se llama varias veces
      if (el._soundHandlersAttached) return;
      
      el.addEventListener('mouseenter', () => SoundManager.play('ui_hover'));
      el.addEventListener('click', () => SoundManager.play('ui_select'));
      
      el._soundHandlersAttached = true;
    });
  },

  /**
   * Inyecta el HTML del modal de ajustes si no existe en la página.
   */
  injectSettingsModal() {
    if (document.getElementById('overlayAjustes')) return;

    const modalHTML = `
      <div id="overlayAjustes" class="overlay-ajustes" role="dialog" aria-modal="true" aria-label="Ajustes de Sonido">
        <div class="panel-ajustes">
          <h2 class="titulo-ajustes">Configuración</h2>
          
          <div class="grupo-ajuste">
            <div class="label-ajuste">
              <span>Música</span>
              <span id="valorMusica" class="valor-ajuste">40%</span>
            </div>
            <input type="range" id="sliderMusica" class="slider-ajuste" min="0" max="100" value="40">
          </div>

          <div class="grupo-ajuste">
            <div class="label-ajuste">
              <span>Efectos (SFX)</span>
              <span id="valorSFX" class="valor-ajuste">70%</span>
            </div>
            <input type="range" id="sliderSFX" class="slider-ajuste" min="0" max="100" value="70">
          </div>

          <div class="grupo-ajuste">
            <div class="label-ajuste">
              <span>Motor</span>
              <span id="valorMotor" class="valor-ajuste">50%</span>
            </div>
            <input type="range" id="sliderMotor" class="slider-ajuste" min="0" max="100" value="50">
          </div>

          <div class="grupo-ajuste">
            <div class="label-ajuste">
              <span>Interfaz (UI)</span>
              <span id="valorUI" class="valor-ajuste">60%</span>
            </div>
            <input type="range" id="sliderUI" class="slider-ajuste" min="0" max="100" value="60">
          </div>

          <div class="botones-ajustes">
            <button class="boton-neon" onclick="cerrarAjustes()">Guardar</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
};

/**
 * Funciones globales para controlar el modal de ajustes
 */
function abrirAjustes() {
  const overlay = document.getElementById('overlayAjustes');
  if (!overlay) return;

  // Sincronizar sliders con volúmenes actuales
  const mappings = [
    { id: 'sliderMusica', valId: 'valorMusica', type: 'bgm' },
    { id: 'sliderSFX',    valId: 'valorSFX',    type: 'sfx' },
    { id: 'sliderMotor',  valId: 'valorMotor',  type: 'engine' },
    { id: 'sliderUI',     valId: 'valorUI',     type: 'ui' }
  ];

  mappings.forEach(m => {
    const slider = document.getElementById(m.id);
    const label  = document.getElementById(m.valId);
    if (slider) {
      const vol = SoundManager.volumes[m.type];
      slider.value = vol * 100;
      if (label) label.textContent = `${Math.round(vol * 100)}%`;

      // Añadir listener de cambio en tiempo real
      slider.oninput = () => {
        const val = slider.value / 100;
        if (label) label.textContent = `${slider.value}%`;
        SoundManager.setVolume(m.type, val);
      };
    }
  });

  overlay.classList.add('visible');
}

function cerrarAjustes() {
  const overlay = document.getElementById('overlayAjustes');
  if (overlay) overlay.classList.remove('visible');
  SoundManager.play('ui_select');
}

// Inicializar automáticamente al cargar el script
SoundManager.init();

// Escuchar el DOM para aplicar sonidos a la interfaz
document.addEventListener('DOMContentLoaded', () => {
  SoundManager.injectSettingsModal();
  SoundManager.attachUIHandlers();
  
  // Iniciar música de menú si no estamos en la página de juego
  if (!window.location.pathname.includes('juego')) {
    SoundManager.play('bgm_main_menu');
  }
});
