
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS horarios_disponibles;
DROP TABLE IF EXISTS reservas;
DROP TABLE IF EXISTS pacientes;
DROP TABLE IF EXISTS salas;
DROP TABLE IF EXISTS clinicas;
DROP TABLE IF EXISTS usuarios;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- TABLA: usuarios
-- =========================================================
CREATE TABLE usuarios (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'activo',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_correo (correo),
    INDEX idx_usuarios_rol (rol),
    INDEX idx_usuarios_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TABLA: clinicas
-- =========================================================
CREATE TABLE clinicas (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(120) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    hora_apertura TIME NOT NULL,
    hora_cierre TIME NOT NULL,
    dias_laborales VARCHAR(100) NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'activa',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_clinicas_estado (estado),
    CONSTRAINT chk_clinicas_horario CHECK (hora_cierre > hora_apertura)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TABLA: salas
-- =========================================================
CREATE TABLE salas (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),
    estado VARCHAR(50) NOT NULL DEFAULT 'activa',
    capacidad INT UNSIGNED NOT NULL DEFAULT 1,
    disponibilidad VARCHAR(50) NOT NULL DEFAULT 'disponible',
    clinica_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_salas_clinica_id (clinica_id),
    INDEX idx_salas_estado (estado),
    INDEX idx_salas_disponibilidad (disponibilidad),
    CONSTRAINT fk_salas_clinica_id_clinicas
        FOREIGN KEY (clinica_id)
        REFERENCES clinicas(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,
    CONSTRAINT chk_salas_capacidad CHECK (capacidad >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TABLA: pacientes
-- =========================================================
CREATE TABLE pacientes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(120) NOT NULL,
    fecha_nacimiento DATE,
    telefono VARCHAR(20),
    correo VARCHAR(150),
    observaciones VARCHAR(255),
    estado VARCHAR(50) NOT NULL DEFAULT 'activo',
    tipo_procedimiento VARCHAR(100),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_pacientes_nombre (nombre),
    INDEX idx_pacientes_estado (estado),
    INDEX idx_pacientes_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TABLA: reservas
-- =========================================================
CREATE TABLE reservas (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    descripcion VARCHAR(255),
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    tipo_consulta VARCHAR(100),
    usuario_id INT UNSIGNED NOT NULL,
    paciente_id INT UNSIGNED NOT NULL,
    sala_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_reservas_usuario_id (usuario_id),
    INDEX idx_reservas_paciente_id (paciente_id),
    INDEX idx_reservas_sala_id (sala_id),
    INDEX idx_reservas_fecha (fecha),
    INDEX idx_reservas_estado (estado),
    INDEX idx_reservas_sala_fecha (sala_id, fecha),
    CONSTRAINT fk_reservas_usuario_id_usuarios
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,
    CONSTRAINT fk_reservas_paciente_id_pacientes
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,
    CONSTRAINT fk_reservas_sala_id_salas
        FOREIGN KEY (sala_id)
        REFERENCES salas(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,
    CONSTRAINT chk_reservas_horas CHECK (hora_fin > hora_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TABLA: horarios_disponibles
-- =========================================================
CREATE TABLE horarios_disponibles (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    dia_semana VARCHAR(15) NOT NULL,
    fecha DATE,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'disponible',
    sala_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_horarios_sala_id (sala_id),
    INDEX idx_horarios_fecha (fecha),
    INDEX idx_horarios_estado (estado),
    CONSTRAINT fk_horarios_disponibles_sala_id_salas
        FOREIGN KEY (sala_id)
        REFERENCES salas(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,
    CONSTRAINT chk_horarios_horas CHECK (hora_fin > hora_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;