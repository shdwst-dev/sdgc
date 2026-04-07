# SDGC

Repositorio del proyecto integrador Sistema de Gestion Comercial (SDGC).

Este repo contiene:
- `AppWeb` (React + Vite)
- `AppMovil/Sistema-De-Gestion-Comercial` (Expo + React Native)
- `Backend/laravel` (API)

## Estructura del proyecto

```text
sdgc/
├── README.md
├── AppMovil/
│   ├── README_MOVIL.md
│   └── Sistema-De-Gestion-Comercial/
│       ├── app.json
│       ├── App.tsx
│       ├── index.ts
│       ├── package.json
│       ├── tsconfig.json
│       ├── assets/
│       └── src/
│           └── screens/
│               ├── Login.tsx
│               ├── admin/
│               └── comprador/
├── AppWeb/
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── README_WEB.md
│   ├── README.md
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── public/
│   └── src/
│       ├── main.tsx
│       ├── assets/
│       ├── pages/
│       │   ├── App.tsx
│       │   ├── clientes.tsx
│       │   ├── compras.tsx
│       │   ├── configuracion.tsx
│       │   ├── dashboard.tsx
│       │   ├── facturacion.tsx
│       │   ├── inventario.tsx
│       │   ├── layout.tsx
│       │   ├── login.tsx
│       │   ├── proveedores.tsx
│       │   ├── reportes.tsx
│       │   ├── sidebar.tsx
│       │   └── ventas.tsx
│       └── styles/
│           ├── App.css
│           ├── dashboard.css
│           ├── index.css
│           └── login.css
├── Backend/
│   ├── README_BACKEND.md
│   └── laravel/
│       ├── artisan
│       ├── CHANGELOG.md
│       ├── composer.json
│       ├── package.json
│       ├── phpunit.xml
│       ├── README.md
│       ├── vite.config.js
│       ├── app/
│       ├── bootstrap/
│       ├── config/
│       ├── database/
│       ├── public/
│       ├── resources/
│       ├── routes/
│       ├── storage/
│       └── tests/
└── DataBase/
	├── creacion.sql
	└── poblarBD.sql
```

## Requisitos generales

- Node.js 20+
- npm 10+
- Backend Laravel corriendo (API disponible)

## Inicio rapido despues de clonar

### 1) Backend (referencia)

Sigue `Backend/README_BACKEND.md` para levantar Laravel.

### 2) App Web

```bash
cd AppWeb
npm install
cp .env.example .env
npm run dev
```

### 3) App Movil

```bash
cd AppMovil/Sistema-De-Gestion-Comercial
npm install
cp .env.example .env
npm run web
```

Tambien puedes usar:

```bash
cd AppMovil/Sistema-De-Gestion-Comercial
npm run android
npm run ios
```

## Variables de entorno minimas

- Web (`AppWeb/.env`):

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api
```

- Movil (`AppMovil/Sistema-De-Gestion-Comercial/.env`):

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Validacion recomendada

```bash
cd AppWeb
npm run build
```

```bash
cd AppMovil/Sistema-De-Gestion-Comercial
npx tsc --noEmit
```

## Guias por modulo

- Web: `AppWeb/README_WEB.md`
- Movil: `AppMovil/README_MOVIL.md`

