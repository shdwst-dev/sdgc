# App Web - SDGC

Aplicacion web del Sistema de Gestion Comercial construida con React + TypeScript + Vite.

## Requisitos

- Node.js 20+
- npm 10+
- Backend Laravel corriendo (por defecto en puerto `8000`)

## Instalacion

```bash
cd AppWeb
npm install
cp .env.example .env
```

## Variables de entorno

Archivo: `AppWeb/.env`

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api
```

Notas:
- Usa `/api` (sin `/v1`) porque las rutas del front ya incluyen el prefijo (ej. `/v1/auth/login`).
- Si backend y web no corren en la misma maquina, usa la IP/host real del backend.

## Ejecucion

```bash
cd AppWeb
npm run dev
```

Comandos utiles:

```bash
cd AppWeb
npm run build
npm run preview
npm run lint
```

## Flujo esperado

1. Abre `http://localhost:5173`.
2. Inicia sesion con credenciales validas del backend.
3. Verifica que dashboard y modulos cargan informacion de API.

## Problemas comunes

- `Network Error` o login falla:
  - revisar `VITE_API_BASE_URL`.
  - confirmar backend arriba (`http://localhost:8000`).
- CORS:
  - verificar config de CORS en Laravel para origen `http://localhost:5173`.
