!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e(require("./foundation.core"),require("jquery")):"function"==typeof define&&define.amd?define(["./foundation.core","jquery"],e):"object"==typeof exports?exports["foundation.util.timer"]=e(require("./foundation.core"),require("jquery")):(t.__FOUNDATION_EXTERNAL__=t.__FOUNDATION_EXTERNAL__||{},t.__FOUNDATION_EXTERNAL__["foundation.util.timer"]=e(t.__FOUNDATION_EXTERNAL__["foundation.core"],t.jQuery))}(window,function(n,r){return function(n){var r={};function o(t){if(r[t])return r[t].exports;var e=r[t]={i:t,l:!1,exports:{}};return n[t].call(e.exports,e,e.exports,o),e.l=!0,e.exports}return o.m=n,o.c=r,o.d=function(t,e,n){o.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n})},o.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},o.t=function(e,t){if(1&t&&(e=o(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(o.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var r in e)o.d(n,r,function(t){return e[t]}.bind(null,r));return n},o.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return o.d(e,"a",e),e},o.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},o.p="",o(o.s=27)}({"./foundation.core":function(t,e){t.exports=n},"./js/entries/plugins/foundation.util.timer.js":function(t,e,n){"use strict";n.r(e);var r=n("./foundation.core");n.d(e,"Foundation",function(){return r.Foundation});var o=n("./js/foundation.util.timer.js");n.d(e,"Timer",function(){return o.Timer}),r.Foundation.Timer=o.Timer},"./js/foundation.util.timer.js":function(t,e,n){"use strict";n.r(e),n.d(e,"Timer",function(){return r});n("jquery");function r(e,t,n){var r,o,i=this,u=t.duration,a=Object.keys(e.data())[0]||"timer",f=-1;this.isPaused=!1,this.restart=function(){f=-1,clearTimeout(o),this.start()},this.start=function(){this.isPaused=!1,clearTimeout(o),f=f<=0?u:f,e.data("paused",!1),r=Date.now(),o=setTimeout(function(){t.infinite&&i.restart(),n&&"function"==typeof n&&n()},f),e.trigger("timerstart.zf.".concat(a))},this.pause=function(){this.isPaused=!0,clearTimeout(o),e.data("paused",!0);var t=Date.now();f-=t-r,e.trigger("timerpaused.zf.".concat(a))}}},27:function(t,e,n){t.exports=n("./js/entries/plugins/foundation.util.timer.js")},jquery:function(t,e){t.exports=r}})});
//# sourceMappingURL=foundation.util.timer.min.js.map
;