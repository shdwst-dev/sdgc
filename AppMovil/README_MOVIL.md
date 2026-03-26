# App móvil - Sistema de Gestión Comercial (SDGC)

Este módulo contiene la app móvil/web construida con **Expo + React Native + TypeScript**.

## Estado actual del proyecto (hasta hoy)

### Ya implementado
- Flujo de inicio de sesión con backend (`/api/v1/auth/login`).
- Navegación por rol:
  - Admin -> `dashboard-ad` (tabs admin).
  - Comprador -> `dashboard-cm` (tabs comprador).
- Persistencia de sesión con `AsyncStorage`:
  - Guarda token al iniciar sesión.
  - Restaura token al abrir/reload de la app.
- Configuración admin conectada a backend (`/api/v1/auth/me`):
  - Muestra nombre, correo, rol y estatus reales.
  - Botón para recargar perfil.
  - Cierre de sesión con limpieza local + intento remoto (`/api/v1/auth/logout`).

### Pantallas actuales
- `src/screens/Login.tsx`
- `src/screens/admin/`
  - `dashboard-ad.tsx`
  - `inventario.tsx`
  - `ventas.tsx`
  - `alertas.tsx`
  - `config.tsx` (conectada)
  - `AdminTabs.tsx`
- `src/screens/comprador/`
  - `dashboard-cm.tsx`
  - `buscador.tsx`
  - `carrito.tsx`
  - `perfil.tsx`
  - `CompradorTabs.tsx`

## Estructura base

```text
Sistema-De-Gestion-Comercial/
├── assets/
├── src/
│   ├── navigation/
│   ├── screens/
│   │   ├── admin/
│   │   └── comprador/
│   └── services/
│       ├── auth.ts
│       └── storage.ts
├── App.tsx
├── package.json
└── .env
```

## Requisitos para correr la app

- Node.js y npm instalados.
- Dependencias instaladas del módulo móvil.
- Backend Laravel corriendo y accesible por red.
- Base de datos del backend operativa (si backend la requiere para login).

## Instalación rápida (equipo)

Desde la raíz del repo:

```bash
cd AppMovil/Sistema-De-Gestion-Comercial
npm install
```

## Variables de entorno (`.env`)

Archivo: `AppMovil/Sistema-De-Gestion-Comercial/.env`

Ejemplo:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Qué URL usar según entorno
- **Expo Web en la misma PC del backend**: `http://localhost:8000/api/v1`
- **Emulador Android**: `http://10.0.2.2:8000/api/v1` (si backend corre en host)
- **Celular físico en la misma red**: `http://<IP_LOCAL_PC>:8000/api/v1`

> Si cambias `.env`, reinicia Expo con caché limpia.

## Cómo ejecutar

```bash
cd AppMovil/Sistema-De-Gestion-Comercial
npm run web
```

Opcional:

```bash
cd AppMovil/Sistema-De-Gestion-Comercial
npm run android
npm run ios
```

## Dependencia con backend

La app móvil usa estas rutas de Laravel:
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

Si el backend no está arriba o no responde en la URL configurada, login y perfil no funcionarán.

## Checklist para compañeros (onboarding)

1. Clonar repo y entrar a `AppMovil/Sistema-De-Gestion-Comercial`.
2. Ejecutar `npm install`.
3. Crear/ajustar `.env` con `EXPO_PUBLIC_API_URL` correcta.
4. Levantar backend Laravel en puerto `8000` (o ajustar URL).
5. Ejecutar `npm run web` (o `android/ios`).
6. Probar login con usuario válido del backend.
7. Abrir tab **Config** y verificar datos reales (nombre/correo/rol/estatus).

## Troubleshooting rápido

### El login se queda cargando
- Revisar `EXPO_PUBLIC_API_URL` (normalmente es URL incorrecta o no alcanzable).
- Confirmar backend activo y respondiendo.
- En web local, usar `localhost` en vez de una IP caída.

### No se ve cambio de `.env`
- Reiniciar Expo y limpiar caché:

```bash
cd AppMovil/Sistema-De-Gestion-Comercial
npx expo start -c
```

### Sesión rara después de pruebas
- Cerrar sesión desde la app para limpiar token.
- Si persiste, reinstalar app o limpiar almacenamiento local del navegador/app.

## Próximo objetivo recomendado

Conectar `inventario.tsx` a backend para mostrar contenido real en la pestaña de Inventario.
