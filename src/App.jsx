import { useState, useEffect } from 'react';

// TU API REAL
const API_URL = 'https://script.google.com/macros/s/AKfycbyAd4ybGnq9glmozCmmMWDrZ9wRlu-YaILgwBTeFpbzDppoV93gPovQRKhdYsGYlKB7/exec';

// Funciones API
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

export default function App() {
  const [view, setView] = useState('login');
  const [usuario, setUsuario] = useState(null);
  const [marca, setMarca] = useState(null);
  const [solicitud, setSolicitud] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-black/40 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center text-2xl">
              🚗
            </div>
            <div>
              <span className="font-bold text-lg text-white">Gestión de Campañas</span>
              <span className="text-xs text-cyan-400 block font-medium">Sistema Automotriz</span>
            </div>
          </div>
          {usuario && (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <span className="text-sm text-white block font-medium">{usuario.Nombre_Completo}</span>
                <span className="text-xs text-slate-400">{usuario.Rol}</span>
              </div>
              <button 
                onClick={() => { setUsuario(null); setMarca(null); setView('login'); }}
                className="text-sm px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 pb-20">
        {view === 'login' && <Login onLogin={(u) => { setUsuario(u); setView('marcas'); }} />}
        {view === 'marcas' && <Marcas usuario={usuario} onSelect={(m) => { setMarca(m); setView('form'); }} />}
        {view === 'form' && <Formulario usuario={usuario} marca={marca} onSubmit={(s) => { setSolicitud(s); setView('ok'); }} onBack={() => setView('marcas')} />}
        {view === 'ok' && <Confirmacion solicitud={solicitud} onNueva={() => { setMarca(null); setSolicitud(null); setView('marcas'); }} />}
      </main>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs text-slate-400">
          ✅ Conectado a Google Sheets en tiempo real
        </div>
      </div>
    </div>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await apiCall('login', { email });
    
    if (result.success) {
      onLogin(result.usuario);
    } else {
      setError(result.error || 'Error al iniciar sesión');
    }
    setLoading(false);
  };

  return (
    <div className="mt-12 flex justify-center">
      <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-10 w-full max-w-md border border-white/10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-cyan-400 to-teal-400 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-6 shadow-xl">
            🔐
          </div>
          <h1 className="text-4xl font-bold text-white">Bienvenido</h1>
          <p className="text-slate-400 mt-3 text-lg">Ingresa para gestionar tus campañas</p>
        </div>
        
        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3">Email corporativo</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="tu.email@empresa.com" 
              required 
              className="w-full px-5 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition text-lg" 
            />
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-2xl text-sm">
              ⚠️ {error}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Ingresar →'}
          </button>
        </form>
        
        <div className="mt-8 p-5 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-cyan-500/20 rounded-2xl">
          <p className="text-sm text-cyan-300 text-center">
            <span className="font-bold">Prueba con:</span> juan.perez@cliente.com
          </p>
        </div>
      </div>
    </div>
  );
}

function Marcas({ usuario, onSelect }) {
  const [marcas, setMarcas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      const result = await apiCall('getMarcas', { userId: usuario.ID_Usuario });
      if (result.success) {
        setMarcas(result.marcas);
      }
      setLoading(false);
    };
    cargar();
  }, [usuario]);

  const brandStyles = {
    'Ford': 'from-blue-600 to-blue-800',
    'Chevrolet': 'from-amber-500 to-yellow-600',
    'Nissan': 'from-red-600 to-rose-700',
    'Toyota': 'from-red-500 to-pink-600',
    'Volkswagen': 'from-blue-700 to-indigo-800',
  };

  if (loading) {
    return (
      <div className="mt-20 text-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-slate-400 mt-4">Cargando marcas...</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-3">
          ¡Hola, {usuario.Nombre_Completo.split(' ')[0]}! 👋
        </h1>
        <p className="text-slate-400 text-xl">Selecciona una marca para crear tu solicitud</p>
      </div>
      
      <div className="grid grid-cols-2 gap-5">
        {marcas.map(m => (
          <button 
            key={m.ID_Marca} 
            onClick={() => onSelect(m)} 
            className={`bg-gradient-to-br ${brandStyles[m.Nombre_Marca] || 'from-slate-600 to-slate-700'} rounded-3xl p-8 hover:scale-105 transition-all duration-300 shadow-xl`}
          >
            <div className="text-3xl font-bold text-white mb-2">{m.Nombre_Marca}</div>
            <div className="text-sm text-white/60">{m.Tipo_Materiales}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Formulario({ usuario, marca, onSubmit, onBack }) {
  const [data, setData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const solicitudData = {
      ID_Usuario: usuario.ID_Usuario,
      Nombre_Usuario: usuario.Nombre_Completo,
      ID_Marca: marca.ID_Marca,
      Nombre_Marca: marca.Nombre_Marca,
      Texto_Anuncio: data.texto_anuncio || '',
      Presupuesto: data.presupuesto || '',
      Comentarios: data.comentarios || '',
      Prioridad: 'Normal',
      Tipo_Materiales: marca.Tipo_Materiales,
      datosDinamicos: data,
    };
    
    const result = await apiPost('crearSolicitud', solicitudData);
    
    if (result.success) {
      onSubmit({
        ...solicitudData,
        Numero_Solicitud: result.numeroSolicitud,
      });
    } else {
      alert('Error: ' + (result.error || 'Intenta de nuevo'));
    }
    setSubmitting(false);
  };

  return (
    <div className="mt-6">
      <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl">
        <div className="mb-8">
          <span className="inline-block bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-5 py-2 rounded-full text-sm font-bold mb-4">
            {marca.Nombre_Marca}
          </span>
          <h2 className="text-3xl font-bold text-white">Nueva Solicitud</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Texto del anuncio *
            </label>
            <textarea 
              value={data.texto_anuncio || ''} 
              onChange={e => setData({...data, texto_anuncio: e.target.value})} 
              placeholder="Escribe el copy del anuncio..." 
              rows={4} 
              required
              className="w-full px-5 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition resize-none" 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Presupuesto *
            </label>
            <input 
              type="number" 
              value={data.presupuesto || ''} 
              onChange={e => setData({...data, presupuesto: e.target.value})} 
              placeholder="Ej: 50000" 
              required
              className="w-full px-5 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition" 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Comentarios
            </label>
            <textarea 
              value={data.comentarios || ''} 
              onChange={e => setData({...data, comentarios: e.target.value})} 
              placeholder="Indicaciones especiales..." 
              rows={3} 
              className="w-full px-5 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition resize-none" 
            />
          </div>

          <div className="flex justify-between gap-4 pt-4">
            <button 
              type="button"
              onClick={onBack}
              className="px-8 py-4 bg-white/5 border-2 border-white/10 text-white rounded-2xl font-semibold hover:bg-white/10 transition"
            >
              ← Volver
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className="px-10 py-4 bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 text-white rounded-2xl font-bold hover:shadow-xl transition disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : 'Enviar solicitud ✓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Confirmacion({ solicitud, onNueva }) {
  return (
    <div className="mt-12 flex justify-center">
      <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-12 text-center max-w-md border border-white/10 shadow-2xl">
        <div className="w-28 h-28 bg-gradient-to-br from-green-400 to-teal-400 rounded-full flex items-center justify-center text-6xl mx-auto mb-8 shadow-2xl">
          ✓
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">¡Listo!</h1>
        <p className="text-slate-400 text-lg mb-10">Tu solicitud fue enviada exitosamente</p>
        
        <div className="bg-white/5 rounded-2xl p-6 mb-10 text-left border border-white/10">
          <div className="flex justify-between py-4 border-b border-white/10">
            <span className="text-slate-400">Número</span>
            <span className="font-bold text-white text-lg">{solicitud.Numero_Solicitud}</span>
          </div>
          <div className="flex justify-between py-4 border-b border-white/10">
            <span className="text-slate-400">Marca</span>
            <span className="font-semibold text-white">{solicitud.Nombre_Marca}</span>
          </div>
          <div className="flex justify-between py-4">
            <span className="text-slate-400">Estado</span>
            <span className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 px-4 py-1 rounded-full text-sm font-bold">
              Solicitado
            </span>
          </div>
        </div>
        
        <button 
          onClick={onNueva}
          className="w-full bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 text-white py-5 rounded-2xl font-bold text-lg hover:shadow-xl transition"
        >
          Crear otra solicitud
        </button>
      </div>
    </div>
  );
}
