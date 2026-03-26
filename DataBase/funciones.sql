--           1) Crear usuario           --
CREATE OR REPLACE PROCEDURE pa_registrar_usuario( 
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

    -- Validar email existente
    SELECT COUNT(*)
    INTO existe_email
    FROM usuarios
    WHERE email = p_email;

    IF existe_email > 0 THEN
        RAISE EXCEPTION 'El email ya está registrado';
    END IF;

    -- Validar telefono existente
    SELECT COUNT(*)
    INTO existe_telefono
    FROM personas
    WHERE telefono = p_telefono;

    IF existe_telefono > 0 THEN
        RAISE EXCEPTION 'El telefono ya está registrado';
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
    );

    COMMIT;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END;
$$;

-- Type para compras --
CREATE TYPE detalle_compra_type AS (
    producto_id INTEGER,
    cantidad INTEGER,
    precio_compra DECIMAL(10,2)
);

-- Correlativo --
CREATE SEQUENCE seq_comprobante_correlativo START 1;

--     2) Registrar compra       --
CREATE OR REPLACE PROCEDURE pa_registrar_compra(
    p_id_proveedor INTEGER,
    p_id_tienda INTEGER,
    p_detalles detalle_compra_type[],
    p_id_estatus INTEGER DEFAULT 1
)
LANGUAGE plpgsql
AS $$
DECLARE
    id_compra INTEGER;
    detalle detalle_compra_type;
BEGIN

    PERFORM set_config('app.id_tienda', p_id_tienda::TEXT, false);

    INSERT INTO compras(
        id_proveedor,
        id_estatus
    )
    VALUES(
        p_id_proveedor,
        p_id_estatus
    )
    RETURNING id_compra INTO id_compra;

    FOREACH detalle IN ARRAY p_detalles
    LOOP

        INSERT INTO detalle_compras(
            id_compra,
            producto_id,
            cantidad,
            precio_compra
        )
        VALUES(
            id_compra,
            detalle.producto_id,
            detalle.cantidad,
            detalle.precio_compra
        );

    END LOOP;

END;
$$;

-- TYPE para ventas --
CREATE TYPE detalle_venta_type AS (
    producto_id INTEGER,
    cantidad INTEGER
);

--    3) Registrar venta    --
CREATE OR REPLACE PROCEDURE pa_registrar_venta(
    p_id_usuario INTEGER,
    p_id_sesion INTEGER,
    p_id_metodo_pago INTEGER,
    p_id_tienda INTEGER,
    p_detalles detalle_venta_type[],
    p_id_estatus INTEGER DEFAULT 1
)
LANGUAGE plpgsql
AS $$
DECLARE
    id_venta INTEGER;
    detalle detalle_venta_type;
    precio_producto DECIMAL;
BEGIN

    PERFORM set_config('app.id_tienda', p_id_tienda::TEXT, false);

    INSERT INTO ventas(
        id_usuario,
        id_sesion,
        id_metodo_pago,
        id_estatus
    )
    VALUES(
        p_id_usuario,
        p_id_sesion,
        p_id_metodo_pago,
        p_id_estatus
    )
    RETURNING id_venta INTO id_venta;

    FOREACH detalle IN ARRAY p_detalles
    LOOP

        SELECT precio_unitario
        INTO precio_producto
        FROM productos
        WHERE id_producto = detalle.producto_id;

        INSERT INTO detalle_ventas(
            venta_id,
            producto_id,
            cantidad,
            precio_unitario
        )
        VALUES(
            id_venta,
            detalle.producto_id,
            detalle.cantidad,
            precio_producto
        );

    END LOOP;

END;
$$;

--   4) Crear producto   --
CREATE OR REPLACE PROCEDURE pa_crear_producto(
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
BEGIN

    SELECT COUNT(*)
    INTO existe_producto
    FROM productos
    WHERE nombre = p_nombre
    AND id_subcategoria = p_id_subcategoria;

    IF existe_producto > 0 THEN
        RAISE EXCEPTION 'El producto ya existe en esta subcategoria';
    END IF;

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
    );

END;
$$;

-- 5) Borrar producto --
CREATE OR REPLACE PROCEDURE pa_eliminar_producto(
    p_id_producto INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN

    IF NOT EXISTS(
        SELECT 1 FROM productos
        WHERE id_producto = p_id_producto
    ) THEN
        RAISE EXCEPTION 'El producto no existe';
    END IF;

    UPDATE productos
    SET id_estatus = 2
    WHERE id_producto = p_id_producto;

END;
$$;

-- 6) Actualizar producto --
CREATE OR REPLACE PROCEDURE pa_actualizar_producto(
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
BEGIN

    IF NOT EXISTS(
        SELECT 1 FROM productos
        WHERE id_producto = p_id_producto
    ) THEN
        RAISE EXCEPTION 'El producto no existe';
    END IF;

    UPDATE productos
    SET
        nombre = p_nombre,
        precio_base = p_precio_base,
        precio_unitario = p_precio_unitario,
        codigo_barras = p_codigo_barras,
        imagen_url = p_imagen_url,
        id_estatus = p_id_estatus
    WHERE id_producto = p_id_producto;

END;
$$;

-- 7) Actualizar Stock --
CREATE OR REPLACE FUNCTION fn_actualizar_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    tienda INTEGER;
BEGIN

    IF TG_TABLE_NAME = 'detalle_compras' THEN

        tienda := current_setting('app.id_tienda')::INTEGER;

        IF EXISTS(
            SELECT 1
            FROM stock
            WHERE id_tienda = tienda
            AND id_producto = NEW.producto_id
        ) THEN

            UPDATE stock
            SET stock_actual = stock_actual + NEW.cantidad
            WHERE id_tienda = tienda
            AND id_producto = NEW.producto_id;

        ELSE

            INSERT INTO stock(
                id_tienda,
                id_producto,
                stock_actual
            )
            VALUES(
                tienda,
                NEW.producto_id,
                NEW.cantidad
            );

        END IF;

    END IF;


    IF TG_TABLE_NAME = 'detalle_ventas' THEN

        tienda := current_setting('app.id_tienda')::INTEGER;

        UPDATE stock
        SET stock_actual = stock_actual - NEW.cantidad
        WHERE id_tienda = tienda
        AND id_producto = NEW.producto_id;

    END IF;

    RETURN NEW;
END;
$$;

-- 8) Validar stock --
CREATE OR REPLACE FUNCTION fn_validar_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    stock_actual INTEGER;
    tienda INTEGER;
BEGIN

    tienda := current_setting('app.id_tienda')::INTEGER;

    SELECT stock_actual
    INTO stock_actual
    FROM stock
    WHERE id_tienda = tienda
    AND id_producto = NEW.producto_id;

    IF stock_actual < NEW.cantidad THEN
        RAISE EXCEPTION
        'Stock insuficiente para producto %',
        NEW.producto_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Triggers --

CREATE TRIGGER tr_actualizar_stock_compra
AFTER INSERT ON detalle_compras
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_stock();

CREATE TRIGGER tr_actualizar_stock_venta
AFTER INSERT ON detalle_ventas
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_stock();

CREATE TRIGGER tr_validar_stock
BEFORE INSERT ON detalle_ventas
FOR EACH ROW
EXECUTE FUNCTION fn_validar_stock();
