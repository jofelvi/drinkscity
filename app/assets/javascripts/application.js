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
  rut = String(rut);
  var valor = rut.replace(".", "").replace(".", "");
  valor = valor.replace("-", "");
  //cuerpo = valor.slice(0, -1);
  //dv = valor.slice(-1).toUpperCase();
  rut = cuerpo + "-" + dv;
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