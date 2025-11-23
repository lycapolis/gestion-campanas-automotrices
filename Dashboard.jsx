import { useState, useEffect } from 'react';

// API URL - debe coincidir con App.jsx
const API_URL = 'https://script.google.com/macros/s/AKfycby8b41n5KV0FL-ufFhoPrh6YyiqbPUQqaG2G_O63QVhYH-VbVlG5Hyl4mgasXHl9iGj/exec';

const apiCall = async (action, params = {}) => {
  try {
    const queryParams = new URLSearchParams({ action, ...params });
    const response = await fetch(`${API_URL}?${queryParams}`);
    return await response.json();
  } catch (error) {
    console.error('Error API:', error);
    return { success: false, error: error.message };
  }
};

const apiPost = async (action, data) => {
  try {
    const queryParams = new URLSearchParams({ action, data: JSON.stringify(data) });
    const response = await fetch(`${API_URL}?${queryParams}`);
    return await response.json();
  } catch (error) {
    console.error('Error API POST:', error);
    return { success: false, error: error.message };
  }
};

export default function Dashboard({ usuario, onLogout }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [estados, setEstados] = useState([]);
  const [filtros, setFiltros] = useState({ marca: 'TODAS', estado: 'TODOS', busqueda: '' });
  const [loading, setLoading] = useState(true);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [stats, setStats] = useState({ total: 0, porEstado: {} });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    
    const [solResult, estResult] = await Promise.all([
      apiCall('getSolicitudesEquipo'),
      apiCall('getEstados')
    ]);

    if (solResult.success) {
      setSolicitudes(solResult.solicitudes);
      calcularStats(solResult.solicitudes);
    }

    if (estResult.success) {
      setEstados(estResult.estados);
    }

    setLoading(false);
  };

  const calcularStats = (sols) => {
    const porEstado = {};
    sols.forEach(s => {
      if (s.Activa === 'SI') {
        porEstado[s.Estado_Actual] = (porEstado[s.Estado_Actual] || 0) + 1;
      }
    });
    setStats({ total: sols.filter(s => s.Activa === 'SI').length, porEstado });
  };

  const cambiarEstado = async (solicitud, nuevoEstado) => {
    const data = {
      idSolicitud: solicitud.ID_Solicitud,
      nuevoEstado: nuevoEstado,
      usuario: usuario.Nombre_Completo,
      comentario: `Cambio de estado de ${solicitud.Estado_Actual} a ${nuevoEstado}`
    };

    const result = await apiPost('actualizarEstado', data);

    if (result.success) {
      await cargarDatos();
      setSolicitudSeleccionada(null);
      alert('Estado actualizado exitosamente');
    } else {
      alert('Error al actualizar: ' + (result.error || 'Intenta de nuevo'));
    }
  };

  const solicitudesFiltradas = solicitudes.filter(s => {
    if (s.Activa !== 'SI') return false;
    if (filtros.marca !== 'TODAS' && s.Nombre_Marca !== filtros.marca) return false;
    if (filtros.estado !== 'TODOS' && s.Estado_Actual !== filtros.estado) return false;
    if (filtros.busqueda && !s.Numero_Solicitud.toLowerCase().includes(filtros.busqueda.toLowerCase())) return false;
    return true;
  });

  const marcasUnicas = ['TODAS', ...new Set(solicitudes.map(s => s.Nombre_Marca))];
  const estadosUnicos = ['TODOS', ...estados.map(e => e.Nombre_Estado)];

  const estadoColors = {
    'Solicitado': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    'En Revisión': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Aprobado': 'bg-green-500/20 text-green-300 border-green-500/30',
    'En Diseño': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Listo para Publicar': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    'Publicado': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Pausado': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'Rechazado': 'bg-red-500/20 text-red-300 border-red-500/30',
    'Finalizado': 'bg-slate-500/20 text-slate-300 border-slate-500/30'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin h-16 w-16 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400 text-lg">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-md border-b border-white/10 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-2xl">
              📊
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Dashboard Marketing</h1>
              <p className="text-sm text-slate-400">Panel de control de campañas</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-sm text-white font-medium block">{usuario.Nombre_Completo}</span>
              <span className="text-xs text-cyan-400">{usuario.Rol}</span>
            </div>
            <button 
              onClick={onLogout}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition text-sm"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm font-medium">Total Activas</span>
              <span className="text-2xl">📋</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm font-medium">Solicitadas</span>
              <span className="text-2xl">🆕</span>
            </div>
            <div className="text-3xl font-bold text-yellow-400">{stats.porEstado['Solicitado'] || 0}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm font-medium">En Proceso</span>
              <span className="text-2xl">⚙️</span>
            </div>
            <div className="text-3xl font-bold text-blue-400">
              {(stats.porEstado['En Revisión'] || 0) + (stats.porEstado['En Diseño'] || 0)}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm font-medium">Publicadas</span>
              <span className="text-2xl">✅</span>
            </div>
            <div className="text-3xl font-bold text-green-400">{stats.porEstado['Publicado'] || 0}</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Buscar</label>
              <input 
                type="text"
                placeholder="Número de solicitud..."
                value={filtros.busqueda}
                onChange={e => setFiltros({...filtros, busqueda: e.target.value})}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Marca</label>
              <select 
                value={filtros.marca}
                onChange={e => setFiltros({...filtros, marca: e.target.value})}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
              >
                {marcasUnicas.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Estado</label>
              <select 
                value={filtros.estado}
                onChange={e => setFiltros({...filtros, estado: e.target.value})}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
              >
                {estadosUnicos.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            <div className="flex items-end">
              <button 
                onClick={() => setFiltros({ marca: 'TODAS', estado: 'TODOS', busqueda: '' })}
                className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
              >
                Limpiar filtros
              </button>
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-400">
            Mostrando {solicitudesFiltradas.length} de {stats.total} solicitudes
          </div>
        </div>

        {/* Tabla de Solicitudes */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Número</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Fecha</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Marca</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Usuario</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Estado</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Presupuesto</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {solicitudesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      No hay solicitudes que coincidan con los filtros
                    </td>
                  </tr>
                ) : (
                  solicitudesFiltradas.map(sol => (
                    <tr key={sol.ID_Solicitud} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-cyan-400">{sol.Numero_Solicitud}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {new Date(sol.Fecha_Solicitud).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-white">{sol.Nombre_Marca}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">{sol.Nombre_Usuario}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${estadoColors[sol.Estado_Actual] || 'bg-slate-500/20 text-slate-300 border-slate-500/30'}`}>
                          {sol.Estado_Actual}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        ${parseInt(sol.Presupuesto || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => setSolicitudSeleccionada(sol)}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition"
                        >
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal de Gestión */}
      {solicitudSeleccionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
            <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Gestionar Solicitud</h2>
                <p className="text-cyan-400 font-mono text-sm mt-1">{solicitudSeleccionada.Numero_Solicitud}</p>
              </div>
              <button 
                onClick={() => setSolicitudSeleccionada(null)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Info básica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-slate-400">Marca</span>
                  <p className="text-white font-semibold text-lg">{solicitudSeleccionada.Nombre_Marca}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-400">Usuario</span>
                  <p className="text-white font-medium">{solicitudSeleccionada.Nombre_Usuario}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-400">Fecha</span>
                  <p className="text-white font-medium">
                    {new Date(solicitudSeleccionada.Fecha_Solicitud).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-400">Presupuesto</span>
                  <p className="text-green-400 font-bold">
                    ${parseInt(solicitudSeleccionada.Presupuesto || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Contenido */}
              <div>
                <span className="text-sm text-slate-400">Texto del Anuncio</span>
                <div className="mt-2 p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-white">{solicitudSeleccionada.Texto_Anuncio || 'No especificado'}</p>
                </div>
              </div>

              {solicitudSeleccionada.Comentarios && (
                <div>
                  <span className="text-sm text-slate-400">Comentarios</span>
                  <div className="mt-2 p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-slate-300 text-sm">{solicitudSeleccionada.Comentarios}</p>
                  </div>
                </div>
              )}

              {/* Estado Actual */}
              <div>
                <span className="text-sm text-slate-400">Estado Actual</span>
                <div className="mt-2">
                  <span className={`inline-flex px-4 py-2 rounded-xl text-sm font-semibold border ${estadoColors[solicitudSeleccionada.Estado_Actual]}`}>
                    {solicitudSeleccionada.Estado_Actual}
                  </span>
                </div>
              </div>

              {/* Cambiar Estado */}
              <div>
                <span className="text-sm font-semibold text-white block mb-3">Cambiar Estado</span>
                <div className="grid grid-cols-2 gap-3">
                  {estados.map(estado => (
                    <button
                      key={estado.ID_Estado}
                      onClick={() => cambiarEstado(solicitudSeleccionada, estado.Nombre_Estado)}
                      disabled={solicitudSeleccionada.Estado_Actual === estado.Nombre_Estado}
                      className={`p-3 rounded-xl font-medium transition ${
                        solicitudSeleccionada.Estado_Actual === estado.Nombre_Estado
                          ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {estado.Nombre_Estado}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
