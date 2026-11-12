// Métricas para Prometheus (RF-26). Se sirven en un puerto aparte (METRICS_PORT, 9101 por
// defecto) que el Security Group del tenant solo abre a la plataforma; el puerto público de
// la app nunca expone /metrics. Las etiquetas tenant/entorno/plan las agrega Prometheus.
const express = require('express');
const client = require('prom-client');

const registro = new client.Registry();
client.collectDefaultMetrics({ register: registro });

const peticiones = new client.Counter({
  name: 'http_requests_total',
  help: 'Peticiones HTTP atendidas',
  labelNames: ['metodo', 'ruta', 'codigo'],
  registers: [registro],
});
const duracion = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las peticiones HTTP',
  labelNames: ['metodo', 'ruta'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registro],
});

// Middleware: mide cada petición. La ruta es el patrón de Express (p. ej. /api/admin/fechas/:id),
// no la URL, para no crear una serie por cada valor distinto.
function medir(req, res, next) {
  const fin = duracion.startTimer();
  res.on('finish', () => {
    const ruta = req.route ? `${req.baseUrl}${req.route.path}` : (req.path.startsWith('/api') ? 'api_desconocida' : 'estatico');
    fin({ metodo: req.method, ruta });
    peticiones.inc({ metodo: req.method, ruta, codigo: String(res.statusCode) });
  });
  next();
}

// Métricas que se calculan al momento de cada lectura de Prometheus
function registrarMetricasNegocio({ get, limites }) {
  new client.Gauge({
    name: 'asistencia_db_up',
    help: '1 si la base SQLite responde',
    registers: [registro],
    async collect() {
      try { await get('SELECT 1'); this.set(1); } catch { this.set(0); }
    },
  });
  new client.Gauge({
    name: 'asistencia_estudiantes',
    help: 'Estudiantes del módulo activo',
    registers: [registro],
    async collect() {
      try {
        const r = await get(`SELECT COUNT(*) n FROM estudiantes e JOIN modulos m ON e.modulo_id = m.id WHERE m.activo = 1`);
        this.set(r ? r.n : 0);
      } catch { /* la BD no responde: lo indica asistencia_db_up */ }
    },
  });
  const limite = new client.Gauge({
    name: 'asistencia_limite',
    help: 'Límites del plan del tenant',
    labelNames: ['recurso'],
    registers: [registro],
  });
  for (const [recurso, valor] of Object.entries(limites)) if (valor > 0) limite.set({ recurso }, valor);
}

function servirMetricas(puerto) {
  if (!puerto) return;
  const m = express();
  m.get('/metrics', async (req, res) => {
    res.type(registro.contentType).send(await registro.metrics());
  });
  m.listen(puerto, () => console.log(`Métricas en :${puerto}/metrics`));
}

module.exports = { medir, registrarMetricasNegocio, servirMetricas };
