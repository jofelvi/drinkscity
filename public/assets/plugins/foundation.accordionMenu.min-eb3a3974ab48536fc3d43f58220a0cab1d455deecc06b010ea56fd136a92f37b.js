!function(e,n){"object"==typeof exports&&"object"==typeof module?module.exports=n(require("./foundation.core"),require("./foundation.util.keyboard"),require("./foundation.util.nest"),require("jquery")):"function"==typeof define&&define.amd?define(["./foundation.core","./foundation.util.keyboard","./foundation.util.nest","jquery"],n):"object"==typeof exports?exports["foundation.accordionMenu"]=n(require("./foundation.core"),require("./foundation.util.keyboard"),require("./foundation.util.nest"),require("jquery")):(e.__FOUNDATION_EXTERNAL__=e.__FOUNDATION_EXTERNAL__||{},e.__FOUNDATION_EXTERNAL__["foundation.accordionMenu"]=n(e.__FOUNDATION_EXTERNAL__["foundation.core"],e.__FOUNDATION_EXTERNAL__["foundation.util.keyboard"],e.__FOUNDATION_EXTERNAL__["foundation.util.nest"],e.jQuery))}(window,function(t,i,o,u){return function(t){var i={};function o(e){if(i[e])return i[e].exports;var n=i[e]={i:e,l:!1,exports:{}};return t[e].call(n.exports,n,n.exports,o),n.l=!0,n.exports}return o.m=t,o.c=i,o.d=function(e,n,t){o.o(e,n)||Object.defineProperty(e,n,{enumerable:!0,get:t})},o.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},o.t=function(n,e){if(1&e&&(n=o(n)),8&e)return n;if(4&e&&"object"==typeof n&&n&&n.__esModule)return n;var t=Object.create(null);if(o.r(t),Object.defineProperty(t,"default",{enumerable:!0,value:n}),2&e&&"string"!=typeof n)for(var i in n)o.d(t,i,function(e){return n[e]}.bind(null,i));return t},o.n=function(e){var n=e&&e.__esModule?function(){return e.default}:function(){return e};return o.d(n,"a",n),n},o.o=function(e,n){return Object.prototype.hasOwnProperty.call(e,n)},o.p="",o(o.s=2)}({"./foundation.core":function(e,n){e.exports=t},"./foundation.util.keyboard":function(e,n){e.exports=i},"./foundation.util.nest":function(e,n){e.exports=o},"./js/entries/plugins/foundation.accordionMenu.js":function(e,n,t){"use strict";t.r(n);var i=t("./foundation.core");t.d(n,"Foundation",function(){return i.Foundation});var o=t("./js/foundation.accordionMenu.js");t.d(n,"AccordionMenu",function(){return o.AccordionMenu}),i.Foundation.plugin(o.AccordionMenu,"AccordionMenu")},"./js/foundation.accordionMenu.js":function(e,n,t){"use strict";t.r(n),t.d(n,"AccordionMenu",function(){return p});var i=t("jquery"),a=t.n(i),s=t("./foundation.util.keyboard"),r=t("./foundation.util.nest"),l=t("./foundation.core");function o(e){return(o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function u(e,n){for(var t=0;t<n.length;t++){var i=n[t];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(e,i.key,i)}}function d(e,n){return!n||"object"!==o(n)&&"function"!=typeof n?function(e){if(void 0!==e)return e;throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}(e):n}function c(e){return(c=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}function f(e,n){return(f=Object.setPrototypeOf||function(e,n){return e.__proto__=n,e})(e,n)}var p=function(e){function t(){return function(e,n){if(!(e instanceof n))throw new TypeError("Cannot call a class as a function")}(this,t),d(this,c(t).apply(this,arguments))}var n,i,o;return function(e,n){if("function"!=typeof n&&null!==n)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(n&&n.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),n&&f(e,n)}(t,l["Plugin"]),n=t,(i=[{key:"_setup",value:function(e,n){this.$element=e,this.options=a.a.extend({},t.defaults,this.$element.data(),n),this.className="AccordionMenu",this._init(),s.Keyboard.register("AccordionMenu",{ENTER:"toggle",SPACE:"toggle",ARROW_RIGHT:"open",ARROW_UP:"up",ARROW_DOWN:"down",ARROW_LEFT:"close",ESCAPE:"closeAll"})}},{key:"_init",value:function(){r.Nest.Feather(this.$element,"accordion");var u=this;this.$element.find("[data-submenu]").not(".is-active").slideUp(0),this.$element.attr({role:"tree","aria-multiselectable":this.options.multiOpen}),this.$menuLinks=this.$element.find(".is-accordion-submenu-parent"),this.$menuLinks.each(function(){var e=this.id||Object(l.GetYoDigits)(6,"acc-menu-link"),n=a()(this),t=n.children("[data-submenu]"),i=t[0].id||Object(l.GetYoDigits)(6,"acc-menu"),o=t.hasClass("is-active");u.options.parentLink&&n.children("a").clone().prependTo(t).wrap('<li data-is-parent-link class="is-submenu-parent-item is-submenu-item is-accordion-submenu-item"></li>');u.options.submenuToggle?(n.addClass("has-submenu-toggle"),n.children("a").after('<button id="'+e+'" class="submenu-toggle" aria-controls="'+i+'" aria-expanded="'+o+'" title="'+u.options.submenuToggleText+'"><span class="submenu-toggle-text">'+u.options.submenuToggleText+"</span></button>")):n.attr({"aria-controls":i,"aria-expanded":o,id:e}),t.attr({"aria-labelledby":e,"aria-hidden":!o,role:"group",id:i})}),this.$element.find("li").attr({role:"treeitem"});var e=this.$element.find(".is-active");if(e.length){u=this;e.each(function(){u.down(a()(this))})}this._events()}},{key:"_events",value:function(){var r=this;this.$element.find("li").each(function(){var n=a()(this).children("[data-submenu]");n.length&&(r.options.submenuToggle?a()(this).children(".submenu-toggle").off("click.zf.accordionMenu").on("click.zf.accordionMenu",function(e){r.toggle(n)}):a()(this).children("a").off("click.zf.accordionMenu").on("click.zf.accordionMenu",function(e){e.preventDefault(),r.toggle(n)}))}).on("keydown.zf.accordionmenu",function(n){var t,i,o=a()(this),u=o.parent("ul").children("li"),e=o.children("[data-submenu]");u.each(function(e){if(a()(this).is(o))return t=u.eq(Math.max(0,e-1)).find("a").first(),i=u.eq(Math.min(e+1,u.length-1)).find("a").first(),a()(this).children("[data-submenu]:visible").length&&(i=o.find("li:first-child").find("a").first()),a()(this).is(":first-child")?t=o.parents("li").first().find("a").first():t.parents("li").first().children("[data-submenu]:visible").length&&(t=t.parents("li").find("li:last-child").find("a").first()),void(a()(this).is(":last-child")&&(i=o.parents("li").first().next("li").find("a").first()))}),s.Keyboard.handleKey(n,"AccordionMenu",{open:function(){e.is(":hidden")&&(r.down(e),e.find("li").first().find("a").first().focus())},close:function(){e.length&&!e.is(":hidden")?r.up(e):o.parent("[data-submenu]").length&&(r.up(o.parent("[data-submenu]")),o.parents("li").first().find("a").first().focus())},up:function(){return t.focus(),!0},down:function(){return i.focus(),!0},toggle:function(){return!r.options.submenuToggle&&(o.children("[data-submenu]").length?(r.toggle(o.children("[data-submenu]")),!0):void 0)},closeAll:function(){r.hideAll()},handled:function(e){e&&n.preventDefault(),n.stopImmediatePropagation()}})})}},{key:"hideAll",value:function(){this.up(this.$element.find("[data-submenu]"))}},{key:"showAll",value:function(){this.down(this.$element.find("[data-submenu]"))}},{key:"toggle",value:function(e){e.is(":animated")||(e.is(":hidden")?this.down(e):this.up(e))}},{key:"down",value:function(e){var n=this;if(!this.options.multiOpen){var t=e.parentsUntil(this.$element).add(e).add(e.find(".is-active")),i=this.$element.find(".is-active").not(t);this.up(i)}e.addClass("is-active").attr({"aria-hidden":!1}),this.options.submenuToggle?e.prev(".submenu-toggle").attr({"aria-expanded":!0}):e.parent(".is-accordion-submenu-parent").attr({"aria-expanded":!0}),e.slideDown(this.options.slideSpeed,function(){n.$element.trigger("down.zf.accordionMenu",[e])})}},{key:"up",value:function(e){var n=this,t=e.find("[data-submenu]"),i=e.add(t);t.slideUp(0),i.removeClass("is-active").attr("aria-hidden",!0),this.options.submenuToggle?i.prev(".submenu-toggle").attr("aria-expanded",!1):i.parent(".is-accordion-submenu-parent").attr("aria-expanded",!1),e.slideUp(this.options.slideSpeed,function(){n.$element.trigger("up.zf.accordionMenu",[e])})}},{key:"_destroy",value:function(){this.$element.find("[data-submenu]").slideDown(0).css("display",""),this.$element.find("a").off("click.zf.accordionMenu"),this.$element.find("[data-is-parent-link]").detach(),this.options.submenuToggle&&(this.$element.find(".has-submenu-toggle").removeClass("has-submenu-toggle"),this.$element.find(".submenu-toggle").remove()),r.Nest.Burn(this.$element,"accordion")}}])&&u(n.prototype,i),o&&u(n,o),t}();p.defaults={parentLink:!1,slideSpeed:250,submenuToggle:!1,submenuToggleText:"Toggle menu",multiOpen:!0}},2:function(e,n,t){e.exports=t("./js/entries/plugins/foundation.accordionMenu.js")},jquery:function(e,n){e.exports=u}})});
//# sourceMappingURL=foundation.accordionMenu.min.js.map
;