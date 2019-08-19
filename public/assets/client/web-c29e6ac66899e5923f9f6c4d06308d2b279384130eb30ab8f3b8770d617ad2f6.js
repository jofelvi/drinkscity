
    $( document ).ready(function() {
      $('.grid').imagesLoaded(function(){
        $('.grid').masonry({
          itemSelector: '.grid-item',
        });
      });

      $(function() {
          $("form textarea").keypress(function (e) {
              if ((e.which && e.which == 13) || (e.keyCode && e.keyCode == 13)) {
                  $('#send-message-button').click();
                  return false;
              } else {
                  return true;
              }
          });
      });

    });

      var swiper = new Swiper('.swiper-container', {
        autoplay:2000,
        slidesPerView: 'auto',
        centeredSlides: false,
        speed:400,
        spaceBetween: 10
      });

      var swiper = new Swiper('.swiper-container2', {
        autoplay:2000,
        slidesPerView: 'auto',
        centeredSlides: false,
        speed:400,
        spaceBetween: 10
      });

      var swiper = new Swiper('.swiper-container3', {
        autoplay:2000,
        slidesPerView: 'auto',
        centeredSlides: false,
        speed:400,
        spaceBetween: 10
      });

    function countDownOfertas(){
        $( ".timerOfertas" ).each(function( index ) {
          var hora  = $( this ).data('hora');
            var da    = moment().format('YYYY-MM-DD');
            var tom   = moment(da+" "+hora).countdown();
            var hours = tom.hours;
            var min   = tom.minutes;
            var sec   = tom.seconds;
            if (hours < 10){ hours = '0'+hours; }
            if (min < 10){ min = '0'+min; }
            if (sec < 10){ sec = '0'+sec; }
            $(this).html(hours+":"+min+":"+sec)
      });
    }

    countDownOfertas();

      setInterval(function(){ countDownOfertas() }, 1000);

      // mostrar_distancias(user_location);
      mostrar_distancias({latitude: -33.448482, longitude: -70.598087});
function mostrar_distancias(user_location) {
  $( ".distanceTake" ).each(function( index ) {

    // console.log('user_location.latitud: '+ user_location.latitude);
    // console.log('user_location.longitud: '+ user_location.longitude);
    var lat2 =$( this ).data('latitude');
    var lon2 =$( this ).data('longitud');
    // console.log('lat2 del producto: '+ lat2);
    // console.log('lon2 del producto: '+ lon2);

    var d = getDistance(user_location.latitude, user_location.longitude, lat2, lon2);
    //console.log(d);
    var text = d + " km"
    $( this ).html(text);
  });
}

function init(){
  if(!checkGeolocationSupport()){
    alert("Lo sentimos, tu navegador no soporta la geolocalización.");
  }

  // map = setupMap();
  findWhereAmI();
}

function checkGeolocationSupport(){
  return navigator.geolocation;
}

function findWhereAmI(){
  navigator.geolocation.getCurrentPosition(onSuccessGeolocating,
                                           onErrorGeolocating,
                                           {
                                              enableHighAccuracy: true,
                                              maximumAge:         5000,
                                              timeout:            20000
                                           });
}


function onSuccessGeolocating(position){
  var userLocation = new google.maps.LatLng(position.coords.latitude,
                                              position.coords.longitude);

  var message = "I am here!\n\n" +
                "\tLatitude = " + position.coords.latitude + "\n" +
                "\tLongitude = " + position.coords.longitude;

    user_location = position.coords

    // console.log(user_location);
    // console.log(user_location.latitude);
    // console.log(user_location.longitude);

    mostrar_distancias(user_location);
}

function onErrorGeolocating(error){
  mostrar_distancias({latitude: -33.448482, longitude: -70.598087});
  switch(error.code){
    case error.PERMISSION_DENIED:
      // alert('ERROR: User denied access to track physical position!');
    break;

    case error.POSITION_UNAVAILABLE:
      // alert("ERROR: There is a problem getting the position of the device!");
    break;

    case error.TIMEOUT:
      // alert("ERROR: The application timed out trying to get the position of the device!");
    break;

    default:
      // alert("ERROR: Unknown problem!");
    break;
  }
}




function getDistance(lat1, lon1, lat2, lon2){
  // console.log('lat1: '+ lat1 );
  // console.log('lon1: '+ lon1 );
  // console.log('lat2: '+ lat2 );
  // console.log('lon2: '+ lon2 );
  var R = 6371; // km
  var dLat = (lat2-lat1) * Math.PI / 180;;
  var dLon = (lon2-lon1) * Math.PI / 180;;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180 ) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c;
  return Math.round(d,-1);
}


var user_location = 'hola mundo';
$(document).ready(function() {
  init();
});

function setMetaFacebook(image, title, type, url) {
  console.log('estas seteando las metas para el facebook');
  var metaImage = document.querySelector('meta[property="og:image"]')
  var metaTitle = document.querySelector('meta[property="og:title"]')
  var metaType = document.querySelector('meta[property="og:type"]')
  var metaUrl = document.querySelector('meta[property="og:url"]')

  metaImage.setAttribute('content', image);
  metaTitle.setAttribute('content', title);
  metaType.setAttribute('content', type);
  metaUrl.setAttribute('content', url);
}


/*
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var UserLocation = function UserLocation(callback) {
  var _this = this;

  _classCallCheck(this, UserLocation);

  if (navigator.geolocation) {

    navigator.geolocation.getCurrentPosition(function (localizacion) {
      _this.latitud = localizacion.coords.latitude;
      _this.longitud = localizacion.coords.longitude;
      callback();
    });
  } else {
    alert('asdasda');
  }
};

var user_location = new UserLocation(function(){});
*/
;
