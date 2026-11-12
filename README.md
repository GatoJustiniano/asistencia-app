# asistencia-app

Aplicación de registro de asistencia que se despliega **una vez por tenant** (una institución por instancia).

- `backend/`: API en Node.js + Express + SQLite (`server.js`), utilidades de Excel y datos de demostración.
- `frontend/`: páginas del estudiante y del docente en JavaScript sin frameworks.

## Papel en la plataforma

La plataforma ([plataforma-tenants](../plataforma-tenants)) no compila este repositorio. Lo instala en la EC2 de cada tenant de una de dos formas:

1. **Packer** construye la AMI base a partir de un **tag** de este repo, por ejemplo `v1.0.0`.
2. Si no se usa la AMI, **cloud-init** clona el repo en el arranque con un *sparse checkout* que trae solo `backend/` y `frontend/`.

Cada despliegue guarda el tag y el commit de la app que usó (RF-13). Por eso los cambios se publican como tags:

```bash
git tag v1.0.0
```

## Datos y configuración

- La base SQLite vive en el volumen EBS del tenant, montado en `/var/lib/asistencia`. Cada tenant tiene su propio volumen.
- La configuración llega por `.env`, que escribe cloud-init a partir de los parámetros de SSM del tenant. Consulta `backend/.env.example` para ver las variables; nunca se sube un `.env` real.
- `GET /api/health` lo usan el worker de la plataforma (para saber si el despliegue terminó) y Prometheus (para medir la disponibilidad).

## Métricas (RF-26)

`utils/metricas.js` publica `GET /metrics` en un puerto aparte (`METRICS_PORT`, 9101 por defecto; `0` lo desactiva). El Security Group del tenant abre ese puerto solo a la plataforma, y el puerto público de la app no expone `/metrics`.

| Métrica | Qué mide |
|---|---|
| `http_requests_total{metodo,ruta,codigo}` | Peticiones atendidas; con `codigo=~"5.."` salen los errores 5xx |
| `http_request_duration_seconds{metodo,ruta}` | Latencia (histograma) |
| `asistencia_db_up` | 1 si la base SQLite responde |
| `asistencia_estudiantes` | Estudiantes del módulo activo |
| `asistencia_limite{recurso}` | Límites del plan (`MAX_ESTUDIANTES`, `MAX_DOCENTES`, `MAX_CURSOS`) |
| `process_*`, `nodejs_*` | Métricas estándar del proceso Node |

`ruta` es el patrón de Express (`/api/admin/fechas/:id`), no la URL, para no crear una serie por cada valor. Las etiquetas `tenant`, `entorno` y `plan` las agrega Prometheus a partir de los tags de la EC2.

## Desarrollo local

```bash
cd backend
npm ci
npm start
```
