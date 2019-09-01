//= require jquery
//= require picker.js
//= require gentelella
//= require gmaps/google
//= require jquery.raty
//= require ratyrate
//= require qrcode-0.14.0
//= require bootstrap-datetimepicker
//= require cable
//= require underscore
//= require moment
//= require countdown.min
//= require moment-countdown

// Validates only number input
function validate(evt) {
	var theEvent = evt || window.event;

	if (theEvent.type === 'paste') {
		key = event.clipboardData.getData('text/plain');
	} else {
		var key = theEvent.keyCode || theEvent.which;
		key = String.fromCharCode(key);
	}
	var regex = /[0-9]|\./;
	if( !regex.test(key) ) {
		theEvent.returnValue = false;
		if(theEvent.preventDefault) theEvent.preventDefault();
	}
}

// Rut validator chile
function checkRut(rut) {
	var valor = rut.value.replace('.','');
	valor = valor.replace('-','');
	cuerpo = valor.slice(0,-1);
	dv = valor.slice(-1).toUpperCase();
	rut.value = cuerpo + '-'+ dv
	if(cuerpo.length > 13) { rut.setCustomValidity("RUT Incompleto"); return false;}

	suma = 0;
	multiplo = 2;
    
	for(i=1;i<=cuerpo.length;i++) {
		index = multiplo * valor.charAt(cuerpo.length - i);
		suma = suma + index;
		if(multiplo < 7) { multiplo = multiplo + 1; } else { multiplo = 2; }  
	}

	dvEsperado = 11 - (suma % 11);
	dv = (dv == 'K')?10:dv;
	dv = (dv == 0)?11:dv;
	if(dvEsperado != dv) { rut.setCustomValidity("RUT Inválido"); return false; }   
	rut.setCustomValidity('');
}

// Format price
function format(input){
	var num = input.value.replace(/\./g,'');
	if(!isNaN(num)){
	num = num.toString().split('').reverse().join('').replace(/(?=\d*\.?)(\d{3})/g,'$1.');
	num = num.split('').reverse().join('').replace(/^[\.]/,'');
	input.value = num;
	}
	else{ alert('Solo se adminten valores numericos');
	input.value = input.value.replace(/[^\d\.]*/g,'');
	}
}

// Password Match
var password = document.getElementById("password")
, confirm_password = document.getElementById("confirm_password");

function validatePassword(){
	if(password.value != confirm_password.value) {
		confirm_password.setCustomValidity("La contraseña no coincide");
	} else {
		confirm_password.setCustomValidity('');
	}
}

password.onchange = validatePassword;
confirm_password.onkeyup = validatePassword;