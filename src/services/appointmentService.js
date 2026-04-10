
export function puedeCrearReserva(nuevaReserva, reservasExistentes, clinica) {
    if (!nuevaReserva) {
        return {
            ok: false,
            msg: "Debe proporcionar una reserva."
        };
    }

    if (!Array.isArray(reservasExistentes)) {
        return {
            ok: false,
            msg: "Debe proporcionar una lista de reservas existentes."
        };
    }

    if (!clinica) {
        return {
            ok: false,
            msg: "Debe proporcionar la clinica."
        };
    }

    const horarioValido = nuevaReserva.validarHorario();

    if (!horarioValido.ok) {
        return horarioValido;
    }

    const clinicaDisponible = clinica.puedeRecibirReserva(nuevaReserva);

    if (!clinicaDisponible.ok) {
        return clinicaDisponible;
    }

    const hayChoque = reservasExistentes.some(reservaExistente =>
        nuevaReserva.seSolapaCon(reservaExistente)
    );

    if (hayChoque) {
        return {
            ok: false,
            msg: "La sala ya tiene una reserva en ese horario."
        };
    }

    return {
        ok: true,
        msg: "La reserva puede crearse."
    };
}

export function crearReserva(nuevaReserva, reservasExistentes, clinica){
    const validacion = puedeCrearReserva(nuevaReserva, reservasExistentes, clinica)
    if(!validacion.ok){
        return validacion
    }
    reservasExistentes.push(nuevaReserva)
    return {
        ok: true,
        msg: "Reserva creada correctamente.",
        data: nuevaReserva
    };
}

export function editarReserva(reservaId, nuevosDatos, reservasExistentes, clinica){
    const resultadoBusqueda = buscarReservaPorId(reservaId, reservasExistentes);

    if (!resultadoBusqueda.ok) {
        return resultadoBusqueda;
    }

    if (!nuevosDatos) {
        return {
            ok: false,
            msg: "Debe proporcionar los nuevos datos de la reserva."
        };
    }

    const reserva = resultadoBusqueda.data;

    const datosAnteriores = {
        fecha: reserva.fecha,
        horaInicio: reserva.horaInicio,
        horaFin: reserva.horaFin,
        descripcion: reserva.descripcion,
        estado: reserva.estado,
        salaId: reserva.salaId,
        pacienteNombre: reserva.pacienteNombre,
        tipoConsulta: reserva.tipoConsulta
    };

    reserva.editarReserva(
        nuevosDatos.fecha ?? reserva.fecha,
        nuevosDatos.horaInicio ?? reserva.horaInicio,
        nuevosDatos.horaFin ?? reserva.horaFin,
        nuevosDatos.descripcion ?? reserva.descripcion,
        nuevosDatos.estado ?? reserva.estado,
        nuevosDatos.salaId ?? reserva.salaId,
        nuevosDatos.pacienteNombre ?? reserva.pacienteNombre,
        nuevosDatos.tipoConsulta ?? reserva.tipoConsulta
    );

    const validacion = puedeCrearReserva(reserva, reservasExistentes, clinica);

    if (!validacion.ok) {
        reserva.fecha = datosAnteriores.fecha;
        reserva.horaInicio = datosAnteriores.horaInicio;
        reserva.horaFin = datosAnteriores.horaFin;
        reserva.descripcion = datosAnteriores.descripcion;
        reserva.estado = datosAnteriores.estado;
        reserva.salaId = datosAnteriores.salaId;
        reserva.pacienteNombre = datosAnteriores.pacienteNombre;
        reserva.tipoConsulta = datosAnteriores.tipoConsulta;

        return validacion;
    }

    return {
        ok: true,
        msg: "Reserva editada correctamente.",
        data: reserva
    };
}

export function eliminarReserva(reservaId, reservasExistentes){
    if (!Array.isArray(reservasExistentes)) {
        return {
            ok: false,
            msg: "Debe proporcionar una lista de reservas existentes."
        };
    }

    const indiceReserva = reservasExistentes.findIndex(
        reservaActual => reservaActual.id === reservaId
    );

    if (indiceReserva === -1) {
        return {
            ok: false,
            msg: "Reserva no encontrada."
        };
    }

    const [reservaEliminada] = reservasExistentes.splice(indiceReserva, 1);

    return {
        ok: true,
        msg: "Reserva eliminada correctamente.",
        data: reservaEliminada
    };
}


export function listarReservas(reservasExistentes){
    if(!Array.isArray(reservasExistentes)){
        return{
            ok: false,
            msg: "Debe proporcionar una lista de reservas existentes.",
            data: []
        }
    }

    return {
        ok: true,
        msg: "Reservas listadas correctamente.",
        data: reservasExistentes
    };
}

export function buscarReservaPorId(reservaId, reservasExistentes){
    if(!Array.isArray(reservasExistentes)){
        return{
            ok: false,
            msg: "Debe proporcionar una lista de reservas existentes."
        }
    }

    const reserva = reservasExistentes.find(reservaActual => reservaActual.id === reservaId);

    if (!reserva) {
        return {
            ok: false,
            msg: "Reserva no encontrada."
        };
    }

    return {
        ok: true,
        msg: "Reserva encontrada.",
        data: reserva
    };
}
