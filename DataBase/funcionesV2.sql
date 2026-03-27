-- ========================================================================
-- TRANSACCIONES SEGURAS CON SAVEPOINTS Y MANEJO DE ERRORES
-- Para PostgreSQL - Sistema de Gestión Comercial
-- ========================================================================

-- ========================================================================
-- 1) REGISTRAR USUARIO CON TRANSACCIÓN SEGURA
-- ========================================================================
CREATE OR REPLACE PROCEDURE pa_registrar_usuario_seguro(
    OUT p_id_usuario INTEGER,
    OUT p_success BOOLEAN,
    OUT p_message TEXT,
    p_nombre VARCHAR,
    p_apellido_paterno VARCHAR,
    p_apellido_materno VARCHAR,
    p_telefono VARCHAR,
    p_id_direccion INTEGER,
    p_email VARCHAR,
    p_contrasena TEXT,
    p_id_rol INTEGER DEFAULT 2,
    p_id_estatus INTEGER DEFAULT 1
)
LANGUAGE plpgsql
AS $$
DECLARE
    id_persona INTEGER;
    password_hash TEXT;
    existe_email INTEGER;
    existe_telefono INTEGER;
BEGIN
    p_success := FALSE;
    p_message := '';
    p_id_usuario := NULL;

    BEGIN
        -- Validaciones ANTES de hacer cambios
        SELECT COUNT(*) INTO existe_email
        FROM usuarios
        WHERE email = p_email;

        IF existe_email > 0 THEN
            RAISE EXCEPTION 'El email ya está registrado';
        END IF;

        SELECT COUNT(*) INTO existe_telefono
        FROM personas
        WHERE telefono = p_telefono;

        IF existe_telefono > 0 THEN
            RAISE EXCEPTION 'El teléfono ya está registrado';
        END IF;

        -- Hashear contraseña
        password_hash := crypt(p_contrasena, gen_salt('bf'));

        -- Insertar persona
        INSERT INTO personas(
            nombre,
            apellido_paterno,
            apellido_materno,
            telefono,
            id_direccion
        )
        VALUES(
            p_nombre,
            p_apellido_paterno,
            p_apellido_materno,
            p_telefono,
            p_id_direccion
        )
        RETURNING id_persona INTO id_persona;

        -- Insertar usuario
        INSERT INTO usuarios(
            id_persona,
            email,
            contrasena,
            id_rol,
            id_estatus
        )
        VALUES(
            id_persona,
            p_email,
            password_hash,
            p_id_rol,
            p_id_estatus
        )
        RETURNING id_usuario INTO p_id_usuario;

        p_success := TRUE;
        p_message := 'Usuario registrado correctamente con ID: ' || p_id_usuario;

    EXCEPTION WHEN OTHERS THEN
        p_success := FALSE;
        p_message := 'Error en registro de usuario: ' || SQLERRM;
        p_id_usuario := NULL;
    END;
END;
$$;

-- ========================================================================
-- 2) REGISTRAR COMPRA CON TRANSACCIÓN SEGURA Y ACTUALIZACIÓN DE STOCK
-- ========================================================================
CREATE OR REPLACE PROCEDURE pa_registrar_compra_segura(
    OUT p_id_compra INTEGER,
    OUT p_success BOOLEAN,
    OUT p_message TEXT,
    OUT p_total_detalles INTEGER,
    p_id_proveedor INTEGER,
    p_id_tienda INTEGER,
    p_detalles JSON,
    p_id_estatus INTEGER DEFAULT 1
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_detalle JSON;
    v_producto_id INTEGER;
    v_cantidad INTEGER;
    v_precio_compra DECIMAL(10,2);
    v_stock_actual INTEGER;
    v_contador INTEGER := 0;
    v_array_length INTEGER;
BEGIN
    p_success := FALSE;
    p_message := '';
    p_id_compra := NULL;
    p_total_detalles := 0;

    BEGIN
        -- Validaciones iniciales
        IF NOT EXISTS(SELECT 1 FROM proveedores WHERE id_proveedor = p_id_proveedor) THEN
            RAISE EXCEPTION 'El proveedor especificado no existe';
        END IF;

        IF NOT EXISTS(SELECT 1 FROM tiendas WHERE id_tienda = p_id_tienda) THEN
            RAISE EXCEPTION 'La tienda especificada no existe';
        END IF;

        v_array_length := json_array_length(p_detalles);
        IF v_array_length IS NULL OR v_array_length = 0 THEN
            RAISE EXCEPTION 'Debe proporcionar al menos un detalle de compra';
        END IF;

        -- Validar todos los detalles antes de insertar
        FOR v_detalle IN SELECT json_array_elements(p_detalles)
        LOOP
            v_producto_id := (v_detalle->>'producto_id')::INTEGER;
            v_cantidad := (v_detalle->>'cantidad')::INTEGER;

            IF NOT EXISTS(SELECT 1 FROM productos WHERE id_producto = v_producto_id) THEN
                RAISE EXCEPTION 'El producto % no existe', v_producto_id;
            END IF;

            IF v_cantidad <= 0 THEN
                RAISE EXCEPTION 'La cantidad del producto % debe ser mayor a 0', v_producto_id;
            END IF;
        END LOOP;

        -- Establecer ID de tienda en sesión para los triggers
        PERFORM set_config('app.id_tienda', p_id_tienda::TEXT, false);

        -- Insertar compra (SAVEPOINT automático)
        INSERT INTO compras(id_proveedor, id_tienda, id_estatus)
        VALUES(p_id_proveedor, p_id_tienda, p_id_estatus)
        RETURNING id_compra INTO p_id_compra;

        -- Procesar detalles
        FOR v_detalle IN SELECT json_array_elements(p_detalles)
        LOOP
            v_producto_id := (v_detalle->>'producto_id')::INTEGER;
            v_cantidad := (v_detalle->>'cantidad')::INTEGER;
            v_precio_compra := (v_detalle->>'precio_compra')::DECIMAL(10,2);

            -- Insertar detalle
            INSERT INTO detalle_compras(
                id_compra,
                producto_id,
                cantidad,
                precio_compra
            )
            VALUES(
                p_id_compra,
                v_producto_id,
                v_cantidad,
                v_precio_compra
            );

            -- Actualizar o insertar en stock
            v_stock_actual := COALESCE((
                SELECT stock_actual FROM stock 
                WHERE id_tienda = p_id_tienda 
                AND id_producto = v_producto_id 
                FOR UPDATE
            ), 0);

            IF v_stock_actual > 0 THEN
                UPDATE stock
                SET stock_actual = stock_actual + v_cantidad
                WHERE id_tienda = p_id_tienda 
                AND id_producto = v_producto_id;
            ELSE
                INSERT INTO stock(id_tienda, id_producto, stock_actual, stock_minimo)
                VALUES(p_id_tienda, v_producto_id, v_cantidad, 0)
                ON CONFLICT (id_tienda, id_producto) 
                DO UPDATE SET stock_actual = stock_actual + v_cantidad;
            END IF;

            v_contador := v_contador + 1;
        END LOOP;

        p_success := TRUE;
        p_total_detalles := v_contador;
        p_message := 'Compra registrada correctamente con ID: ' || p_id_compra || ' y ' || v_contador || ' detalles';

    EXCEPTION WHEN OTHERS THEN
        p_success := FALSE;
        p_message := 'Error en registro de compra: ' || SQLERRM;
        p_id_compra := NULL;
        p_total_detalles := 0;
    END;
END;
$$;

-- ========================================================================
-- 3) REGISTRAR VENTA CON TRANSACCIÓN SEGURA Y VALIDACIÓN DE STOCK
-- ========================================================================
CREATE OR REPLACE PROCEDURE pa_registrar_venta_segura(
    OUT p_id_venta INTEGER,
    OUT p_total_venta DECIMAL(10,2),
    OUT p_success BOOLEAN,
    OUT p_message TEXT,
    OUT p_total_detalles INTEGER,
    p_id_usuario INTEGER,
    p_id_sesion INTEGER,
    p_id_metodo_pago INTEGER,
    p_id_tienda INTEGER,
    p_detalles JSON,
    p_id_estatus INTEGER DEFAULT 1
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_detalle JSON;
    v_producto_id INTEGER;
    v_cantidad INTEGER;
    v_precio_unitario DECIMAL(10,2);
    v_stock_actual INTEGER;
    v_contador INTEGER := 0;
    v_array_length INTEGER;
BEGIN
    p_success := FALSE;
    p_message := '';
    p_id_venta := NULL;
    p_total_venta := 0;
    p_total_detalles := 0;

    BEGIN
        -- Validaciones iniciales
        IF NOT EXISTS(SELECT 1 FROM usuarios WHERE id_usuario = p_id_usuario) THEN
            RAISE EXCEPTION 'El usuario especificado no existe';
        END IF;

        IF NOT EXISTS(SELECT 1 FROM metodos_pago WHERE id_metodo_pago = p_id_metodo_pago) THEN
            RAISE EXCEPTION 'El método de pago especificado no existe';
        END IF;

        IF NOT EXISTS(SELECT 1 FROM tiendas WHERE id_tienda = p_id_tienda) THEN
            RAISE EXCEPTION 'La tienda especificada no existe';
        END IF;

        v_array_length := json_array_length(p_detalles);
        IF v_array_length IS NULL OR v_array_length = 0 THEN
            RAISE EXCEPTION 'Debe proporcionar al menos un detalle de venta';
        END IF;

        -- Validar productos y stock antes de hacer cambios
        FOR v_detalle IN SELECT json_array_elements(p_detalles)
        LOOP
            v_producto_id := (v_detalle->>'producto_id')::INTEGER;
            v_cantidad := (v_detalle->>'cantidad')::INTEGER;

            IF NOT EXISTS(SELECT 1 FROM productos WHERE id_producto = v_producto_id) THEN
                RAISE EXCEPTION 'El producto % no existe', v_producto_id;
            END IF;

            v_stock_actual := COALESCE((
                SELECT stock_actual FROM stock 
                WHERE id_tienda = p_id_tienda 
                AND id_producto = v_producto_id 
                FOR UPDATE
            ), 0);

            IF v_stock_actual < v_cantidad THEN
                RAISE EXCEPTION 'Stock insuficiente para producto %. Disponible: %, Solicitado: %', 
                    v_producto_id, v_stock_actual, v_cantidad;
            END IF;
        END LOOP;

        -- Establecer ID de tienda en sesión para los triggers
        PERFORM set_config('app.id_tienda', p_id_tienda::TEXT, false);

        -- Insertar venta
        INSERT INTO ventas(
            id_usuario,
            id_sesion,
            id_metodo_pago,
            id_tienda,
            id_estatus
        )
        VALUES(
            p_id_usuario,
            p_id_sesion,
            p_id_metodo_pago,
            p_id_tienda,
            p_id_estatus
        )
        RETURNING id_venta INTO p_id_venta;

        -- Procesar detalles
        FOR v_detalle IN SELECT json_array_elements(p_detalles)
        LOOP
            v_producto_id := (v_detalle->>'producto_id')::INTEGER;
            v_cantidad := (v_detalle->>'cantidad')::INTEGER;

            -- Obtener precio actual
            SELECT precio_unitario INTO v_precio_unitario
            FROM productos 
            WHERE id_producto = v_producto_id 
            FOR UPDATE;

            -- Insertar detalle de venta
            INSERT INTO detalle_ventas(
                venta_id,
                producto_id,
                cantidad,
                precio_unitario
            )
            VALUES(
                p_id_venta,
                v_producto_id,
                v_cantidad,
                v_precio_unitario
            );

            -- Sumar al total
            p_total_venta := p_total_venta + (v_cantidad * v_precio_unitario);

            -- Actualizar stock
            UPDATE stock
            SET stock_actual = stock_actual - v_cantidad
            WHERE id_tienda = p_id_tienda 
            AND id_producto = v_producto_id;

            v_contador := v_contador + 1;
        END LOOP;

        p_success := TRUE;
        p_total_detalles := v_contador;
        p_message := 'Venta registrada correctamente con ID: ' || p_id_venta || 
                    ', Total: $' || to_char(p_total_venta, 'FM999,999.00') || ', Detalles: ' || v_contador;

    EXCEPTION WHEN OTHERS THEN
        p_success := FALSE;
        p_message := 'Error en registro de venta: ' || SQLERRM;
        p_id_venta := NULL;
        p_total_venta := 0;
        p_total_detalles := 0;
    END;
END;
$$;

-- ========================================================================
-- 4) CREAR PRODUCTO CON TRANSACCIÓN SEGURA
-- ========================================================================
CREATE OR REPLACE PROCEDURE pa_crear_producto_seguro(
    OUT p_id_producto INTEGER,
    OUT p_success BOOLEAN,
    OUT p_message TEXT,
    p_id_medida INTEGER,
    p_id_unidad INTEGER,
    p_id_subcategoria INTEGER,
    p_nombre VARCHAR,
    p_precio_base DECIMAL,
    p_precio_unitario DECIMAL,
    p_codigo_barras VARCHAR,
    p_imagen_url TEXT,
    p_id_estatus INTEGER DEFAULT 1
)
LANGUAGE plpgsql
AS $$
DECLARE
    existe_producto INTEGER;
    existe_codigo_barras INTEGER;
BEGIN
    p_success := FALSE;
    p_message := '';
    p_id_producto := NULL;

    BEGIN
        -- Validaciones
        IF NOT EXISTS(SELECT 1 FROM medidas WHERE id_medida = p_id_medida) THEN
            RAISE EXCEPTION 'La medida especificada no existe';
        END IF;

        IF NOT EXISTS(SELECT 1 FROM unidades_medida WHERE id_unidad = p_id_unidad) THEN
            RAISE EXCEPTION 'La unidad especificada no existe';
        END IF;

        IF NOT EXISTS(SELECT 1 FROM subcategorias WHERE id_subcategoria = p_id_subcategoria) THEN
            RAISE EXCEPTION 'La subcategoría especificada no existe';
        END IF;

        SELECT COUNT(*) INTO existe_producto
        FROM productos
        WHERE LOWER(nombre) = LOWER(p_nombre)
        AND id_subcategoria = p_id_subcategoria;

        IF existe_producto > 0 THEN
            RAISE EXCEPTION 'El producto ya existe en esta subcategoría';
        END IF;

        IF p_codigo_barras IS NOT NULL THEN
            SELECT COUNT(*) INTO existe_codigo_barras
            FROM productos
            WHERE codigo_barras = p_codigo_barras;

            IF existe_codigo_barras > 0 THEN
                RAISE EXCEPTION 'El código de barras ya está registrado';
            END IF;
        END IF;

        IF p_precio_base <= 0 OR p_precio_unitario <= 0 THEN
            RAISE EXCEPTION 'Los precios deben ser mayores a 0';
        END IF;

        -- Insertar producto
        INSERT INTO productos(
            id_medida,
            id_unidad,
            id_subcategoria,
            nombre,
            precio_base,
            precio_unitario,
            codigo_barras,
            imagen_url,
            id_estatus
        )
        VALUES(
            p_id_medida,
            p_id_unidad,
            p_id_subcategoria,
            p_nombre,
            p_precio_base,
            p_precio_unitario,
            p_codigo_barras,
            p_imagen_url,
            p_id_estatus
        )
        RETURNING id_producto INTO p_id_producto;

        p_success := TRUE;
        p_message := 'Producto creado correctamente con ID: ' || p_id_producto;

    EXCEPTION WHEN OTHERS THEN
        p_success := FALSE;
        p_message := 'Error en creación de producto: ' || SQLERRM;
        p_id_producto := NULL;
    END;
END;
$$;

-- ========================================================================
-- 5) ACTUALIZAR PRODUCTO CON TRANSACCIÓN SEGURA
-- ========================================================================
CREATE OR REPLACE PROCEDURE pa_actualizar_producto_seguro(
    OUT p_success BOOLEAN,
    OUT p_message TEXT,
    p_id_producto INTEGER,
    p_nombre VARCHAR,
    p_precio_base DECIMAL,
    p_precio_unitario DECIMAL,
    p_codigo_barras VARCHAR,
    p_imagen_url TEXT,
    p_id_estatus INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_subcategoria INTEGER;
    existe_producto INTEGER;
BEGIN
    p_success := FALSE;
    p_message := '';

    BEGIN
        -- Validar que existe el producto
        SELECT id_subcategoria INTO v_id_subcategoria
        FROM productos
        WHERE id_producto = p_id_producto;

        IF v_id_subcategoria IS NULL THEN
            RAISE EXCEPTION 'El producto no existe';
        END IF;

        -- Validar nombre único
        SELECT COUNT(*) INTO existe_producto
        FROM productos
        WHERE LOWER(nombre) = LOWER(p_nombre)
        AND id_subcategoria = v_id_subcategoria
        AND id_producto != p_id_producto;

        IF existe_producto > 0 THEN
            RAISE EXCEPTION 'El nombre del producto ya existe en esta subcategoría';
        END IF;

        -- Validar precios
        IF p_precio_base <= 0 OR p_precio_unitario <= 0 THEN
            RAISE EXCEPTION 'Los precios deben ser mayores a 0';
        END IF;

        -- Actualizar producto
        UPDATE productos
        SET
            nombre = p_nombre,
            precio_base = p_precio_base,
            precio_unitario = p_precio_unitario,
            codigo_barras = p_codigo_barras,
            imagen_url = p_imagen_url,
            id_estatus = p_id_estatus
        WHERE id_producto = p_id_producto;

        p_success := TRUE;
        p_message := 'Producto actualizado correctamente';

    EXCEPTION WHEN OTHERS THEN
        p_success := FALSE;
        p_message := 'Error en actualización de producto: ' || SQLERRM;
    END;
END;
$$;
