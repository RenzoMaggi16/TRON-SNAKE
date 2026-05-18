// usuarios.js — Gestión de perfiles de usuario y récords usando localStorage.
// Toda la persistencia del juego pasa por este módulo.

// Claves de localStorage
const CLAVE_PERFILES = 'arenaTron_perfiles';
const CLAVE_RECORDS  = 'arenaTron_records';

// Límites del sistema
const MAX_PERFILES = 10;
const MAX_RECORDS  = 20;

// ============================================================
// PERFILES
// ============================================================

/**
 * Obtiene todos los perfiles guardados en localStorage.
 * @returns {Array} Array de objetos de perfil.
 */
function obtenerPerfiles() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_PERFILES)) || [];
  } catch {
    return [];
  }
}

/**
 * Guarda un nuevo perfil en localStorage.
 * Valida que no se supere el máximo de perfiles permitidos.
 * @param {{nombre:string, color:string}} datos - Datos del nuevo perfil.
 * @returns {{exito:boolean, mensaje:string}} Resultado de la operación.
 */
function guardarPerfil(datos) {
  const perfiles = obtenerPerfiles();

  if (perfiles.length >= MAX_PERFILES) {
    return { exito: false, mensaje: `No se pueden guardar más de ${MAX_PERFILES} perfiles.` };
  }

  const nuevoPerfil = {
    id:              generarId(),
    nombre:          datos.nombre.trim().slice(0, 12),
    color:           datos.color || '#00D4FF',
    fechaCreacion:   new Date().toISOString(),
    partidasJugadas: 0,
    victorias:       0,
    recordPuntaje:   0,
    nivelMasAlto:    1,
  };

  perfiles.push(nuevoPerfil);
  localStorage.setItem(CLAVE_PERFILES, JSON.stringify(perfiles));
  return { exito: true, mensaje: 'Perfil creado exitosamente.', perfil: nuevoPerfil };
}

/**
 * Elimina un perfil por su ID.
 * @param {string} id - ID del perfil a eliminar.
 */
function eliminarPerfil(id) {
  const perfiles    = obtenerPerfiles();
  const actualizados = perfiles.filter(p => p.id !== id);
  localStorage.setItem(CLAVE_PERFILES, JSON.stringify(actualizados));
}

/**
 * Actualiza las estadísticas de un perfil tras una partida.
 * @param {string} id - ID del perfil.
 * @param {{victoria:boolean, puntaje:number, nivel:number}} stats - Estadísticas de la partida.
 */
function actualizarEstadisticas(id, stats) {
  const perfiles = obtenerPerfiles();
  const perfil   = perfiles.find(p => p.id === id);
  if (!perfil) return;

  perfil.partidasJugadas += 1;
  if (stats.victoria)   perfil.victorias     += 1;
  if (stats.puntaje > perfil.recordPuntaje) perfil.recordPuntaje = stats.puntaje;
  if (stats.nivel   > perfil.nivelMasAlto)  perfil.nivelMasAlto  = stats.nivel;

  localStorage.setItem(CLAVE_PERFILES, JSON.stringify(perfiles));
}

/**
 * Obtiene los últimos 2 perfiles activos para mostrar en el menú.
 * @returns {Array} Array con máximo 2 perfiles recientes.
 */
function obtenerUltimosPerfiles() {
  return obtenerPerfiles().slice(-2);
}

// ============================================================
// RÉCORDS
// ============================================================

/**
 * Obtiene todos los récords ordenados de mayor a menor puntaje.
 * @returns {Array} Array de récords (máx. 20).
 */
function obtenerRecords() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_RECORDS)) || [];
  } catch {
    return [];
  }
}

/**
 * Guarda un nuevo récord y mantiene el top 20.
 * @param {{nombre:string, puntaje:number, nivel:number, color:string}} entrada - Datos del récord.
 */
function guardarRecord(entrada) {
  const records = obtenerRecords();

  records.push({
    nombre:  entrada.nombre || 'INVITADO',
    puntaje: Math.floor(entrada.puntaje || 0),
    nivel:   entrada.nivel  || 1,
    color:   entrada.color  || '#00D4FF',
    fecha:   new Date().toISOString(),
  });

  // Ordenar de mayor a menor puntaje y conservar solo el top 20
  records.sort((a, b) => b.puntaje - a.puntaje);
  const top20 = records.slice(0, MAX_RECORDS);

  localStorage.setItem(CLAVE_RECORDS, JSON.stringify(top20));
}

/**
 * Elimina todos los récords del marcador.
 */
function limpiarRecords() {
  localStorage.removeItem(CLAVE_RECORDS);
}
