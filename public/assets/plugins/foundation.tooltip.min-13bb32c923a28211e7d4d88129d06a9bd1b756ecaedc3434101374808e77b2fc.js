!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e(require("./foundation.core"),require("./foundation.util.box"),require("./foundation.util.mediaQuery"),require("./foundation.util.motion"),require("jquery")):"function"==typeof define&&define.amd?define(["./foundation.core","./foundation.util.box","./foundation.util.mediaQuery","./foundation.util.motion","jquery"],e):"object"==typeof exports?exports["foundation.tooltip"]=e(require("./foundation.core"),require("./foundation.util.box"),require("./foundation.util.mediaQuery"),require("./foundation.util.motion"),require("jquery")):(t.__FOUNDATION_EXTERNAL__=t.__FOUNDATION_EXTERNAL__||{},t.__FOUNDATION_EXTERNAL__["foundation.tooltip"]=e(t.__FOUNDATION_EXTERNAL__["foundation.core"],t.__FOUNDATION_EXTERNAL__["foundation.util.box"],t.__FOUNDATION_EXTERNAL__["foundation.util.mediaQuery"],t.__FOUNDATION_EXTERNAL__["foundation.util.motion"],t.jQuery))}(window,function(i,o,n,s,r){return function(i){var o={};function n(t){if(o[t])return o[t].exports;var e=o[t]={i:t,l:!1,exports:{}};return i[t].call(e.exports,e,e.exports,n),e.l=!0,e.exports}return n.m=i,n.c=o,n.d=function(t,e,i){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:i})},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var i=Object.create(null);if(n.r(i),Object.defineProperty(i,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(i,o,function(t){return e[t]}.bind(null,o));return i},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="",n(n.s=20)}({"./foundation.core":function(t,e){t.exports=i},"./foundation.util.box":function(t,e){t.exports=o},"./foundation.util.mediaQuery":function(t,e){t.exports=n},"./foundation.util.motion":function(t,e){t.exports=s},"./js/entries/plugins/foundation.tooltip.js":function(t,e,i){"use strict";i.r(e);var o=i("./foundation.core");i.d(e,"Foundation",function(){return o.Foundation});var n=i("./js/foundation.tooltip.js");i.d(e,"Tooltip",function(){return n.Tooltip}),o.Foundation.plugin(n.Tooltip,"Tooltip")},"./js/foundation.positionable.js":function(t,e,i){"use strict";i.r(e),i.d(e,"Positionable",function(){return h});var r=i("./foundation.util.box"),s=i("./foundation.core");function o(t){return(o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function a(t,e){for(var i=0;i<e.length;i++){var o=e[i];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(t,o.key,o)}}function l(t,e){return!e||"object"!==o(e)&&"function"!=typeof e?function(t){if(void 0!==t)return t;throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}(t):e}function u(t){return(u=Object.setPrototypeOf?Object.getPrototypeOf:function(t){return t.__proto__||Object.getPrototypeOf(t)})(t)}function f(t,e){return(f=Object.setPrototypeOf||function(t,e){return t.__proto__=e,t})(t,e)}var c=["left","right","top","bottom"],n=["top","bottom","center"],p=["left","right","center"],d={left:n,right:n,top:p,bottom:p};function g(t,e){var i=e.indexOf(t);return i===e.length-1?e[0]:e[i+1]}var h=function(t){function e(){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),l(this,u(e).apply(this,arguments))}var i,o,n;return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),e&&f(t,e)}(e,s["Plugin"]),i=e,(o=[{key:"_init",value:function(){this.triedPositions={},this.position="auto"===this.options.position?this._getDefaultPosition():this.options.position,this.alignment="auto"===this.options.alignment?this._getDefaultAlignment():this.options.alignment,this.originalPosition=this.position,this.originalAlignment=this.alignment}},{key:"_getDefaultPosition",value:function(){return"bottom"}},{key:"_getDefaultAlignment",value:function(){switch(this.position){case"bottom":case"top":return Object(s.rtl)()?"right":"left";case"left":case"right":return"bottom"}}},{key:"_reposition",value:function(){this._alignmentsExhausted(this.position)?(this.position=g(this.position,c),this.alignment=d[this.position][0]):this._realign()}},{key:"_realign",value:function(){this._addTriedPosition(this.position,this.alignment),this.alignment=g(this.alignment,d[this.position])}},{key:"_addTriedPosition",value:function(t,e){this.triedPositions[t]=this.triedPositions[t]||[],this.triedPositions[t].push(e)}},{key:"_positionsExhausted",value:function(){for(var t=!0,e=0;e<c.length;e++)t=t&&this._alignmentsExhausted(c[e]);return t}},{key:"_alignmentsExhausted",value:function(t){return this.triedPositions[t]&&this.triedPositions[t].length==d[t].length}},{key:"_getVOffset",value:function(){return this.options.vOffset}},{key:"_getHOffset",value:function(){return this.options.hOffset}},{key:"_setPosition",value:function(t,e,i){if("false"===t.attr("aria-expanded"))return!1;r.Box.GetDimensions(e),r.Box.GetDimensions(t);if(this.options.allowOverlap||(this.position=this.originalPosition,this.alignment=this.originalAlignment),e.offset(r.Box.GetExplicitOffsets(e,t,this.position,this.alignment,this._getVOffset(),this._getHOffset())),!this.options.allowOverlap){for(var o=1e8,n={position:this.position,alignment:this.alignment};!this._positionsExhausted();){var s=r.Box.OverlapArea(e,i,!1,!1,this.options.allowBottomOverlap);if(0===s)return;s<o&&(o=s,n={position:this.position,alignment:this.alignment}),this._reposition(),e.offset(r.Box.GetExplicitOffsets(e,t,this.position,this.alignment,this._getVOffset(),this._getHOffset()))}this.position=n.position,this.alignment=n.alignment,e.offset(r.Box.GetExplicitOffsets(e,t,this.position,this.alignment,this._getVOffset(),this._getHOffset()))}}}])&&a(i.prototype,o),n&&a(i,n),e}();h.defaults={position:"auto",alignment:"auto",allowOverlap:!1,allowBottomOverlap:!0,vOffset:0,hOffset:0}},"./js/foundation.tooltip.js":function(t,e,i){"use strict";i.r(e),i.d(e,"Tooltip",function(){return h});var o=i("jquery"),s=i.n(o),r=i("./foundation.core"),a=i("./foundation.util.mediaQuery"),l=i("./js/foundation.util.triggers.js"),u=i("./js/foundation.positionable.js");function n(t){return(n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function f(t,e){for(var i=0;i<e.length;i++){var o=e[i];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(t,o.key,o)}}function c(t,e){return!e||"object"!==n(e)&&"function"!=typeof e?function(t){if(void 0!==t)return t;throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}(t):e}function p(t,e,i){return(p="undefined"!=typeof Reflect&&Reflect.get?Reflect.get:function(t,e,i){var o=function(t,e){for(;!Object.prototype.hasOwnProperty.call(t,e)&&null!==(t=d(t)););return t}(t,e);if(o){var n=Object.getOwnPropertyDescriptor(o,e);return n.get?n.get.call(i):n.value}})(t,e,i||t)}function d(t){return(d=Object.setPrototypeOf?Object.getPrototypeOf:function(t){return t.__proto__||Object.getPrototypeOf(t)})(t)}function g(t,e){return(g=Object.setPrototypeOf||function(t,e){return t.__proto__=e,t})(t,e)}var h=function(t){function i(){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,i),c(this,d(i).apply(this,arguments))}var e,o,n;return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),e&&g(t,e)}(i,u["Positionable"]),e=i,(o=[{key:"_setup",value:function(t,e){this.$element=t,this.options=s.a.extend({},i.defaults,this.$element.data(),e),this.className="Tooltip",this.isActive=!1,this.isClick=!1,l.Triggers.init(s.a),this._init()}},{key:"_init",value:function(){a.MediaQuery._init();var t=this.$element.attr("aria-describedby")||Object(r.GetYoDigits)(6,"tooltip");this.options.tipText=this.options.tipText||this.$element.attr("title"),this.template=this.options.template?s()(this.options.template):this._buildTemplate(t),this.options.allowHtml?this.template.appendTo(document.body).html(this.options.tipText).hide():this.template.appendTo(document.body).text(this.options.tipText).hide(),this.$element.attr({title:"","aria-describedby":t,"data-yeti-box":t,"data-toggle":t,"data-resize":t}).addClass(this.options.triggerClass),p(d(i.prototype),"_init",this).call(this),this._events()}},{key:"_getDefaultPosition",value:function(){var t=this.$element[0].className.match(/\b(top|left|right|bottom)\b/g);return t?t[0]:"top"}},{key:"_getDefaultAlignment",value:function(){return"center"}},{key:"_getHOffset",value:function(){return"left"===this.position||"right"===this.position?this.options.hOffset+this.options.tooltipWidth:this.options.hOffset}},{key:"_getVOffset",value:function(){return"top"===this.position||"bottom"===this.position?this.options.vOffset+this.options.tooltipHeight:this.options.vOffset}},{key:"_buildTemplate",value:function(t){var e="".concat(this.options.tooltipClass," ").concat(this.options.templateClasses).trim();return s()("<div></div>").addClass(e).attr({role:"tooltip","aria-hidden":!0,"data-is-active":!1,"data-is-focus":!1,id:t})}},{key:"_setPosition",value:function(){p(d(i.prototype),"_setPosition",this).call(this,this.$element,this.template)}},{key:"show",value:function(){if("all"!==this.options.showOn&&!a.MediaQuery.is(this.options.showOn))return!1;this.template.css("visibility","hidden").show(),this._setPosition(),this.template.removeClass("top bottom left right").addClass(this.position),this.template.removeClass("align-top align-bottom align-left align-right align-center").addClass("align-"+this.alignment),this.$element.trigger("closeme.zf.tooltip",this.template.attr("id")),this.template.attr({"data-is-active":!0,"aria-hidden":!1}),this.isActive=!0,this.template.stop().hide().css("visibility","").fadeIn(this.options.fadeInDuration,function(){}),this.$element.trigger("show.zf.tooltip")}},{key:"hide",value:function(){var t=this;this.template.stop().attr({"aria-hidden":!0,"data-is-active":!1}).fadeOut(this.options.fadeOutDuration,function(){t.isActive=!1,t.isClick=!1}),this.$element.trigger("hide.zf.tooltip")}},{key:"_events",value:function(){var e=this,i=(this.template,!1);this.options.disableHover||this.$element.on("mouseenter.zf.tooltip",function(t){e.isActive||(e.timeout=setTimeout(function(){e.show()},e.options.hoverDelay))}).on("mouseleave.zf.tooltip",Object(r.ignoreMousedisappear)(function(t){clearTimeout(e.timeout),(!i||e.isClick&&!e.options.clickOpen)&&e.hide()})),this.options.clickOpen?this.$element.on("mousedown.zf.tooltip",function(t){t.stopImmediatePropagation(),e.isClick||(e.isClick=!0,!e.options.disableHover&&e.$element.attr("tabindex")||e.isActive||e.show())}):this.$element.on("mousedown.zf.tooltip",function(t){t.stopImmediatePropagation(),e.isClick=!0}),this.options.disableForTouch||this.$element.on("tap.zf.tooltip touchend.zf.tooltip",function(t){e.isActive?e.hide():e.show()}),this.$element.on({"close.zf.trigger":this.hide.bind(this)}),this.$element.on("focus.zf.tooltip",function(t){if(i=!0,e.isClick)return e.options.clickOpen||(i=!1),!1;e.show()}).on("focusout.zf.tooltip",function(t){i=!1,e.isClick=!1,e.hide()}).on("resizeme.zf.trigger",function(){e.isActive&&e._setPosition()})}},{key:"toggle",value:function(){this.isActive?this.hide():this.show()}},{key:"_destroy",value:function(){this.$element.attr("title",this.template.text()).off(".zf.trigger .zf.tooltip").removeClass(this.options.triggerClass).removeClass("top right left bottom").removeAttr("aria-describedby data-disable-hover data-resize data-toggle data-tooltip data-yeti-box"),this.template.remove()}}])&&f(e.prototype,o),n&&f(e,n),i}();h.defaults={disableForTouch:!1,hoverDelay:200,fadeInDuration:150,fadeOutDuration:150,disableHover:!1,templateClasses:"",tooltipClass:"tooltip",triggerClass:"has-tip",showOn:"small",template:"",tipText:"",touchCloseText:"Tap to close.",clickOpen:!0,position:"auto",alignment:"auto",allowOverlap:!1,allowBottomOverlap:!1,vOffset:0,hOffset:0,tooltipHeight:14,tooltipWidth:12,allowHtml:!1}},"./js/foundation.util.triggers.js":function(t,e,i){"use strict";i.r(e),i.d(e,"Triggers",function(){return f});var o=i("jquery"),s=i.n(o),n=i("./foundation.core"),r=i("./foundation.util.motion");function a(t){return(a="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}var l=function(){for(var t=["WebKit","Moz","O","Ms",""],e=0;e<t.length;e++)if("".concat(t[e],"MutationObserver")in window)return window["".concat(t[e],"MutationObserver")];return!1}(),u=function(e,i){e.data(i).split(" ").forEach(function(t){s()("#".concat(t))["close"===i?"trigger":"triggerHandler"]("".concat(i,".zf.trigger"),[e])})},f={Listeners:{Basic:{},Global:{}},Initializers:{}};function c(e,t,i){var o,n=Array.prototype.slice.call(arguments,3);s()(window).off(t).on(t,function(t){o&&clearTimeout(o),o=setTimeout(function(){i.apply(null,n)},e||10)})}f.Listeners.Basic={openListener:function(){u(s()(this),"open")},closeListener:function(){s()(this).data("close")?u(s()(this),"close"):s()(this).trigger("close.zf.trigger")},toggleListener:function(){s()(this).data("toggle")?u(s()(this),"toggle"):s()(this).trigger("toggle.zf.trigger")},closeableListener:function(t){t.stopPropagation();var e=s()(this).data("closable");""!==e?r.Motion.animateOut(s()(this),e,function(){s()(this).trigger("closed.zf")}):s()(this).fadeOut().trigger("closed.zf")},toggleFocusListener:function(){var t=s()(this).data("toggle-focus");s()("#".concat(t)).triggerHandler("toggle.zf.trigger",[s()(this)])}},f.Initializers.addOpenListener=function(t){t.off("click.zf.trigger",f.Listeners.Basic.openListener),t.on("click.zf.trigger","[data-open]",f.Listeners.Basic.openListener)},f.Initializers.addCloseListener=function(t){t.off("click.zf.trigger",f.Listeners.Basic.closeListener),t.on("click.zf.trigger","[data-close]",f.Listeners.Basic.closeListener)},f.Initializers.addToggleListener=function(t){t.off("click.zf.trigger",f.Listeners.Basic.toggleListener),t.on("click.zf.trigger","[data-toggle]",f.Listeners.Basic.toggleListener)},f.Initializers.addCloseableListener=function(t){t.off("close.zf.trigger",f.Listeners.Basic.closeableListener),t.on("close.zf.trigger","[data-closeable], [data-closable]",f.Listeners.Basic.closeableListener)},f.Initializers.addToggleFocusListener=function(t){t.off("focus.zf.trigger blur.zf.trigger",f.Listeners.Basic.toggleFocusListener),t.on("focus.zf.trigger blur.zf.trigger","[data-toggle-focus]",f.Listeners.Basic.toggleFocusListener)},f.Listeners.Global={resizeListener:function(t){l||t.each(function(){s()(this).triggerHandler("resizeme.zf.trigger")}),t.attr("data-events","resize")},scrollListener:function(t){l||t.each(function(){s()(this).triggerHandler("scrollme.zf.trigger")}),t.attr("data-events","scroll")},closeMeListener:function(t,e){var i=t.namespace.split(".")[0];s()("[data-".concat(i,"]")).not('[data-yeti-box="'.concat(e,'"]')).each(function(){var t=s()(this);t.triggerHandler("close.zf.trigger",[t])})}},f.Initializers.addClosemeListener=function(t){var e=s()("[data-yeti-box]"),i=["dropdown","tooltip","reveal"];if(t&&("string"==typeof t?i.push(t):"object"===a(t)&&"string"==typeof t[0]?i=i.concat(t):console.error("Plugin names must be strings")),e.length){var o=i.map(function(t){return"closeme.zf.".concat(t)}).join(" ");s()(window).off(o).on(o,f.Listeners.Global.closeMeListener)}},f.Initializers.addResizeListener=function(t){var e=s()("[data-resize]");e.length&&c(t,"resize.zf.trigger",f.Listeners.Global.resizeListener,e)},f.Initializers.addScrollListener=function(t){var e=s()("[data-scroll]");e.length&&c(t,"scroll.zf.trigger",f.Listeners.Global.scrollListener,e)},f.Initializers.addMutationEventsListener=function(t){if(!l)return!1;var e=t.find("[data-resize], [data-scroll], [data-mutate]"),i=function(t){var e=s()(t[0].target);switch(t[0].type){case"attributes":"scroll"===e.attr("data-events")&&"data-events"===t[0].attributeName&&e.triggerHandler("scrollme.zf.trigger",[e,window.pageYOffset]),"resize"===e.attr("data-events")&&"data-events"===t[0].attributeName&&e.triggerHandler("resizeme.zf.trigger",[e]),"style"===t[0].attributeName&&(e.closest("[data-mutate]").attr("data-events","mutate"),e.closest("[data-mutate]").triggerHandler("mutateme.zf.trigger",[e.closest("[data-mutate]")]));break;case"childList":e.closest("[data-mutate]").attr("data-events","mutate"),e.closest("[data-mutate]").triggerHandler("mutateme.zf.trigger",[e.closest("[data-mutate]")]);break;default:return!1}};if(e.length)for(var o=0;o<=e.length-1;o++){new l(i).observe(e[o],{attributes:!0,childList:!0,characterData:!1,subtree:!0,attributeFilter:["data-events","style"]})}},f.Initializers.addSimpleListeners=function(){var t=s()(document);f.Initializers.addOpenListener(t),f.Initializers.addCloseListener(t),f.Initializers.addToggleListener(t),f.Initializers.addCloseableListener(t),f.Initializers.addToggleFocusListener(t)},f.Initializers.addGlobalListeners=function(){var t=s()(document);f.Initializers.addMutationEventsListener(t),f.Initializers.addResizeListener(),f.Initializers.addScrollListener(),f.Initializers.addClosemeListener()},f.init=function(t,e){Object(n.onLoad)(t(window),function(){!0!==t.triggersInitialized&&(f.Initializers.addSimpleListeners(),f.Initializers.addGlobalListeners(),t.triggersInitialized=!0)}),e&&(e.Triggers=f,e.IHearYou=f.Initializers.addGlobalListeners)}},20:function(t,e,i){t.exports=i("./js/entries/plugins/foundation.tooltip.js")},jquery:function(t,e){t.exports=r}})});
//# sourceMappingURL=foundation.tooltip.min.js.map
;