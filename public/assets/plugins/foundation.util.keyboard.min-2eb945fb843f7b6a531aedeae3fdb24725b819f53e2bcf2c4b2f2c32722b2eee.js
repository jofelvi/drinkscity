!function(e,n){"object"==typeof exports&&"object"==typeof module?module.exports=n(require("./foundation.core"),require("jquery")):"function"==typeof define&&define.amd?define(["./foundation.core","jquery"],n):"object"==typeof exports?exports["foundation.util.keyboard"]=n(require("./foundation.core"),require("jquery")):(e.__FOUNDATION_EXTERNAL__=e.__FOUNDATION_EXTERNAL__||{},e.__FOUNDATION_EXTERNAL__["foundation.util.keyboard"]=n(e.__FOUNDATION_EXTERNAL__["foundation.core"],e.jQuery))}(window,function(t,o){return function(t){var o={};function r(e){if(o[e])return o[e].exports;var n=o[e]={i:e,l:!1,exports:{}};return t[e].call(n.exports,n,n.exports,r),n.l=!0,n.exports}return r.m=t,r.c=o,r.d=function(e,n,t){r.o(e,n)||Object.defineProperty(e,n,{enumerable:!0,get:t})},r.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.t=function(n,e){if(1&e&&(n=r(n)),8&e)return n;if(4&e&&"object"==typeof n&&n&&n.__esModule)return n;var t=Object.create(null);if(r.r(t),Object.defineProperty(t,"default",{enumerable:!0,value:n}),2&e&&"string"!=typeof n)for(var o in n)r.d(t,o,function(e){return n[e]}.bind(null,o));return t},r.n=function(e){var n=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(n,"a",n),n},r.o=function(e,n){return Object.prototype.hasOwnProperty.call(e,n)},r.p="",r(r.s=23)}({"./foundation.core":function(e,n){e.exports=t},"./js/entries/plugins/foundation.util.keyboard.js":function(e,n,t){"use strict";t.r(n);var o=t("./foundation.core");t.d(n,"Foundation",function(){return o.Foundation});var r=t("./js/foundation.util.keyboard.js");t.d(n,"Keyboard",function(){return r.Keyboard}),o.Foundation.Keyboard=r.Keyboard},"./js/foundation.util.keyboard.js":function(e,n,t){"use strict";t.r(n),t.d(n,"Keyboard",function(){return c});var o=t("jquery"),a=t.n(o),f=t("./foundation.core"),r={9:"TAB",13:"ENTER",27:"ESCAPE",32:"SPACE",35:"END",36:"HOME",37:"ARROW_LEFT",38:"ARROW_UP",39:"ARROW_RIGHT",40:"ARROW_DOWN"},d={};function u(e){return!!e&&e.find("a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]").filter(function(){return!(!a()(this).is(":visible")||a()(this).attr("tabindex")<0)})}function i(e){var n=r[e.which||e.keyCode]||String.fromCharCode(e.which).toUpperCase();return n=n.replace(/\W+/,""),e.shiftKey&&(n="SHIFT_".concat(n)),e.ctrlKey&&(n="CTRL_".concat(n)),e.altKey&&(n="ALT_".concat(n)),n=n.replace(/_$/,"")}var c={keys:function(e){var n={};for(var t in e)n[e[t]]=e[t];return n}(r),parseKey:i,handleKey:function(e,n,t){var o,r=d[n],u=this.parseKey(e);if(!r)return console.warn("Component not defined!");if((o=t[(void 0===r.ltr?r:Object(f.rtl)()?a.a.extend({},r.ltr,r.rtl):a.a.extend({},r.rtl,r.ltr))[u]])&&"function"==typeof o){var i=o.apply();(t.handled||"function"==typeof t.handled)&&t.handled(i)}else(t.unhandled||"function"==typeof t.unhandled)&&t.unhandled()},findFocusable:u,register:function(e,n){d[e]=n},trapFocus:function(e){var n=u(e),t=n.eq(0),o=n.eq(-1);e.on("keydown.zf.trapfocus",function(e){e.target===o[0]&&"TAB"===i(e)?(e.preventDefault(),t.focus()):e.target===t[0]&&"SHIFT_TAB"===i(e)&&(e.preventDefault(),o.focus())})},releaseFocus:function(e){e.off("keydown.zf.trapfocus")}}},23:function(e,n,t){e.exports=t("./js/entries/plugins/foundation.util.keyboard.js")},jquery:function(e,n){e.exports=o}})});
//# sourceMappingURL=foundation.util.keyboard.min.js.map
;
