/*
class NombreDeLaClase {
  constructor(propiedad1, propiedad2) {
    this.propiedad1 = propiedad1
    this.propiedad2 = propiedad2
  }

  metodo1() {
    // código del método 1
  }
}
*/
class Usuario {
    constructor(id, nombre,correo, contrasena, rol, estado, sesionActiva){
        this.id = id;
        this.nombre = nombre;
        this.correo = correo;
        this.contrasena = contrasena;
        this.rol = rol;
        this.estado = estado;
        this.sesionActiva = sesionActiva;
    }

    iniciarSesion(correoIngresado, contrasenaIngresada) {
        if (this.estado === 'inactivo') {
            return 'Usuario Inactivo.';
        } 
        
        if(this.correo !== correoIngresado){
            return "Por favor revisar correo o contrasena."
        }
        
        if(this.contrasena !== contrasenaIngresada){
            return "Por favor revisar correo o contrasena."
        }

        this.sesionActiva = true;
        return 'Inicio de sesión exitoso.';
    }

    cerrarSesion() {
        if(!this.sesionActiva){
            return 'No hay sesion activa para cerrar.';
        }
        this.sesionActiva = false;
        return 'Sesión cerrada exitosamente.';
    }

    cambiarEstado(nuevoEstado) {
        const estadosPermitidos = ['activo', 'inactivo'];

        if (!estadosPermitidos.includes(nuevoEstado)){
            return "Estado no valido."
        }
        if(this.estado === nuevoEstado){
            return `El usuario ya se encuentra en estado ${nuevoEstado}.`
        }
        
        this.estado = nuevoEstado;
        return `Estado actualizado a "${nuevoEstado}" exitosamente.`;
    }

}

class Clinica {
    static ESTADOS = ["activa", "inactiva"];

    constructor(id, nombre, direccion, telefono, horaApertura, horaCierre, diasLaborales, estado) {
        this.id = id;
        this.nombre = nombre;
        this.direccion = direccion;
        this.telefono = telefono;
        this.horaApertura = horaApertura;
        this.horaCierre = horaCierre;
        this.diasLaborales = diasLaborales;
        this.estado = estado;
    }

    estaActiva() {
        return this.estado === "activa";
    }

    validarDatosClinica() {
        if (!this.nombre || !this.direccion || !this.telefono || !this.horaApertura || !this.horaCierre || !this.estado) {
            return { ok: false, msg: "Faltan datos obligatorios de la clinica." };
        }

        if (!Array.isArray(this.diasLaborales) || this.diasLaborales.length === 0) {
            return { ok: false, msg: "Debe indicar al menos un dia laboral." };
        }

        if (!Clinica.ESTADOS.includes(this.estado)) {
            return { ok: false, msg: "El estado de la clinica no es valido." };
        }

        return this.validarHorarioLaboral();
    }

    validarHorarioLaboral() {
        if (!this.horaApertura || !this.horaCierre) {
            return { ok: false, msg: "Debe indicar hora de apertura y hora de cierre." };
        }

        if (this.horaCierre <= this.horaApertura) {
            return { ok: false, msg: "La hora de cierre debe ser posterior a la hora de apertura." };
        }

        return { ok: true, msg: "Horario laboral valido." };
    }

    estaDentroDelHorarioLaboral(fecha, horaInicio, horaFin) {
        if (!this.estaActiva()) {
            return { ok: false, msg: "La clinica no esta activa." };
        }

        if (!fecha || !horaInicio || !horaFin) {
            return { ok: false, msg: "Debe indicar fecha, hora de inicio y hora de fin." };
        }

        if (horaFin <= horaInicio) {
            return { ok: false, msg: "La hora de fin debe ser posterior a la hora de inicio." };
        }

        if (horaInicio < this.horaApertura || horaFin > this.horaCierre) {
            return {
                ok: false,
                msg: `La reserva debe estar entre ${this.horaApertura} y ${this.horaCierre}.`
            };
        }

        return { ok: true, msg: "La reserva esta dentro del horario laboral." };
    }

    puedeRecibirReserva(reserva) {
        if (!reserva) {
            return { ok: false, msg: "Debe proporcionar una reserva." };
        }

        return this.estaDentroDelHorarioLaboral(
            reserva.fecha,
            reserva.horaInicio,
            reserva.horaFin
        );
    }

    actualizarDatos(nuevoNombre, nuevaDireccion, nuevoTelefono) {
        if (!nuevoNombre || !nuevaDireccion || !nuevoTelefono) {
            return { ok: false, msg: "Debe completar los datos generales de la clinica." };
        }

        this.nombre = nuevoNombre;
        this.direccion = nuevaDireccion;
        this.telefono = nuevoTelefono;

        return { ok: true, msg: "Datos de la clinica actualizados correctamente." };
    }

    actualizarHorario(nuevaHoraApertura, nuevaHoraCierre, nuevosDiasLaborales) {
        if (!nuevaHoraApertura || !nuevaHoraCierre || !Array.isArray(nuevosDiasLaborales)) {
            return { ok: false, msg: "Debe completar el horario laboral de la clinica." };
        }

        this.horaApertura = nuevaHoraApertura;
        this.horaCierre = nuevaHoraCierre;
        this.diasLaborales = nuevosDiasLaborales;

        return this.validarHorarioLaboral();
    }

    cambiarEstado(nuevoEstado) {
        if (!Clinica.ESTADOS.includes(nuevoEstado)) {
            return { ok: false, msg: "Estado no permitido." };
        }

        if (this.estado === nuevoEstado) {
            return { ok: false, msg: `La clinica ya tiene el estado ${this.estado}.` };
        }

        this.estado = nuevoEstado;

        return { ok: true, msg: `El nuevo estado de la clinica es ${this.estado}.` };
    }
}


class Sala {
    static ESTADOS = ["activa", "inactiva", "mantenimiento", "eliminada"];

    constructor(id, nombre, tipo, descripcion, estado, capacidad, disponibilidad) {
        this.id = id;
        this.nombre = nombre;
        this.tipo = tipo;
        this.descripcion = descripcion;
        this.estado = estado;
        this.capacidad = capacidad;
        this.disponibilidad = disponibilidad;
    }

    actualizarSala(nuevoNombre, nuevoTipo, nuevaDescripcion, nuevaCapacidad, nuevaDisponibilidad) {
        if (this.estado === "inactiva") {
            return { ok: false, msg: `La sala ${this.nombre} está inactiva.` };
        }

        if (!nuevoNombre || !nuevoTipo || !nuevaDescripcion || !nuevaCapacidad || nuevaDisponibilidad === undefined) {
            return { ok: false, msg: "Por favor llene todos los campos." };
        }

        this.nombre = nuevoNombre;
        this.tipo = nuevoTipo;
        this.descripcion = nuevaDescripcion;
        this.capacidad = nuevaCapacidad;
        this.disponibilidad = nuevaDisponibilidad;

        return {
            ok: true,
            msg: `Datos de la sala ${this.nombre} actualizados correctamente.`
        };
    }

    cambiarEstado(nuevoEstado) {
        if (!nuevoEstado) {
            return { ok: false, msg: "Debe indicar el nuevo estado." };
        }

        if (!Sala.ESTADOS.includes(nuevoEstado)) {
            return { ok: false, msg: "Estado no permitido." };
        }

        if (this.estado === nuevoEstado) {
            return { ok: false, msg: `La sala ${this.nombre} ya tiene el estado ${this.estado}.` };
        }

        this.estado = nuevoEstado;

        return {
            ok: true,
            msg: `El nuevo estado de la sala ${this.nombre} es ${this.estado}.`
        };
    }

    estaActiva() {
        return this.estado === "activa";
    }

    estaDisponible() {
        return this.estado === "activa" && this.disponibilidad === true;
    }

    cambiarDisponibilidad() {
        if (!this.estaActiva()) {
            return { ok: false, msg: `La sala ${this.nombre} no está activa.` };
        }

        this.disponibilidad = !this.disponibilidad;

        return {
            ok: true,
            msg: `La disponibilidad de la sala ${this.nombre} ahora es ${this.disponibilidad}.`
        };
    }

    puedeReservarse() {
        if (!this.estaActiva()) {
            return { ok: false, msg: `La sala ${this.nombre} no está activa.` };
        }

        if (!this.estaDisponible()) {
            return { ok: false, msg: `La sala ${this.nombre} no está disponible.` };
        }

        return {
            ok: true,
            msg: `La sala ${this.nombre} puede reservarse.`
        };
    }

    validarCapacidad() {
        if (!this.capacidad || this.capacidad <= 0) {
            return { ok: false, msg: "Capacidad no válida." };
        }

        return { ok: true, msg: "Capacidad válida." };
    }

    validarDatosSala() {
        if (!this.nombre || !this.tipo || !this.descripcion) {
            return { ok: false, msg: "Faltan datos obligatorios de la sala." };
        }

        if (!this.capacidad || this.capacidad <= 0) {
            return { ok: false, msg: "La capacidad debe ser mayor que cero." };
        }

        if (!Sala.ESTADOS.includes(this.estado)) {
            return { ok: false, msg: "El estado actual de la sala no es válido." };
        }

        return { ok: true, msg: "Datos de la sala válidos." };
    }

    eliminarSala() {
        if (!this.estaActiva()) {
            return {
                ok: false,
                msg: `La sala ${this.nombre} no esta activa.`
            };
        }

        this.estado = "eliminada";
        this.disponibilidad = false;

        return {
            ok: true,
            msg: `La sala ${this.nombre} fue eliminada correctamente.`
        };
    }

}


class Reserva {
    
    constructor(id, fecha, horaInicio, horaFin, descripcion, estado, salaId, pacienteNombre, tipoConsulta){
        this.id = id;
        this.fecha = fecha;
        this.horaInicio = horaInicio;
        this.horaFin = horaFin;
        this.descripcion = descripcion;
        this.estado = estado;
        this.salaId = salaId;
        this.pacienteNombre = pacienteNombre;
        this.tipoConsulta = tipoConsulta;
    }


    validarDatosReserva(){
        if(
            !this.id || 
            !this.fecha ||
            !this.horaInicio ||
            !this.horaFin ||
            !this.descripcion ||
            !this.estado ||
            !this.salaId ||
            !this.pacienteNombre ||
            !this.tipoConsulta)
            {
                 return{ok: false, msg: 'Por favor llene todos los campos.'}
        }

        return{
            ok: true, msg:'Reserva Hecha.'
        }
    }
    validarHorario(){

        if(!this.horaInicio || !this.horaFin){
            return{ok:false , msg:"Llene los campos de hora inicio y hora de fin."}
        }

        if(this.horaInicio >= this.horaFin) {
            return{
                ok: false, 
                msg: "Hora de Inicio no puede ser mayor que la hora de Proceso Finalizado"}
        }

        return { ok: true, msg: "Horario valido." };

    }
    
    estaActiva(){
        return this.estado === "activa";
    }

    usaSala(salaId){
        return this.salaId === salaId;
    }
    
    /*
    perteneceAUsuario(){

    }*/

    seSolapaCon(otraReserva){
        if(!otraReserva) {
            return false
        }
        if(this.id === otraReserva.id){
            return false;
        }

        if(!this.estaActiva()|| !otraReserva.estaActiva()) {
            return false;
        }

        if(this.fecha !== otraReserva.fecha){
            return false;
        }

        if (this.salaId !== otraReserva.salaId){
            return false;
        }

        return this.horaInicio < otraReserva.horaFin &&this.horaFin > otraReserva.horaInicio;


    }

    editarReserva(nfecha, nhoraInicio, nhoraFin, ndescripcion, nestado, nsalaId, npacienteNombre, ntipoConsulta){
        if(!nfecha || !nhoraInicio || !nhoraFin || !ndescripcion || !nestado || !nsalaId || !npacienteNombre || !ntipoConsulta){
            return{ok: false , msg: "Inserte todos los datos"}
        }

        this.fecha =nfecha;
        this.horaInicio =nhoraInicio;
        this.horaFin = nhoraFin;
        this.descripcion = ndescripcion;
        this.estado = nestado;
        this.salaId = nsalaId;
        this.pacienteNombre= npacienteNombre;
        this.tipoConsulta= ntipoConsulta;

        return { ok: true, msg: "Reserva editada correctamente." };
    }

}

class Paciente {
    constructor(id, nombre, fechaNacimiento, telefono, correo, observaciones, estado, tipoProcedimiento){
        this.id = id;
        this.nombre = nombre;
        this.fechaNacimiento = fechaNacimiento;
        this.telefono = telefono;
        this.correo = correo;
        this.observaciones = observaciones;
        this.estado = estado;
        this.tipoProcedimiento = tipoProcedimiento
    }

    validarDatosPaciente(){
        if(
        !this.id   ||
        !this.nombre  ||
        !this.fechaNacimiento ||
        !this.telefono  ||
        !this.correo  ||
        !this.observaciones ||
        !this.estado  ||
        !this.tipoProcedimiento
        ){
            return{
                ok:false, msg: "Debe llenar todos los datos del paciente."
            }
        }
        return {
            ok:true, msg: "Campos completos."
        }
    }

    estaActivo(){
            return this.estado === "activo"
        }

    actualizarDatos(nId, nNombre, nFechaNacimiento, nTelefono, nCorreo, nObservaciones, nEstado){
        if(
        !nId   ||
        !nNombre ||
        !nFechaNacimiento ||
        !nTelefono ||
        !nCorreo||
        !nObservaciones||
        !nEstado
        ){
            return{
                ok: false, msg: "Debe llenar todos los campos."
            }
        }
        
        this.id =nId
        this.nombre =nNombre
        this.fechaNacimiento =nFechaNacimiento
        this.telefono =nTelefono
        this.correo =nCorreo
        this.observaciones =nObservaciones
        this.estado=nEstado
        
        return { ok: true, msg: "Datos de la clinica actualizados correctamente." };

        }

    cambiarEstado(nEstado){
        const estadosPaciente = ["activo", "inactivo"];

        if(!estadosPaciente.includes(nEstado)){
            return {
                ok: false, msg: "Estado no permitido."
            }
        }

       if(this.estado === nEstado){
        return{
            ok: false, msg: "Este paciente ya tiene este estado."
            }
        }

        this.estado = nEstado;
        return{
            ok: true, msg: "Estado cambiado"
        }
    }
}

class HorarioDisponible {
    constructor(id, dia, salaId, fecha, horaInicio, horaFin, estado){
        this.id = id;
        this.dia = dia;
        this.salaId = salaId;
        this.fecha = fecha;
        this.horaInicio = horaInicio;
        this.horaFin = horaFin;
        this.estado = estado;
    }

    estaActivo(){
        return this.estado === "activo";
    }
    
    perteneceASala(consultaSala){
        return this.salaId === consultaSala;
    }

    coincideConFecha(consultaFecha){
        return this.fecha === consultaFecha;
        }

    contieneHorario(consultaHoraInicio, consultaHoraFin){
        if(!this.estaActivo()){
            return{
                ok: false, msg: "No activo."
            }
        }

        if (!consultaHoraInicio || !consultaHoraFin){
             return{
                ok: false, msg: "Llene los campos."
            }           
        }
        return this.horaInicio <= consultaHoraInicio && this.horaFin >= consultaHoraFin;

        }

    cambiarEstado(nuevoEstado){
        const estadosHorario = ["activo", "inactivo"]

        if(!estadosHorario.includes(nuevoEstado)){
            return{
                ok: false, msg: "Estado no permitido."
            }
        }

        if(this.estado === nuevoEstado){
            return{
                ok: false, msg: "Estado ya establecido."
            }
        }

        this.estado = nuevoEstado;
        return{
            ok: true, msg: "Estado establecido."
        }

        }
    validarHorarioDisponible(){
            
        }

}

export { Usuario, Clinica, Sala, Reserva, Paciente, HorarioDisponible };
