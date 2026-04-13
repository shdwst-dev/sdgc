-- ==========================================
-- SCRIPT DE MIGRACIÓN: MÚLTIPLES DIRECCIONES POR USUARIO
-- Propósito: Permitir que los compradores guarden varias direcciones
-- con etiquetas (Casa, Oficina, etc.) y sincronizarlas en la nube.
-- ==========================================

-- 1. Crear la tabla puente para vincular usuarios con direcciones
CREATE TABLE IF NOT EXISTS usuarios_direcciones (
    id_usuario_direccion SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    id_direccion INTEGER NOT NULL,
    etiqueta VARCHAR(50) DEFAULT 'Hogar',
    es_principal BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Relaciones
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_direccion) REFERENCES direcciones (id_direccion) ON DELETE CASCADE,
    
    -- Impedir duplicados exactos para el mismo usuario y dirección
    UNIQUE (id_usuario, id_direccion)
);

-- 2. (Opcional) Índices para búsqueda rápida
CREATE INDEX idx_user_addr_user ON usuarios_direcciones(id_usuario);

-- 3. Comentario de éxito
COMMENT ON TABLE usuarios_direcciones IS 'Tabla para gestionar las múltiples direcciones de entrega de los compradores.';

-- ==========================================
-- INSTRUCCIONES: 
-- Copia y pega este contenido en tu gestor de base de datos (pgAdmin, DBeaver, etc.)
-- o ejecútalo mediante la terminal de PostgreSQL.
-- ==========================================
