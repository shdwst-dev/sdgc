
--                                                     1) Crear usuario                                          --
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

--                                   2) Registrar compra                                          --
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

    -- Crear compra
    INSERT INTO compras (
        id_proveedor,
        id_estatus,
        fecha_hora
    )
    VALUES (
        p_id_proveedor,
        p_id_estatus,
        CURRENT_TIMESTAMP
    )
    RETURNING compras.id_compra INTO id_compra;

    -- Recorrer productos comprados
    FOREACH detalle IN ARRAY p_detalles
    LOOP

        -- Insertar detalle
        INSERT INTO detalle_compras (
            id_compra,
            producto_id,
            cantidad,
            precio_compra
        )
        VALUES (
            id_compra,
            detalle.producto_id,
            detalle.cantidad,
            detalle.precio_compra
        );

        -- Actualizar o crear stock
        IF EXISTS (
            SELECT 1
            FROM stock
            WHERE stock.id_tienda = p_id_tienda
            AND stock.id_producto = detalle.producto_id
        ) THEN

            UPDATE stock
            SET stock_actual = stock.stock_actual + detalle.cantidad
            WHERE stock.id_tienda = p_id_tienda
            AND stock.id_producto = detalle.producto_id;

        ELSE

            INSERT INTO stock (
                id_tienda,
                id_producto,
                stock_actual
            )
            VALUES (
                p_id_tienda,
                detalle.producto_id,
                detalle.cantidad
            );

        END IF;

    END LOOP;

END;
$$;

-- TYPE para ventas --
CREATE TYPE detalle_venta_type AS (
    producto_id INTEGER,
    cantidad INTEGER
);

--                                             3) Registrar venta                                                 --
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
    precio_producto DECIMAL(10,2);
    stock_actual INTEGER;
    id_comprobante INTEGER;
    correlativo INTEGER;
BEGIN

    -- Crear venta
    INSERT INTO ventas (
        id_usuario,
        id_sesion,
        id_metodo_pago,
        id_estatus,
        fecha_hora
    )
    VALUES (
        p_id_usuario,
        p_id_sesion,
        p_id_metodo_pago,
        p_id_estatus,
        CURRENT_TIMESTAMP
    )
    RETURNING ventas.id_venta INTO id_venta;

    -- Recorrer productos vendidos
    FOREACH detalle IN ARRAY p_detalles
    LOOP

        -- Obtener precio actual
        SELECT productos.precio_unitario
        INTO precio_producto
        FROM productos
        WHERE productos.id_producto = detalle.producto_id;

        -- Verificar stock
        SELECT stock.stock_actual
        INTO stock_actual
        FROM stock
        WHERE stock.id_tienda = p_id_tienda
        AND stock.id_producto = detalle.producto_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION
            'Producto % no tiene stock en la tienda %',
            detalle.producto_id,
            p_id_tienda;
        END IF;

        IF stock_actual < detalle.cantidad THEN
            RAISE EXCEPTION
            'Stock insuficiente para producto % (disponible %, requerido %)',
            detalle.producto_id,
            stock_actual,
            detalle.cantidad;
        END IF;

        -- Insertar detalle
        INSERT INTO detalle_ventas (
            venta_id,
            producto_id,
            cantidad,
            precio_unitario
        )
        VALUES (
            id_venta,
            detalle.producto_id,
            detalle.cantidad,
            precio_producto
        );

        -- Descontar stock
        UPDATE stock
        SET stock_actual = stock.stock_actual - detalle.cantidad
        WHERE stock.id_tienda = p_id_tienda
        AND stock.id_producto = detalle.producto_id;

    END LOOP;

    -- Generar comprobante
    SELECT nextval('seq_comprobante_correlativo')
    INTO correlativo;

    INSERT INTO comprobantes (
        id_venta,
        id_estatus,
        codigo_hash,
        numero_correlativo
    )
    VALUES (
        id_venta,
        p_id_estatus,
        encode(gen_random_bytes(16), 'hex'),
        correlativo
    )
    RETURNING comprobantes.id_comprobante INTO id_comprobante;

END;
$$;