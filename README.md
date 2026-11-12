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

## Pendiente para el proyecto final

- Exponer `GET /metrics` con `prom-client`: latencia, errores 5xx y estado de la base de datos (RF-26).
- Leer la ruta de la base de datos desde una variable de entorno, para que use el volumen EBS.

## Desarrollo local

```bash
cd backend
npm ci
npm start
```
