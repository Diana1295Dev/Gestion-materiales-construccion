-- Crear Database InventarioConstruccion
CREATE DATABASE InventarioConstruccion;
GO

--- 2. CREAR TABLA DE DIMENSIÓN: dim_Tiempo
CREATE TABLE  dim_Tiempo (
fecha_id INT PRIMARY KEY,
fecha DATE NOT NULL UNIQUE,
dia INT NOT NULL,
mes INT NOT NULL,
anio INT NOT NULL,
trimestre INT NOT NULL,
semana INT NOT NULL,
nombre_mes VARCHAR(20) NOT NULL,
nombre_dia VARCHAR(20) NOT NULL
);

-- 3. CREAR TABLA DE DIMENSIÓN: dim_Obras

CREATE TABLE dim_Obras (
    obra_id INT PRIMARY KEY IDENTITY(1,1),
    nombre_obra VARCHAR(150) NOT NULL,
    ubicacion VARCHAR(150) NOT NULL,
    ciudad VARCHAR(50) NOT NULL,
    presupuesto_total DECIMAL(15, 2) NOT NULL,
    estado VARCHAR(20) NOT NULL,  -- activa, completada, suspendida
    fecha_inicio DATE NOT NULL,
    fecha_cierre DATE NULL,
    responsable VARCHAR(100),
    fecha_creacion DATETIME DEFAULT GETDATE()
);
 
-- 4. CREAR TABLA DE DIMENSIÓN: dim_Materiales
CREATE TABLE dim_Materiales (
    material_id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(120) NOT NULL,
    unidad VARCHAR(20) NOT NULL,  -- kg, m3, unidad, bolsa, litro
    costo_unitario DECIMAL(10, 2) NOT NULL,
    categoria VARCHAR(50) NOT NULL,  -- Estructural, Acabados, Fundación,Instalaciones, Herramientas
    stock_minimo INT DEFAULT 0,
    stock_maximo INT DEFAULT 1000,
    descripcion VARCHAR(200),
    fecha_creacion DATETIME DEFAULT GETDATE()
);
 

-- 5. CREAR TABLA DE HECHOS: FACT_Movimientos
CREATE TABLE FACT_Movimientos (
    movimiento_id INT PRIMARY KEY IDENTITY(1,1),
    obra_id INT NOT NULL,
    material_id INT NOT NULL,
    fecha_id INT NOT NULL,
    cantidad DECIMAL(10, 2) NOT NULL,
    tipo_movimiento VARCHAR(10) NOT NULL,  -- ENTRADA o SALIDA
    costo_unitario DECIMAL(10, 2) NOT NULL,
    costo_total DECIMAL(15, 2) NOT NULL,
    observaciones VARCHAR(255),
    lote VARCHAR(50),
    fecha_registro DATETIME DEFAULT GETDATE(),
    -- Foreign Keys
    CONSTRAINT FK_Movimientos_Obra FOREIGN KEY (obra_id) REFERENCES dim_Obras(obra_id),
    CONSTRAINT FK_Movimientos_Material FOREIGN KEY (material_id) REFERENCES dim_Materiales(material_id),
    CONSTRAINT FK_Movimientos_Tiempo FOREIGN KEY (fecha_id) REFERENCES dim_Tiempo(fecha_id)
);
 
-- 6. CREAR ÍNDICES

CREATE INDEX IX_FACT_Movimientos_obra ON FACT_Movimientos(obra_id);
CREATE INDEX IX_FACT_Movimientos_material ON FACT_Movimientos(material_id);
CREATE INDEX IX_FACT_Movimientos_fecha ON FACT_Movimientos(fecha_id);
CREATE INDEX IX_FACT_Movimientos_tipo ON FACT_Movimientos(tipo_movimiento);