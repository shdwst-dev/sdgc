-- ============================================================================
-- rolesconfig.sql
-- Capa de seguridad con roles y usuarios de PostgreSQL para SDGC
-- Idempotente: se puede ejecutar varias veces sin romper.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) ROLES BASE (SIN LOGIN)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sdgc_r_read') THEN
        CREATE ROLE sdgc_r_read NOLOGIN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sdgc_r_write') THEN
        CREATE ROLE sdgc_r_write NOLOGIN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sdgc_r_exec') THEN
        CREATE ROLE sdgc_r_exec NOLOGIN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sdgc_r_admin') THEN
        CREATE ROLE sdgc_r_admin NOLOGIN;
    END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2) PERMISOS SOBRE BASE ACTUAL, ESQUEMA, TABLAS, SECUENCIAS Y RUTINAS
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    EXECUTE format(
        'GRANT CONNECT ON DATABASE %I TO sdgc_r_read, sdgc_r_write, sdgc_r_exec, sdgc_r_admin',
        current_database()
    );
END
$$;

GRANT USAGE ON SCHEMA public TO sdgc_r_read, sdgc_r_write, sdgc_r_exec, sdgc_r_admin;

-- Lectura
GRANT SELECT ON ALL TABLES IN SCHEMA public TO sdgc_r_read;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sdgc_r_read;

-- Escritura
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sdgc_r_write;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO sdgc_r_write;

-- Ejecucion de rutinas (funciones + procedimientos)
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL PROCEDURES IN SCHEMA public FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO sdgc_r_exec;
GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA public TO sdgc_r_exec;

-- Admin hereda todo
GRANT sdgc_r_read, sdgc_r_write, sdgc_r_exec TO sdgc_r_admin;

-- ---------------------------------------------------------------------------
-- 3) DEFAULT PRIVILEGES PARA OBJETOS FUTUROS
-- ---------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO sdgc_r_read;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sdgc_r_write;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO sdgc_r_read;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO sdgc_r_write;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
REVOKE EXECUTE ON PROCEDURES FROM PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT EXECUTE ON FUNCTIONS TO sdgc_r_exec;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT EXECUTE ON PROCEDURES TO sdgc_r_exec;

COMMIT;


BEGIN;

-- ---------------------------------------------------------------------------
-- 4) USUARIOS DE LOGIN (APLICACION)
--    Cambia passwords antes de ambiente productivo
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sdgc_web_user') THEN
        CREATE ROLE sdgc_web_user LOGIN PASSWORD 'Cambiar_Web_2026!';
    ELSE
        ALTER ROLE sdgc_web_user WITH PASSWORD 'Cambiar_Web_2026!';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sdgc_mobile_user') THEN
        CREATE ROLE sdgc_mobile_user LOGIN PASSWORD 'Cambiar_Mobile_2026!';
    ELSE
        ALTER ROLE sdgc_mobile_user WITH PASSWORD 'Cambiar_Mobile_2026!';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sdgc_report_user') THEN
        CREATE ROLE sdgc_report_user LOGIN PASSWORD 'Cambiar_Report_2026!';
    ELSE
        ALTER ROLE sdgc_report_user WITH PASSWORD 'Cambiar_Report_2026!';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sdgc_db_admin') THEN
        CREATE ROLE sdgc_db_admin LOGIN PASSWORD 'Cambiar_Admin_2026!';
    ELSE
        ALTER ROLE sdgc_db_admin WITH PASSWORD 'Cambiar_Admin_2026!';
    END IF;
END
$$;

-- Asignacion de permisos por tipo de usuario
GRANT sdgc_r_read, sdgc_r_write, sdgc_r_exec TO sdgc_web_user;
GRANT sdgc_r_read, sdgc_r_write, sdgc_r_exec TO sdgc_mobile_user;
GRANT sdgc_r_read TO sdgc_report_user;
GRANT sdgc_r_admin TO sdgc_db_admin;

-- Search path por defecto
ALTER ROLE sdgc_web_user SET search_path = public;
ALTER ROLE sdgc_mobile_user SET search_path = public;
ALTER ROLE sdgc_report_user SET search_path = public;
ALTER ROLE sdgc_db_admin SET search_path = public;

COMMIT;

-- ============================================================================
-- 5) PRUEBAS RAPIDAS
-- Ejecuta estas pruebas con un usuario admin, en la misma base donde creaste tablas.
-- ============================================================================

-- 5.1 Verificar que roles/usuarios existen
SELECT rolname, rolcanlogin
FROM pg_roles
WHERE rolname LIKE 'sdgc_%'
ORDER BY rolname;

-- 5.2 Simular rol de reportes (solo lectura)
SET ROLE sdgc_report_user;
SELECT current_user, session_user;
SELECT COUNT(*) AS total_productos FROM productos;
-- Debe fallar por permisos:
-- INSERT INTO categorias(nombre) VALUES ('TEST_SIN_PERMISO');
RESET ROLE;

-- 5.3 Simular rol web (lectura/escritura/ejecucion)
SET ROLE sdgc_web_user;
SELECT current_user, session_user;
INSERT INTO categorias(nombre) VALUES ('TEST_WEB_OK');
DELETE FROM categorias WHERE nombre = 'TEST_WEB_OK';

-- Si ya creaste funcionesV2.sql, puedes probar una rutina:
-- CALL pa_crear_producto_seguro(
--     1, 5, 1,
--     'Producto Prueba Seguridad',
--     10.00, 15.00,
--     '9990001112223',
--     'test.jpg',
--     1
-- );
RESET ROLE;
