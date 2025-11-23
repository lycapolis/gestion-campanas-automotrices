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

export default function FormularioDinamico({ usuario, marca, onSubmit, onBack }) {
  const [paso, setPaso] = useState(1);
  const [data, setData] = useState({});
  const [preguntas, setPreguntas] = useState([]);
  const [pasos, setPasos] = useState({});
  const [totalPasos, setTotalPasos] = useState(1);
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errores, setErrores] = useState({});

  useEffect(() => {
    cargarFormulario();
  }, [marca]);

  const cargarFormulario = async () => {
    setLoading(true);
    
    try {
      // Cargar configuración del formulario
      const formResult = await apiCall('getFormulario', { marca: marca.Nombre_Marca });
      
      if (formResult.success) {
        setPreguntas(formResult.preguntas);
        setPasos(formResult.pasos);
        setTotalPasos(formResult.totalPasos);
      }
      
      // Cargar modelos de la marca
      const modelosResult = await apiCall('getModelos', { marcaId: marca.ID_Marca });
      if (modelosResult.success) {
        setModelos(modelosResult.modelos);
      }
    } catch (err) {
      console.error('Error cargando formulario:', err);
    }
    
    setLoading(false);
  };

  const handleChange = (nombreCampo, valor) => {
    setData(prev => ({ ...prev, [nombreCampo]: valor }));
    // Limpiar error del campo
    if (errores[nombreCampo]) {
      setErrores(prev => {
        const nuevos = { ...prev };
        delete nuevos[nombreCampo];
        return nuevos;
      });
    }
  };

  const evaluarCondicion = (condicion) => {
    if (!condicion) return true;
    
    // Formato: "nombre_campo=valor" o "nombre_campo=valor1,nombre_campo2=valor2"
    const condiciones = condicion.split(',').map(c => c.trim());
    
    return condiciones.every(cond => {
      const [campo, valorEsperado] = cond.split('=').map(s => s.trim());
      return data[campo] === valorEsperado;
    });
  };

  const preguntasPasoActual = (pasos[paso] || []).filter(p => evaluarCondicion(p.Condicion));

  const validarPaso = () => {
    const nuevosErrores = {};
    
    preguntasPasoActual.forEach(pregunta => {
      if (pregunta.Obligatorio === 'SI') {
        const valor = data[pregunta.Nombre_Campo];
        
        if (!valor || (Array.isArray(valor) && valor.length === 0) || valor === '') {
          nuevosErrores[pregunta.Nombre_Campo] = 'Este campo es obligatorio';
        }
      }
    });
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const siguiente = () => {
    if (!validarPaso()) {
      return;
    }
    
    if (paso < totalPasos) {
      setPaso(paso + 1);
      window.scrollTo(0, 0);
    } else {
      enviarSolicitud();
    }
  };

  const anterior = () => {
    if (paso > 1) {
      setPaso(paso - 1);
      window.scrollTo(0, 0);
    } else {
      onBack();
    }
  };

  const enviarSolicitud = async () => {
    setSubmitting(true);
    
    const solicitudData = {
      ID_Usuario: usuario.ID_Usuario,
      Nombre_Usuario: usuario.Nombre_Completo,
      ID_Marca: marca.ID_Marca,
      Nombre_Marca: marca.Nombre_Marca,
      Tipo_Materiales: marca.Tipo_Materiales,
      Prioridad: 'Normal',
      // Campos específicos que se buscan en la data
      Texto_Anuncio: data.copy_anuncio || data.texto_anuncio || '',
      Presupuesto: data.presupuesto_mensual || data.presupuesto || '',
      Comentarios: data.comentarios_adicionales || data.comentarios || '',
      // Guardar TODA la data del formulario
      datosDinamicos: data,
    };
    
    const result = await apiPost('crearSolicitud', solicitudData);
    
    if (result.success) {
      onSubmit({
        ...solicitudData,
        Numero_Solicitud: result.numeroSolicitud,
      });
    } else {
      alert('Error al crear solicitud: ' + (result.error || 'Intenta de nuevo'));
    }
    
    setSubmitting(false);
  };

  const renderCampo = (pregunta) => {
    const valor = data[pregunta.Nombre_Campo];
    const tieneError = errores[pregunta.Nombre_Campo];
    const classBase = `w-full px-5 py-4 bg-white/5 border-2 rounded-2xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition ${
      tieneError ? 'border-red-500' : 'border-white/10'
    }`;

    switch (pregunta.Tipo_Campo) {
      case 'text':
        return (
          <input 
            type="text"
            value={valor || ''}
            onChange={e => handleChange(pregunta.Nombre_Campo, e.target.value)}
            placeholder={pregunta.Placeholder || ''}
            className={classBase}
          />
        );

      case 'number':
        return (
          <input 
            type="number"
            value={valor || ''}
            onChange={e => handleChange(pregunta.Nombre_Campo, e.target.value)}
            placeholder={pregunta.Placeholder || 'Ej: 50000'}
            className={classBase}
          />
        );

      case 'date':
        return (
          <input 
            type="date"
            value={valor || ''}
            onChange={e => handleChange(pregunta.Nombre_Campo, e.target.value)}
            className={classBase}
          />
        );

      case 'textarea':
        return (
          <textarea 
            value={valor || ''}
            onChange={e => handleChange(pregunta.Nombre_Campo, e.target.value)}
            placeholder={pregunta.Placeholder || ''}
            rows={4}
            className={`${classBase} resize-none`}
          />
        );

      case 'radio':
        const opciones = pregunta.Opciones.split(',').map(o => o.trim());
        return (
          <div className="flex flex-wrap gap-3">
            {opciones.map(opcion => (
              <button
                key={opcion}
                type="button"
                onClick={() => handleChange(pregunta.Nombre_Campo, opcion)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  valor === opcion
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/30 scale-105'
                    : 'bg-white/5 text-slate-300 border-2 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                {opcion}
              </button>
            ))}
          </div>
        );

      case 'dropdown':
        const opcionesDropdown = pregunta.Opciones.split(',').map(o => o.trim());
        return (
          <select
            value={valor || ''}
            onChange={e => handleChange(pregunta.Nombre_Campo, e.target.value)}
            className={classBase}
          >
            <option value="">Selecciona una opción...</option>
            {opcionesDropdown.map(opcion => (
              <option key={opcion} value={opcion}>{opcion}</option>
            ))}
          </select>
        );

      case 'multiselect':
        let opcionesMulti = [];
        
        // Si las opciones vienen de modelos
        if (pregunta.Opciones === 'FROM_MODELOS') {
          opcionesMulti = modelos.map(m => m.Nombre_Modelo);
        } else {
          opcionesMulti = pregunta.Opciones.split(',').map(o => o.trim());
        }
        
        const seleccionados = Array.isArray(valor) ? valor : [];
        
        return (
          <div className="space-y-3">
            {opcionesMulti.map(opcion => {
              const estaSeleccionado = seleccionados.includes(opcion);
              return (
                <button
                  key={opcion}
                  type="button"
                  onClick={() => {
                    const nuevosSeleccionados = estaSeleccionado
                      ? seleccionados.filter(v => v !== opcion)
                      : [...seleccionados, opcion];
                    handleChange(pregunta.Nombre_Campo, nuevosSeleccionados);
                  }}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 text-left ${
                    estaSeleccionado
                      ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-cyan-500 text-white'
                      : 'bg-white/5 border-2 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    estaSeleccionado ? 'bg-cyan-500 text-white' : 'bg-white/10'
                  }`}>
                    {estaSeleccionado && '✓'}
                  </div>
                  <span className="font-medium">{opcion}</span>
                </button>
              );
            })}
          </div>
        );

      default:
        return (
          <input 
            type="text"
            value={valor || ''}
            onChange={e => handleChange(pregunta.Nombre_Campo, e.target.value)}
            className={classBase}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="mt-20 text-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-slate-400 mt-4">Cargando formulario...</p>
      </div>
    );
  }

  if (preguntas.length === 0) {
    return (
      <div className="mt-12 flex justify-center">
        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-10 border border-white/10 text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-3">Formulario no configurado</h2>
          <p className="text-slate-400 mb-6">
            Esta marca aún no tiene preguntas configuradas en el sistema.
          </p>
          <button 
            onClick={onBack}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  const pasoTitulos = {
    1: 'Información básica',
    2: 'Presupuesto y contenido',
    3: 'Materiales creativos',
    4: 'Detalles adicionales',
    5: 'Finalizar solicitud',
  };

  return (
    <div className="mt-6">
      <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-slate-400">
              Paso {paso} de {totalPasos}
            </span>
            <span className="text-sm font-bold text-cyan-400">
              {Math.round((paso / totalPasos) * 100)}%
            </span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 transition-all duration-500 ease-out rounded-full" 
              style={{ width: `${(paso / totalPasos) * 100}%` }} 
            />
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <span className="inline-block bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-5 py-2 rounded-full text-sm font-bold mb-4 shadow-lg shadow-cyan-500/20">
            {marca.Nombre_Marca}
          </span>
          <h2 className="text-3xl font-bold text-white">
            {pasoTitulos[paso] || `Paso ${paso}`}
          </h2>
        </div>

        {/* Preguntas del paso actual */}
        <div className="space-y-6 mb-10">
          {preguntasPasoActual.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No hay preguntas para este paso
            </div>
          ) : (
            preguntasPasoActual.map(pregunta => (
              <div key={pregunta.ID_Pregunta} className="animate-fadeIn">
                <label className="block text-sm font-semibold text-slate-300 mb-3">
                  {pregunta.Pregunta}
                  {pregunta.Obligatorio === 'SI' && (
                    <span className="text-cyan-400 ml-1">*</span>
                  )}
                </label>
                
                {renderCampo(pregunta)}
                
                {errores[pregunta.Nombre_Campo] && (
                  <p className="text-red-400 text-sm mt-2">
                    {errores[pregunta.Nombre_Campo]}
                  </p>
                )}
                
                {pregunta.Ayuda && (
                  <p className="text-sm text-slate-500 mt-2">{pregunta.Ayuda}</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Botones de navegación */}
        <div className="flex justify-between gap-4 pt-4">
          <button 
            onClick={anterior}
            className="px-8 py-4 bg-white/5 border-2 border-white/10 text-white rounded-2xl font-semibold hover:bg-white/10 transition"
          >
            ← {paso === 1 ? 'Volver' : 'Anterior'}
          </button>
          
          <button 
            onClick={siguiente}
            disabled={submitting}
            className="px-10 py-4 bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 text-white rounded-2xl font-bold hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Enviando...
              </span>
            ) : paso === totalPasos ? (
              '✓ Enviar solicitud'
            ) : (
              'Siguiente →'
            )}
          </button>
        </div>

        {/* Indicador de campos obligatorios */}
        <div className="mt-6 text-center text-sm text-slate-500">
          <span className="text-cyan-400">*</span> Campos obligatorios
        </div>
      </div>
    </div>
  );
}
