/*
 * Chartkick.js
 * Create beautiful charts with one line of JavaScript
 * https://github.com/ankane/chartkick.js
 * v2.2.4
 * MIT License
 */

/*jslint browser: true, indent: 2, plusplus: true, vars: true */


(function (window) {
  'use strict';

  var config = window.Chartkick || {};
  var Chartkick, ISO8601_PATTERN, DECIMAL_SEPARATOR, adapters = [];
  var DATE_PATTERN = /^(\d\d\d\d)(\-)?(\d\d)(\-)?(\d\d)$/i;
  var GoogleChartsAdapter, HighchartsAdapter, ChartjsAdapter;
  var pendingRequests = [], runningRequests = 0, maxRequests = 4;

  // helpers

  function isArray(variable) {
    return Object.prototype.toString.call(variable) === "[object Array]";
  }
 
  function isFunction(variable) {
    return variable instanceof Function;
  }

  function isPlainObject(variable) {
    return !isFunction(variable) && variable instanceof Object;
  }

  // https://github.com/madrobby/zepto/blob/master/src/zepto.js
  function extend(target, source) {
    var key;
    for (key in source) {
      if (isPlainObject(source[key]) || isArray(source[key])) {
        if (isPlainObject(source[key]) && !isPlainObject(target[key])) {
          target[key] = {};
        }
        if (isArray(source[key]) && !isArray(target[key])) {
          target[key] = [];
        }
        extend(target[key], source[key]);
      } else if (source[key] !== undefined) {
        target[key] = source[key];
      }
    }
  }

  function merge(obj1, obj2) {
    var target = {};
    extend(target, obj1);
    extend(target, obj2);
    return target;
  }

  // https://github.com/Do/iso8601.js
  ISO8601_PATTERN = /(\d\d\d\d)(\-)?(\d\d)(\-)?(\d\d)(T)?(\d\d)(:)?(\d\d)?(:)?(\d\d)?([\.,]\d+)?($|Z|([\+\-])(\d\d)(:)?(\d\d)?)/i;
  DECIMAL_SEPARATOR = String(1.5).charAt(1);

  function parseISO8601(input) {
    var day, hour, matches, milliseconds, minutes, month, offset, result, seconds, type, year;
    type = Object.prototype.toString.call(input);
    if (type === "[object Date]") {
      return input;
    }
    if (type !== "[object String]") {
      return;
    }
    matches = input.match(ISO8601_PATTERN);
    if (matches) {
      year = parseInt(matches[1], 10);
      month = parseInt(matches[3], 10) - 1;
      day = parseInt(matches[5], 10);
      hour = parseInt(matches[7], 10);
      minutes = matches[9] ? parseInt(matches[9], 10) : 0;
      seconds = matches[11] ? parseInt(matches[11], 10) : 0;
      milliseconds = matches[12] ? parseFloat(DECIMAL_SEPARATOR + matches[12].slice(1)) * 1000 : 0;
      result = Date.UTC(year, month, day, hour, minutes, seconds, milliseconds);
      if (matches[13] && matches[14]) {
        offset = matches[15] * 60;
        if (matches[17]) {
          offset += parseInt(matches[17], 10);
        }
        offset *= matches[14] === "-" ? -1 : 1;
        result -= offset * 60 * 1000;
      }
      return new Date(result);
    }
  }
  // end iso8601.js

  function negativeValues(series) {
    var i, j, data;
    for (i = 0; i < series.length; i++) {
      data = series[i].data;
      for (j = 0; j < data.length; j++) {
        if (data[j][1] < 0) {
          return true;
        }
      }
    }
    return false;
  }

  function jsOptionsFunc(defaultOptions, hideLegend, setTitle, setMin, setMax, setStacked, setXtitle, setYtitle) {
    return function (chart, opts, chartOptions) {
      var series = chart.data;
      var options = merge({}, defaultOptions);
      options = merge(options, chartOptions || {});

      if (chart.hideLegend || "legend" in opts) {
        hideLegend(options, opts.legend, chart.hideLegend);
      }

      if (opts.title) {
        setTitle(options, opts.title);
      }

      // min
      if ("min" in opts) {
        setMin(options, opts.min);
      } else if (!negativeValues(series)) {
        setMin(options, 0);
      }

      // max
      if (opts.max) {
        setMax(options, opts.max);
      }

      if ("stacked" in opts) {
        setStacked(options, opts.stacked);
      }

      if (opts.colors) {
        options.colors = opts.colors;
      }

      if (opts.xtitle) {
        setXtitle(options, opts.xtitle);
      }

      if (opts.ytitle) {
        setYtitle(options, opts.ytitle);
      }

      // merge library last
      options = merge(options, opts.library || {});

      return options;
    };
  }

  function setText(element, text) {
    if (document.body.innerText) {
      element.innerText = text;
    } else {
      element.textContent = text;
    }
  }

  function chartError(element, message) {
    setText(element, "Error Loading Chart: " + message);
    element.style.color = "#ff0000";
  }

  function pushRequest(element, url, success) {
    pendingRequests.push([element, url, success]);
    runNext();
  }

  function runNext() {
    if (runningRequests < maxRequests) {
      var request = pendingRequests.shift();
      if (request) {
        runningRequests++;
        getJSON(request[0], request[1], request[2]);
        runNext();
      }
    }
  }

  function requestComplete() {
    runningRequests--;
    runNext();
  }

  function getJSON(element, url, success) {
    ajaxCall(url, success, function (jqXHR, textStatus, errorThrown) {
      var message = (typeof errorThrown === "string") ? errorThrown : errorThrown.message;
      chartError(element, message);
    });
  }

  function ajaxCall(url, success, error) {
    var $ = window.jQuery || window.Zepto || window.$;

    if ($) {
      $.ajax({
        dataType: "json",
        url: url,
        success: success,
        error: error,
        complete: requestComplete
      });
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.onload = function () {
        requestComplete();
        if (xhr.status === 200) {
          success(JSON.parse(xhr.responseText), xhr.statusText, xhr);
        } else {
          error(xhr, "error", xhr.statusText);
        }
      };
      xhr.send();
    }
  }

  function errorCatcher(chart, callback) {
    try {
      callback(chart);
    } catch (err) {
      chartError(chart.element, err.message);
      throw err;
    }
  }

  function fetchDataSource(chart, callback, dataSource) {
    if (typeof dataSource === "string") {
      pushRequest(chart.element, dataSource, function (data, textStatus, jqXHR) {
        chart.rawData = data;
        errorCatcher(chart, callback);
      });
    } else {
      chart.rawData = dataSource;
      errorCatcher(chart, callback);
    }
  }

  function addDownloadButton(chart) {
    var element = chart.element;
    var link = document.createElement("a");
    link.download = chart.options.download === true ? "chart.png" : chart.options.download; // http://caniuse.com/download
    link.style.position = "absolute";
    link.style.top = "20px";
    link.style.right = "20px";
    link.style.zIndex = 1000;
    link.style.lineHeight = "20px";
    link.target = "_blank"; // for safari
    var image = document.createElement("img");
    image.alt = "Download";
    image.style.border = "none";
    // icon from font-awesome
    // http://fa2png.io/
    image.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAMAAAC6V+0/AAABCFBMVEUAAADMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMywEsqxAAAAV3RSTlMAAQIDBggJCgsMDQ4PERQaHB0eISIjJCouLzE0OTo/QUJHSUpLTU5PUllhYmltcHh5foWLjI+SlaCio6atr7S1t7m6vsHHyM7R2tze5Obo7fHz9ff5+/1hlxK2AAAA30lEQVQYGUXBhVYCQQBA0TdYWAt2d3d3YWAHyur7/z9xgD16Lw0DW+XKx+1GgX+FRzM3HWQWrHl5N/oapW5RPe0PkBu+UYeICvozTWZVK23Ao04B79oJrOsJDOoxkZoQPWgX29pHpCZEk7rEvQYiNSFq1UMqvlCjJkRBS1R8hb00Vb/TajtBL7nTHE1X1vyMQF732dQhyF2o6SAwrzP06iUQzvwsArlnzcOdrgBhJyHa1QOgO9U1GsKuvjUTjavliZYQ8nNPapG6sap/3nrIdJ6bOWzmX/fy0XVpfzZP3S8OJT3g9EEiJwAAAABJRU5ErkJggg==";
    link.appendChild(image);
    element.style.position = "relative";

    chart.downloadAttached = true;

    // mouseenter
    addEvent(element, "mouseover", function(e) {
      var related = e.relatedTarget;
      // check download option again to ensure it wasn't changed
      if (!related || (related !== this && !childOf(this, related)) && chart.options.download) {
        link.href = chart.toImage();
        element.appendChild(link);
      }
    });

    // mouseleave
    addEvent(element, "mouseout", function(e) {
      var related = e.relatedTarget;
      if (!related || (related !== this && !childOf(this, related))) {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }
    });
  }

  // http://stackoverflow.com/questions/10149963/adding-event-listener-cross-browser
  function addEvent(elem, event, fn) {
    if (elem.addEventListener) {
      elem.addEventListener(event, fn, false);
    } else {
      elem.attachEvent("on" + event, function() {
        // set the this pointer same as addEventListener when fn is called
        return(fn.call(elem, window.event));
      });
    }
  }

  // https://gist.github.com/shawnbot/4166283
  function childOf(p, c) {
    if (p === c) return false;
    while (c && c !== p) c = c.parentNode;
    return c === p;
  }

  // type conversions

  function toStr(n) {
    return "" + n;
  }

  function toFloat(n) {
    return parseFloat(n);
  }

  function toDate(n) {
    var matches, year, month, day;
    if (typeof n !== "object") {
      if (typeof n === "number") {
        n = new Date(n * 1000); // ms
      } else {
        n = toStr(n);
        if ((matches = n.match(DATE_PATTERN))) {
        year = parseInt(matches[1], 10);
        month = parseInt(matches[3], 10) - 1;
        day = parseInt(matches[5], 10);
        return new Date(year, month, day);
        } else { // str
          // try our best to get the str into iso8601
          // TODO be smarter about this
          var str = n.replace(/ /, "T").replace(" ", "").replace("UTC", "Z");
          n = parseISO8601(str) || new Date(n);
        }
      }
    }
    return n;
  }

  function toArr(n) {
    if (!isArray(n)) {
      var arr = [], i;
      for (i in n) {
        if (n.hasOwnProperty(i)) {
          arr.push([i, n[i]]);
        }
      }
      n = arr;
    }
    return n;
  }

  function sortByTime(a, b) {
    return a[0].getTime() - b[0].getTime();
  }

  function sortByNumberSeries(a, b) {
    return a[0] - b[0];
  }

  function sortByNumber(a, b) {
    return a - b;
  }

  function loadAdapters() {
    if (!ChartjsAdapter && "Chart" in window) {
      ChartjsAdapter = (function () {
        var Chart = window.Chart;

        var baseOptions = {
          maintainAspectRatio: false,
          animation: false,
          tooltips: {
            displayColors: false
          },
          legend: {},
          title: {fontSize: 20, fontColor: "#333"}
        };

        var defaultOptions = {
          scales: {
            yAxes: [
              {
                ticks: {
                  maxTicksLimit: 4
                },
                scaleLabel: {
                  fontSize: 16,
                  // fontStyle: "bold",
                  fontColor: "#333"
                }
              }
            ],
            xAxes: [
              {
                gridLines: {
                  drawOnChartArea: false
                },
                scaleLabel: {
                  fontSize: 16,
                  // fontStyle: "bold",
                  fontColor: "#333"
                },
                time: {},
                ticks: {}
              }
            ]
          }
        };

        // http://there4.io/2012/05/02/google-chart-color-list/
        var defaultColors = [
          "#3366CC", "#DC3912", "#FF9900", "#109618", "#990099", "#3B3EAC", "#0099C6",
          "#DD4477", "#66AA00", "#B82E2E", "#316395", "#994499", "#22AA99", "#AAAA11",
          "#6633CC", "#E67300", "#8B0707", "#329262", "#5574A6", "#651067"
        ];

        var hideLegend = function (options, legend, hideLegend) {
          if (legend !== undefined) {
            options.legend.display = !!legend;
            if (legend && legend !== true) {
              options.legend.position = legend;
            }
          } else if (hideLegend) {
            options.legend.display = false;
          }
        };

        var setTitle = function (options, title) {
          options.title.display = true;
          options.title.text = title;
        };

        var setMin = function (options, min) {
          if (min !== null) {
            options.scales.yAxes[0].ticks.min = toFloat(min);
          }
        };

        var setMax = function (options, max) {
          options.scales.yAxes[0].ticks.max = toFloat(max);
        };

        var setBarMin = function (options, min) {
          if (min !== null) {
            options.scales.xAxes[0].ticks.min = toFloat(min);
          }
        };

        var setBarMax = function (options, max) {
          options.scales.xAxes[0].ticks.max = toFloat(max);
        };

        var setStacked = function (options, stacked) {
          options.scales.xAxes[0].stacked = !!stacked;
          options.scales.yAxes[0].stacked = !!stacked;
        };

        var setXtitle = function (options, title) {
          options.scales.xAxes[0].scaleLabel.display = true;
          options.scales.xAxes[0].scaleLabel.labelString = title;
        };

        var setYtitle = function (options, title) {
          options.scales.yAxes[0].scaleLabel.display = true;
          options.scales.yAxes[0].scaleLabel.labelString = title;
        };

        var drawChart = function(chart, type, data, options) {
          if (chart.chart) {
            chart.chart.destroy();
          } else {
            chart.element.innerHTML = "<canvas></canvas>";
          }

          var ctx = chart.element.getElementsByTagName("CANVAS")[0];
          chart.chart = new Chart(ctx, {
            type: type,
            data: data,
            options: options
          });
        };

        // http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
        var addOpacity = function(hex, opacity) {
          var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? "rgba(" + parseInt(result[1], 16) + ", " + parseInt(result[2], 16) + ", " + parseInt(result[3], 16) + ", " + opacity + ")" : hex;
        };

        var setLabelSize = function (chart, data, options) {
          var maxLabelSize = Math.ceil(chart.element.offsetWidth / 4.0 / data.labels.length);
          if (maxLabelSize > 25) {
            maxLabelSize = 25;
          }
          options.scales.xAxes[0].ticks.callback = function (value) {
            value = toStr(value);
            if (value.length > maxLabelSize) {
              return value.substring(0, maxLabelSize - 2) + "...";
            } else {
              return value;
            }
          };
        };

        var jsOptions = jsOptionsFunc(merge(baseOptions, defaultOptions), hideLegend, setTitle, setMin, setMax, setStacked, setXtitle, setYtitle);

        var createDataTable = function (chart, options, chartType) {
          var datasets = [];
          var labels = [];

          var colors = chart.options.colors || defaultColors;

          var day = true;
          var week = true;
          var dayOfWeek;
          var month = true;
          var year = true;
          var hour = true;
          var minute = true;
          var detectType = (chartType === "line" || chartType === "area") && !chart.discrete;

          var series = chart.data;

          var sortedLabels = [];

          var i, j, s, d, key, rows = [];
          for (i = 0; i < series.length; i++) {
            s = series[i];

            for (j = 0; j < s.data.length; j++) {
              d = s.data[j];
              key = detectType ? d[0].getTime() : d[0];
              if (!rows[key]) {
                rows[key] = new Array(series.length);
              }
              rows[key][i] = toFloat(d[1]);
              if (sortedLabels.indexOf(key) === -1) {
                sortedLabels.push(key);
              }
            }
          }

          if (detectType || chart.options.xtype === "number") {
            sortedLabels.sort(sortByNumber);
          }

          var rows2 = [];
          for (j = 0; j < series.length; j++) {
            rows2.push([]);
          }

          var value;
          var k;
          for (k = 0; k < sortedLabels.length; k++) {
            i = sortedLabels[k];
            if (detectType) {
              value = new Date(toFloat(i));
              // TODO make this efficient
              day = day && isDay(value);
              if (!dayOfWeek) {
                dayOfWeek = value.getDay();
              }
              week = week && isWeek(value, dayOfWeek);
              month = month && isMonth(value);
              year = year && isYear(value);
              hour = hour && isHour(value);
              minute = minute && isMinute(value);
            } else {
              value = i;
            }
            labels.push(value);
            for (j = 0; j < series.length; j++) {
              // Chart.js doesn't like undefined
              rows2[j].push(rows[i][j] === undefined ? null : rows[i][j]);
            }
          }

          for (i = 0; i < series.length; i++) {
            s = series[i];

            var color = s.color || colors[i];
            var backgroundColor = chartType !== "line" ? addOpacity(color, 0.5) : color;

            var dataset = {
              label: s.name,
              data: rows2[i],
              fill: chartType === "area",
              borderColor: color,
              backgroundColor: backgroundColor,
              pointBackgroundColor: color,
              borderWidth: 2
            };

            if (s.stack) {
              dataset.stack = s.stack;
            }

            if (chart.options.curve === false) {
              dataset.lineTension = 0;
            }

            if (chart.options.points === false) {
              dataset.pointRadius = 0;
              dataset.pointHitRadius = 5;
            }

            datasets.push(merge(dataset, s.library || {}));
          }

          if (detectType && labels.length > 0) {
            var minTime = labels[0].getTime();
            var maxTime = labels[0].getTime();
            for (i = 1; i < labels.length; i++) {
              value = labels[i].getTime();
              if (value < minTime) {
                minTime = value;
              }
              if (value > maxTime) {
                maxTime = value;
              }
            }

            var timeDiff = (maxTime - minTime) / (86400 * 1000.0);

            if (!options.scales.xAxes[0].time.unit) {
              var step;
              if (year || timeDiff > 365 * 10) {
                options.scales.xAxes[0].time.unit = "year";
                step = 365;
              } else if (month || timeDiff > 30 * 10) {
                options.scales.xAxes[0].time.unit = "month";
                step = 30;
              } else if (day || timeDiff > 10) {
                options.scales.xAxes[0].time.unit = "day";
                step = 1;
              } else if (hour || timeDiff > 0.5) {
                options.scales.xAxes[0].time.displayFormats = {hour: "MMM D, h a"};
                options.scales.xAxes[0].time.unit = "hour";
                step = 1 / 24.0;
              } else if (minute) {
                options.scales.xAxes[0].time.displayFormats = {minute: "h:mm a"};
                options.scales.xAxes[0].time.unit = "minute";
                step = 1 / 24.0 / 60.0;
              }

              if (step && timeDiff > 0) {
                var unitStepSize = Math.ceil(timeDiff / step / (chart.element.offsetWidth / 100.0));
                if (week && step === 1) {
                  unitStepSize = Math.ceil(unitStepSize / 7.0) * 7;
                }
                options.scales.xAxes[0].time.unitStepSize = unitStepSize;
              }
            }

            if (!options.scales.xAxes[0].time.tooltipFormat) {
              if (day) {
                options.scales.xAxes[0].time.tooltipFormat = "ll";
              } else if (hour) {
                options.scales.xAxes[0].time.tooltipFormat = "MMM D, h a";
              } else if (minute) {
                options.scales.xAxes[0].time.tooltipFormat = "h:mm a";
              }
            }
          }

          var data = {
            labels: labels,
            datasets: datasets
          };

          return data;
        };

        var renderLineChart = function (chart, chartType) {
          if (chart.options.xtype === "number") {
            return renderScatterChart(chart, chartType, true);
          }

          var chartOptions = {};
          if (chartType === "area") {
            // TODO fix area stacked
            // chartOptions.stacked = true;
          }
          // fix for https://github.com/chartjs/Chart.js/issues/2441
          if (!chart.options.max && allZeros(chart.data)) {
            chartOptions.max = 1;
          }

          var options = jsOptions(chart, merge(chartOptions, chart.options));

          var data = createDataTable(chart, options, chartType || "line");

          options.scales.xAxes[0].type = chart.discrete ? "category" : "time";

          drawChart(chart, "line", data, options);
        };

        var renderPieChart = function (chart) {
          var options = merge({}, baseOptions);
          if (chart.options.donut) {
            options.cutoutPercentage = 50;
          }

          if ("legend" in chart.options) {
            hideLegend(options, chart.options.legend);
          }

          if (chart.options.title) {
            setTitle(options, chart.options.title);
          }

          options = merge(options, chart.options.library || {});

          var labels = [];
          var values = [];
          for (var i = 0; i < chart.data.length; i++) {
            var point = chart.data[i];
            labels.push(point[0]);
            values.push(point[1]);
          }

          var data = {
            labels: labels,
            datasets: [
              {
                data: values,
                backgroundColor: chart.options.colors || defaultColors
              }
            ]
          };

          drawChart(chart, "pie", data, options);
        };

        var renderColumnChart = function (chart, chartType) {
          var options;
          if (chartType === "bar") {
            options = jsOptionsFunc(merge(baseOptions, defaultOptions), hideLegend, setTitle, setBarMin, setBarMax, setStacked, setXtitle, setYtitle)(chart, chart.options);
          } else {
            options = jsOptions(chart, chart.options);
          }
          var data = createDataTable(chart, options, "column");
          setLabelSize(chart, data, options);
          drawChart(chart, (chartType === "bar" ? "horizontalBar" : "bar"), data, options);
        };

        var renderAreaChart = function (chart) {
          renderLineChart(chart, "area");
        };

        var renderBarChart = function (chart) {
          renderColumnChart(chart, "bar");
        };

        var renderScatterChart = function (chart, chartType, lineChart) {
          chartType = chartType || "line";

          var options = jsOptions(chart, chart.options);

          var colors = chart.options.colors || defaultColors;

          var datasets = [];
          var series = chart.data;
          for (var i = 0; i < series.length; i++) {
            var s = series[i];
            var d = [];
            for (var j = 0; j < s.data.length; j++) {
              var point = {
                x: toFloat(s.data[j][0]),
                y: toFloat(s.data[j][1])
              };
              if (chartType === "bubble") {
                point.r = toFloat(s.data[j][2]);
              }
              d.push(point);
            }

            var color = s.color || colors[i];
            var backgroundColor = chartType === "area" ? addOpacity(color, 0.5) : color;

            datasets.push({
              label: s.name,
              showLine: lineChart || false,
              data: d,
              borderColor: color,
              backgroundColor: backgroundColor,
              pointBackgroundColor: color,
              fill: chartType === "area"
            });
          }

          if (chartType === "area") {
            chartType = "line";
          }

          var data = {datasets: datasets};

          options.scales.xAxes[0].type = "linear";
          options.scales.xAxes[0].position = "bottom";

          drawChart(chart, chartType, data, options);
        };

        var renderBubbleChart = function (chart) {
          renderScatterChart(chart, "bubble");
        };

        return {
          name: "chartjs",
          renderLineChart: renderLineChart,
          renderPieChart: renderPieChart,
          renderColumnChart: renderColumnChart,
          renderBarChart: renderBarChart,
          renderAreaChart: renderAreaChart,
          renderScatterChart: renderScatterChart,
          renderBubbleChart: renderBubbleChart
        };
      })();

      adapters.push(ChartjsAdapter);
    }

    if (!HighchartsAdapter && "Highcharts" in window) {
      HighchartsAdapter = (function () {
        var Highcharts = window.Highcharts;

        var defaultOptions = {
          chart: {},
          xAxis: {
            title: {
              text: null
            },
            labels: {
              style: {
                fontSize: "12px"
              }
            }
          },
          yAxis: {
            title: {
              text: null
            },
            labels: {
              style: {
                fontSize: "12px"
              }
            }
          },
          title: {
            text: null
          },
          credits: {
            enabled: false
          },
          legend: {
            borderWidth: 0
          },
          tooltip: {
            style: {
              fontSize: "12px"
            }
          },
          plotOptions: {
            areaspline: {},
            series: {
              marker: {}
            }
          }
        };

        var hideLegend = function (options, legend, hideLegend) {
          if (legend !== undefined) {
            options.legend.enabled = !!legend;
            if (legend && legend !== true) {
              if (legend === "top" || legend === "bottom") {
                options.legend.verticalAlign = legend;
              } else {
                options.legend.layout = "vertical";
                options.legend.verticalAlign = "middle";
                options.legend.align = legend;
              }
            }
          } else if (hideLegend) {
            options.legend.enabled = false;
          }
        };

        var setTitle = function (options, title) {
          options.title.text = title;
        };

        var setMin = function (options, min) {
          options.yAxis.min = min;
        };

        var setMax = function (options, max) {
          options.yAxis.max = max;
        };

        var setStacked = function (options, stacked) {
          options.plotOptions.series.stacking = stacked ? "normal" : null;
        };

        var setXtitle = function (options, title) {
          options.xAxis.title.text = title;
        };

        var setYtitle = function (options, title) {
          options.yAxis.title.text = title;
        };

        var jsOptions = jsOptionsFunc(defaultOptions, hideLegend, setTitle, setMin, setMax, setStacked, setXtitle, setYtitle);

        var drawChart = function(chart, data, options) {
          if (chart.chart) {
            chart.chart.destroy();
          }

          options.chart.renderTo = chart.element.id;
          options.series = data;
          chart.chart = new Highcharts.Chart(options);
        };

        var renderLineChart = function (chart, chartType) {
          chartType = chartType || "spline";
          var chartOptions = {};
          if (chartType === "areaspline") {
            chartOptions = {
              plotOptions: {
                areaspline: {
                  stacking: "normal"
                },
                area: {
                  stacking: "normal"
                },
                series: {
                  marker: {
                    enabled: false
                  }
                }
              }
            };
          }

          if (chart.options.curve === false) {
            if (chartType === "areaspline") {
              chartType = "area";
            } else if (chartType === "spline") {
              chartType = "line";
            }
          }

          var options = jsOptions(chart, chart.options, chartOptions), data, i, j;
          options.xAxis.type = chart.discrete ? "category" : "datetime";
          if (!options.chart.type) {
            options.chart.type = chartType;
          }

          var series = chart.data;
          for (i = 0; i < series.length; i++) {
            data = series[i].data;
            if (!chart.discrete) {
              for (j = 0; j < data.length; j++) {
                data[j][0] = data[j][0].getTime();
              }
            }
            series[i].marker = {symbol: "circle"};
            if (chart.options.points === false) {
              series[i].marker.enabled = false;
            }
          }

          drawChart(chart, series, options);
        };

        var renderScatterChart = function (chart) {
          var options = jsOptions(chart, chart.options, {});
          options.chart.type = "scatter";
          drawChart(chart, chart.data, options);
        };

        var renderPieChart = function (chart) {
          var chartOptions = merge(defaultOptions, {});

          if (chart.options.colors) {
            chartOptions.colors = chart.options.colors;
          }
          if (chart.options.donut) {
            chartOptions.plotOptions = {pie: {innerSize: "50%"}};
          }

          if ("legend" in chart.options) {
            hideLegend(chartOptions, chart.options.legend);
          }

          if (chart.options.title) {
            setTitle(chartOptions, chart.options.title);
          }

          var options = merge(chartOptions, chart.options.library || {});
          var series = [{
            type: "pie",
            name: chart.options.label || "Value",
            data: chart.data
          }];

          drawChart(chart, series, options);
        };

        var renderColumnChart = function (chart, chartType) {
          chartType = chartType || "column";
          var series = chart.data;
          var options = jsOptions(chart, chart.options), i, j, s, d, rows = [], categories = [];
          options.chart.type = chartType;

          for (i = 0; i < series.length; i++) {
            s = series[i];

            for (j = 0; j < s.data.length; j++) {
              d = s.data[j];
              if (!rows[d[0]]) {
                rows[d[0]] = new Array(series.length);
                categories.push(d[0]);
              }
              rows[d[0]][i] = d[1];
            }
          }

          if (chart.options.xtype === "number") {
            categories.sort(sortByNumber);
          }

          options.xAxis.categories = categories;

          var newSeries = [], d2;
          for (i = 0; i < series.length; i++) {
            d = [];
            for (j = 0; j < categories.length; j++) {
              d.push(rows[categories[j]][i] || 0);
            }

            d2 = {
              name: series[i].name,
              data: d
            };
            if (series[i].stack) {
              d2.stack = series[i].stack;
            }

            newSeries.push(d2);
          }

          drawChart(chart, newSeries, options);
        };

        var renderBarChart = function (chart) {
          renderColumnChart(chart, "bar");
        };

        var renderAreaChart = function (chart) {
          renderLineChart(chart, "areaspline");
        };

        return {
          name: "highcharts",
          renderLineChart: renderLineChart,
          renderPieChart: renderPieChart,
          renderColumnChart: renderColumnChart,
          renderBarChart: renderBarChart,
          renderAreaChart: renderAreaChart,
          renderScatterChart: renderScatterChart
        };
      })();
      adapters.push(HighchartsAdapter);
    }
    if (!GoogleChartsAdapter && window.google && (window.google.setOnLoadCallback || window.google.charts)) {
      GoogleChartsAdapter = (function () {
        var google = window.google;

        var loaded = {};
        var callbacks = [];

        var runCallbacks = function () {
          var cb, call;
          for (var i = 0; i < callbacks.length; i++) {
            cb = callbacks[i];
            call = google.visualization && ((cb.pack === "corechart" && google.visualization.LineChart) || (cb.pack === "timeline" && google.visualization.Timeline));
            if (call) {
              cb.callback();
              callbacks.splice(i, 1);
              i--;
            }
          }
        };

        var waitForLoaded = function (pack, callback) {
          if (!callback) {
            callback = pack;
            pack = "corechart";
          }

          callbacks.push({pack: pack, callback: callback});

          if (loaded[pack]) {
            runCallbacks();
          } else {
            loaded[pack] = true;

            // https://groups.google.com/forum/#!topic/google-visualization-api/fMKJcyA2yyI
            var loadOptions = {
              packages: [pack],
              callback: runCallbacks
            };
            if (config.language) {
              loadOptions.language = config.language;
            }
            if (pack === "corechart" && config.mapsApiKey) {
              loadOptions.mapsApiKey = config.mapsApiKey;
            }

            if (window.google.setOnLoadCallback) {
              google.load("visualization", "1", loadOptions);
            } else {
              google.charts.load("current", loadOptions);
            }
          }
        };

        // Set chart options
        var defaultOptions = {
          chartArea: {},
          fontName: "'Lucida Grande', 'Lucida Sans Unicode', Verdana, Arial, Helvetica, sans-serif",
          pointSize: 6,
          legend: {
            textStyle: {
              fontSize: 12,
              color: "#444"
            },
            alignment: "center",
            position: "right"
          },
          curveType: "function",
          hAxis: {
            textStyle: {
              color: "#666",
              fontSize: 12
            },
            titleTextStyle: {},
            gridlines: {
              color: "transparent"
            },
            baselineColor: "#ccc",
            viewWindow: {}
          },
          vAxis: {
            textStyle: {
              color: "#666",
              fontSize: 12
            },
            titleTextStyle: {},
            baselineColor: "#ccc",
            viewWindow: {}
          },
          tooltip: {
            textStyle: {
              color: "#666",
              fontSize: 12
            }
          }
        };

        var hideLegend = function (options, legend, hideLegend) {
          if (legend !== undefined) {
            var position;
            if (!legend) {
              position = "none";
            } else if (legend === true) {
              position = "right";
            } else {
              position = legend;
            }
            options.legend.position = position;
          } else if (hideLegend) {
            options.legend.position = "none";
          }
        };

        var setTitle = function (options, title) {
          options.title = title;
          options.titleTextStyle = {color: "#333", fontSize: "20px"};
        };

        var setMin = function (options, min) {
          options.vAxis.viewWindow.min = min;
        };

        var setMax = function (options, max) {
          options.vAxis.viewWindow.max = max;
        };

        var setBarMin = function (options, min) {
          options.hAxis.viewWindow.min = min;
        };

        var setBarMax = function (options, max) {
          options.hAxis.viewWindow.max = max;
        };

        var setStacked = function (options, stacked) {
          options.isStacked = !!stacked;
        };

        var setXtitle = function (options, title) {
          options.hAxis.title = title;
          options.hAxis.titleTextStyle.italic = false;
        };

        var setYtitle = function (options, title) {
          options.vAxis.title = title;
          options.vAxis.titleTextStyle.italic = false;
        };

        var jsOptions = jsOptionsFunc(defaultOptions, hideLegend, setTitle, setMin, setMax, setStacked, setXtitle, setYtitle);

        // cant use object as key
        var createDataTable = function (series, columnType, xtype) {
          var i, j, s, d, key, rows = [], sortedLabels = [];
          for (i = 0; i < series.length; i++) {
            s = series[i];

            for (j = 0; j < s.data.length; j++) {
              d = s.data[j];
              key = (columnType === "datetime") ? d[0].getTime() : d[0];
              if (!rows[key]) {
                rows[key] = new Array(series.length);
                sortedLabels.push(key);
              }
              rows[key][i] = toFloat(d[1]);
            }
          }

          var rows2 = [];
          var day = true;
          var value;
          for (j = 0; j < sortedLabels.length; j++) {
            i = sortedLabels[j];
            if (columnType === "datetime") {
              value = new Date(toFloat(i));
              day = day && isDay(value);
            } else if (columnType === "number") {
              value = toFloat(i);
            } else {
              value = i;
            }
            rows2.push([value].concat(rows[i]));
          }
          if (columnType === "datetime") {
            rows2.sort(sortByTime);
          } else if (columnType === "number") {
            rows2.sort(sortByNumberSeries);
          }

          if (xtype === "number") {
            rows2.sort(sortByNumberSeries);

            for (i = 0; i < rows2.length; i++) {
              rows2[i][0] = toStr(rows2[i][0]);
            }
          }

          // create datatable
          var data = new google.visualization.DataTable();
          columnType = columnType === "datetime" && day ? "date" : columnType;
          data.addColumn(columnType, "");
          for (i = 0; i < series.length; i++) {
            data.addColumn("number", series[i].name);
          }
          data.addRows(rows2);

          return data;
        };

        var resize = function (callback) {
          if (window.attachEvent) {
            window.attachEvent("onresize", callback);
          } else if (window.addEventListener) {
            window.addEventListener("resize", callback, true);
          }
          callback();
        };

        var drawChart = function(chart, type, data, options) {
          if (chart.chart) {
            chart.chart.clearChart();
          }

          chart.chart = new type(chart.element);
          resize(function () {
            chart.chart.draw(data, options);
          });
        };

        var renderLineChart = function (chart) {
          waitForLoaded(function () {
            var chartOptions = {};

            if (chart.options.curve === false) {
              chartOptions.curveType = "none";
            }

            if (chart.options.points === false) {
              chartOptions.pointSize = 0;
            }

            var options = jsOptions(chart, chart.options, chartOptions);
            var columnType = chart.discrete ? "string" : "datetime";
            if (chart.options.xtype === "number") {
              columnType = "number";
            }
            var data = createDataTable(chart.data, columnType);

            drawChart(chart, google.visualization.LineChart, data, options);
          });
        };

        var renderPieChart = function (chart) {
          waitForLoaded(function () {
            var chartOptions = {
              chartArea: {
                top: "10%",
                height: "80%"
              },
              legend: {}
            };
            if (chart.options.colors) {
              chartOptions.colors = chart.options.colors;
            }
            if (chart.options.donut) {
              chartOptions.pieHole = 0.5;
            }
            if ("legend" in chart.options) {
              hideLegend(chartOptions, chart.options.legend);
            }
            if (chart.options.title) {
              setTitle(chartOptions, chart.options.title);
            }
            var options = merge(merge(defaultOptions, chartOptions), chart.options.library || {});

            var data = new google.visualization.DataTable();
            data.addColumn("string", "");
            data.addColumn("number", "Value");
            data.addRows(chart.data);

            drawChart(chart, google.visualization.PieChart, data, options);
          });
        };

        var renderColumnChart = function (chart) {
          waitForLoaded(function () {
            var options = jsOptions(chart, chart.options);
            var data = createDataTable(chart.data, "string", chart.options.xtype);

            drawChart(chart, google.visualization.ColumnChart, data, options);
          });
        };

        var renderBarChart = function (chart) {
          waitForLoaded(function () {
            var chartOptions = {
              hAxis: {
                gridlines: {
                  color: "#ccc"
                }
              }
            };
            var options = jsOptionsFunc(defaultOptions, hideLegend, setTitle, setBarMin, setBarMax, setStacked, setXtitle, setYtitle)(chart, chart.options, chartOptions);
            var data = createDataTable(chart.data, "string", chart.options.xtype);

            drawChart(chart, google.visualization.BarChart, data, options);
          });
        };

        var renderAreaChart = function (chart) {
          waitForLoaded(function () {
            var chartOptions = {
              isStacked: true,
              pointSize: 0,
              areaOpacity: 0.5
            };

            var options = jsOptions(chart, chart.options, chartOptions);
            var columnType = chart.discrete ? "string" : "datetime";
            if (chart.options.xtype === "number") {
              columnType = "number";
            }
            var data = createDataTable(chart.data, columnType);

            drawChart(chart, google.visualization.AreaChart, data, options);
          });
        };

        var renderGeoChart = function (chart) {
          waitForLoaded(function () {
            var chartOptions = {
              legend: "none",
              colorAxis: {
                colors: chart.options.colors || ["#f6c7b6", "#ce502d"]
              }
            };
            var options = merge(merge(defaultOptions, chartOptions), chart.options.library || {});

            var data = new google.visualization.DataTable();
            data.addColumn("string", "");
            data.addColumn("number", chart.options.label || "Value");
            data.addRows(chart.data);

            drawChart(chart, google.visualization.GeoChart, data, options);
          });
        };

        var renderScatterChart = function (chart) {
          waitForLoaded(function () {
            var chartOptions = {};
            var options = jsOptions(chart, chart.options, chartOptions);

            var series = chart.data, rows2 = [], i, j, data, d;
            for (i = 0; i < series.length; i++) {
              d = series[i].data;
              for (j = 0; j < d.length; j++) {
                var row = new Array(series.length + 1);
                row[0] = d[j][0];
                row[i + 1] = d[j][1];
                rows2.push(row);
              }
            }

            data = new google.visualization.DataTable();
            data.addColumn("number", "");
            for (i = 0; i < series.length; i++) {
              data.addColumn("number", series[i].name);
            }
            data.addRows(rows2);

            drawChart(chart, google.visualization.ScatterChart, data, options);
          });
        };

        var renderTimeline = function (chart) {
          waitForLoaded("timeline", function () {
            var chartOptions = {
              legend: "none"
            };

            if (chart.options.colors) {
              chartOptions.colors = chart.options.colors;
            }
            var options = merge(merge(defaultOptions, chartOptions), chart.options.library || {});

            var data = new google.visualization.DataTable();
            data.addColumn({type: "string", id: "Name"});
            data.addColumn({type: "date", id: "Start"});
            data.addColumn({type: "date", id: "End"});
            data.addRows(chart.data);

            chart.element.style.lineHeight = "normal";

            drawChart(chart, google.visualization.Timeline, data, options);
          });
        };

        return {
          name: "google",
          renderLineChart: renderLineChart,
          renderPieChart: renderPieChart,
          renderColumnChart: renderColumnChart,
          renderBarChart: renderBarChart,
          renderAreaChart: renderAreaChart,
          renderScatterChart: renderScatterChart,
          renderGeoChart: renderGeoChart,
          renderTimeline: renderTimeline
        };
      })();

      adapters.push(GoogleChartsAdapter);
    }
  }

  function dataEmpty(data, chartType) {
    if (chartType === "PieChart" || chartType === "GeoChart" || chartType === "Timeline") {
      return data.length === 0;
    } else {
      for (var i = 0; i < data.length; i++) {
        if (data[i].data.length > 0) {
          return false;
        }
      }
      return true;
    }
  }

  function renderChart(chartType, chart) {
    if (chart.options.messages && chart.options.messages.empty && dataEmpty(chart.data, chartType)) {
      setText(chart.element, chart.options.messages.empty);
    } else {
      callAdapter(chartType, chart);
      if (chart.options.download && !chart.downloadAttached && chart.adapter === "chartjs") {
        addDownloadButton(chart);
      }
    }
  }

  // TODO remove chartType if cross-browser way
  // to get the name of the chart class
  function callAdapter(chartType, chart) {
    var i, adapter, fnName, adapterName;
    fnName = "render" + chartType;
    adapterName = chart.options.adapter;

    loadAdapters();

    for (i = 0; i < adapters.length; i++) {
      adapter = adapters[i];
      if ((!adapterName || adapterName === adapter.name) && isFunction(adapter[fnName])) {
        chart.adapter = adapter.name;
        return adapter[fnName](chart);
      }
    }
    throw new Error("No adapter found");
  }

  // process data

  var toFormattedKey = function (key, keyType) {
    if (keyType === "number") {
      key = toFloat(key);
    } else if (keyType === "datetime") {
      key = toDate(key);
    } else {
      key = toStr(key);
    }
    return key;
  };

  var formatSeriesData = function (data, keyType) {
    var r = [], key, j;
    for (j = 0; j < data.length; j++) {
      if (keyType === "bubble") {
        r.push([toFloat(data[j][0]), toFloat(data[j][1]), toFloat(data[j][2])]);
      } else {
        key = toFormattedKey(data[j][0], keyType);
        r.push([key, toFloat(data[j][1])]);
      }
    }
    if (keyType === "datetime") {
      r.sort(sortByTime);
    } else if (keyType === "number") {
      r.sort(sortByNumberSeries);
    }
    return r;
  };

  function isMinute(d) {
    return d.getMilliseconds() === 0 && d.getSeconds() === 0;
  }

  function isHour(d) {
    return isMinute(d) && d.getMinutes() === 0;
  }

  function isDay(d) {
    return isHour(d) && d.getHours() === 0;
  }

  function isWeek(d, dayOfWeek) {
    return isDay(d) && d.getDay() === dayOfWeek;
  }

  function isMonth(d) {
    return isDay(d) && d.getDate() === 1;
  }

  function isYear(d) {
    return isMonth(d) && d.getMonth() === 0;
  }

  function isDate(obj) {
    return !isNaN(toDate(obj)) && toStr(obj).length >= 6;
  }

  function allZeros(data) {
    var i, j, d;
    for (i = 0; i < data.length; i++) {
      d = data[i].data;
      for (j = 0; j < d.length; j++) {
        if (d[j][1] != 0) {
          return false;
        }
      }
    }
    return true;
  }

  function detectDiscrete(series) {
    var i, j, data;
    for (i = 0; i < series.length; i++) {
      data = toArr(series[i].data);
      for (j = 0; j < data.length; j++) {
        if (!isDate(data[j][0])) {
          return true;
        }
      }
    }
    return false;
  }

  // creates a shallow copy of each element of the array
  // elements are expected to be objects
  function copySeries(series) {
    var newSeries = [], i, j;
    for (i = 0; i < series.length; i++) {
      var copy = {};
      for (j in series[i]) {
        if (series[i].hasOwnProperty(j)) {
          copy[j] = series[i][j];
        }
      }
      newSeries.push(copy);
    }
    return newSeries;
  }

  function processSeries(chart, keyType) {
    var i;

    var opts = chart.options;
    var series = chart.rawData;

    // see if one series or multiple
    if (!isArray(series) || typeof series[0] !== "object" || isArray(series[0])) {
      series = [{name: opts.label || "Value", data: series}];
      chart.hideLegend = true;
    } else {
      chart.hideLegend = false;
    }
    if ((opts.discrete === null || opts.discrete === undefined) && keyType !== "bubble" && keyType !== "number") {
      chart.discrete = detectDiscrete(series);
    } else {
      chart.discrete = opts.discrete;
    }
    if (chart.discrete) {
      keyType = "string";
    }
    if (chart.options.xtype) {
      keyType = chart.options.xtype;
    }

    // right format
    series = copySeries(series);
    for (i = 0; i < series.length; i++) {
      series[i].data = formatSeriesData(toArr(series[i].data), keyType);
    }

    return series;
  }

  function processSimple(chart) {
    var perfectData = toArr(chart.rawData), i;
    for (i = 0; i < perfectData.length; i++) {
      perfectData[i] = [toStr(perfectData[i][0]), toFloat(perfectData[i][1])];
    }
    return perfectData;
  }

  function processTime(chart)
  {
    var i, data = chart.rawData;
    for (i = 0; i < data.length; i++) {
      data[i][1] = toDate(data[i][1]);
      data[i][2] = toDate(data[i][2]);
    }
    return data;
  }

  function processLineData(chart) {
    return processSeries(chart, "datetime");
  }

  function processColumnData(chart) {
    return processSeries(chart, "string");
  }

  function processBarData(chart) {
    return processSeries(chart, "string");
  }

  function processAreaData(chart) {
    return processSeries(chart, "datetime");
  }

  function processScatterData(chart) {
    return processSeries(chart, "number");
  }

  function processBubbleData(chart) {
    return processSeries(chart, "bubble");
  }

  function createChart(chartType, chart, element, dataSource, opts, processData) {
    var elementId;
    if (typeof element === "string") {
      elementId = element;
      element = document.getElementById(element);
      if (!element) {
        throw new Error("No element with id " + elementId);
      }
    }

    chart.element = element;
    opts = merge(Chartkick.options, opts || {});
    chart.options = opts;
    chart.dataSource = dataSource;

    if (!processData) {
      processData = function (chart) {
        return chart.rawData;
      };
    }

    // getters
    chart.getElement = function () {
      return element;
    };
    chart.getDataSource = function () {
      return chart.dataSource;
    };
    chart.getData = function () {
      return chart.data;
    };
    chart.getOptions = function () {
      return chart.options;
    };
    chart.getChartObject = function () {
      return chart.chart;
    };
    chart.getAdapter = function () {
      return chart.adapter;
    };

    var callback = function () {
      chart.data = processData(chart);
      renderChart(chartType, chart);
    };

    // functions
    chart.updateData = function (dataSource, options) {
      chart.dataSource = dataSource;
      if (options) {
        chart.options = merge(Chartkick.options, options);
      }
      fetchDataSource(chart, callback, dataSource);
    };
    chart.setOptions = function (options) {
      chart.options = merge(Chartkick.options, options);
      chart.redraw();
    };
    chart.redraw = function() {
      fetchDataSource(chart, callback, chart.rawData);
    };
    chart.refreshData = function () {
      if (typeof chart.dataSource === "string") {
        // prevent browser from caching
        var sep = chart.dataSource.indexOf("?") === -1 ? "?" : "&";
        var url = chart.dataSource + sep + "_=" + (new Date()).getTime();
        fetchDataSource(chart, callback, url);
      }
    };
    chart.stopRefresh = function () {
      if (chart.intervalId) {
        clearInterval(chart.intervalId);
      }
    };
    chart.toImage = function () {
      if (chart.adapter === "chartjs") {
        return chart.chart.toBase64Image();
      } else {
        return null;
      }
    };

    Chartkick.charts[element.id] = chart;

    fetchDataSource(chart, callback, dataSource);

    if (opts.refresh) {
      chart.intervalId = setInterval( function () {
        chart.refreshData();
      }, opts.refresh * 1000);
    }
  }

  // define classes

  Chartkick = {
    LineChart: function (element, dataSource, options) {
      createChart("LineChart", this, element, dataSource, options, processLineData);
    },
    PieChart: function (element, dataSource, options) {
      createChart("PieChart", this, element, dataSource, options, processSimple);
    },
    ColumnChart: function (element, dataSource, options) {
      createChart("ColumnChart", this, element, dataSource, options, processColumnData);
    },
    BarChart: function (element, dataSource, options) {
      createChart("BarChart", this, element, dataSource, options, processBarData);
    },
    AreaChart: function (element, dataSource, options) {
      createChart("AreaChart", this, element, dataSource, options, processAreaData);
    },
    GeoChart: function (element, dataSource, options) {
      createChart("GeoChart", this, element, dataSource, options, processSimple);
    },
    ScatterChart: function (element, dataSource, options) {
      createChart("ScatterChart", this, element, dataSource, options, processScatterData);
    },
    BubbleChart: function (element, dataSource, options) {
      createChart("BubbleChart", this, element, dataSource, options, processBubbleData);
    },
    Timeline: function (element, dataSource, options) {
      createChart("Timeline", this, element, dataSource, options, processTime);
    },
    charts: {},
    configure: function (options) {
      for (var key in options) {
        if (options.hasOwnProperty(key)) {
          config[key] = options[key];
        }
      }
    },
    eachChart: function (callback) {
      for (var chartId in Chartkick.charts) {
        if (Chartkick.charts.hasOwnProperty(chartId)) {
          callback(Chartkick.charts[chartId]);
        }
      }
    },
    options: {},
    adapters: adapters,
    createChart: createChart
  };

  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = Chartkick;
  } else {
    window.Chartkick = Chartkick;
  }
}(window));
/**
 * Resize function without multiple trigger
 *
 * Usage:
 * $(window).smartresize(function(){
 *     // code here
 * });
 */

document.addEventListener("turbolinks:load", function() {
  (function($,sr){
      // debouncing function from John Hann
      // http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
      var debounce = function (func, threshold, execAsap) {
        var timeout;

          return function debounced () {
              var obj = this, args = arguments;
              function delayed () {
                  if (!execAsap)
                      func.apply(obj, args);
                  timeout = null;
              }

              if (timeout)
                  clearTimeout(timeout);
              else if (execAsap)
                  func.apply(obj, args);

              timeout = setTimeout(delayed, threshold || 100);
          };
      };

      // smartresize
      jQuery.fn[sr] = function(fn){  return fn ? this.bind('resize', debounce(fn)) : this.trigger(sr); };

  })(jQuery,'smartresize');
  /**
   * To change this license header, choose License Headers in Project Properties.
   * To change this template file, choose Tools | Templates
   * and open the template in the editor.
   */

  var CURRENT_URL = window.location.href.split('#')[0].split('?')[0],
      $BODY = $('body'),
      $MENU_TOGGLE = $('#menu_toggle'),
      $SIDEBAR_MENU = $('#sidebar-menu'),
      $SIDEBAR_FOOTER = $('.sidebar-footer'),
      $LEFT_COL = $('.left_col'),
      $RIGHT_COL = $('.right_col'),
      $NAV_MENU = $('.nav_menu'),
      $FOOTER = $('footer');



  // Sidebar
  function init_sidebar() {
  // TODO: This is some kind of easy fix, maybe we can improve this
  var setContentHeight = function () {
  	// reset height
  	$RIGHT_COL.css('min-height', $(window).height());

  	var bodyHeight = $BODY.outerHeight(),
  		footerHeight = $BODY.hasClass('footer_fixed') ? -10 : $FOOTER.height(),
  		leftColHeight = $LEFT_COL.eq(1).height() + $SIDEBAR_FOOTER.height(),
  		contentHeight = bodyHeight < leftColHeight ? leftColHeight : bodyHeight;

  	// normalize content
  	contentHeight -= $NAV_MENU.height() + footerHeight;

  	$RIGHT_COL.css('min-height', contentHeight);
  };

    $SIDEBAR_MENU.find('a').on('click', function(ev) {
  	  console.log('clicked - sidebar_menu');
          var $li = $(this).parent();

          if ($li.is('.active')) {
              $li.removeClass('active active-sm');
              $('ul:first', $li).slideUp(function() {
                  setContentHeight();
              });
          } else {
              // prevent closing menu if we are on child menu
              if (!$li.parent().is('.child_menu')) {
                  $SIDEBAR_MENU.find('li').removeClass('active active-sm');
                  $SIDEBAR_MENU.find('li ul').slideUp();
              }else
              {
  				if ( $BODY.is( ".nav-sm" ) )
  				{
  					$SIDEBAR_MENU.find( "li" ).removeClass( "active active-sm" );
  					$SIDEBAR_MENU.find( "li ul" ).slideUp();
  				}
  			}
              $li.addClass('active');

              $('ul:first', $li).slideDown(function() {
                  setContentHeight();
              });
          }
      });

  // toggle small or large menu
  $MENU_TOGGLE.on('click', function() {
  		console.log('clicked - menu toggle');

  		if ($BODY.hasClass('nav-md')) {
  			$SIDEBAR_MENU.find('li.active ul').hide();
  			$SIDEBAR_MENU.find('li.active').addClass('active-sm').removeClass('active');
  		} else {
  			$SIDEBAR_MENU.find('li.active-sm ul').show();
  			$SIDEBAR_MENU.find('li.active-sm').addClass('active').removeClass('active-sm');
  		}

  	$BODY.toggleClass('nav-md nav-sm');

  	setContentHeight();
  });

  	// check active menu
  	$SIDEBAR_MENU.find('a[href="' + CURRENT_URL + '"]').parent('li').addClass('current-page');

  	$SIDEBAR_MENU.find('a').filter(function () {
  		return this.href == CURRENT_URL;
  	}).parent('li').addClass('current-page').parents('ul').slideDown(function() {
  		setContentHeight();
  	}).parent().addClass('active');

  	// recompute content when resizing
  	$(window).smartresize(function(){
  		setContentHeight();
  	});

  	setContentHeight();

  	// fixed sidebar
  	if ($.fn.mCustomScrollbar) {
  		$('.menu_fixed').mCustomScrollbar({
  			autoHideScrollbar: true,
  			theme: 'minimal',
  			mouseWheel:{ preventDefault: true }
  		});
  	}
  };
  // /Sidebar

  	var randNum = function() {
  	  return (Math.floor(Math.random() * (1 + 40 - 20))) + 20;
  	};


  // Panel toolbox
  $(document).ready(function() {
      $('.collapse-link').on('click', function() {
          var $BOX_PANEL = $(this).closest('.x_panel'),
              $ICON = $(this).find('i'),
              $BOX_CONTENT = $BOX_PANEL.find('.x_content');

          // fix for some div with hardcoded fix class
          if ($BOX_PANEL.attr('style')) {
              $BOX_CONTENT.slideToggle(200, function(){
                  $BOX_PANEL.removeAttr('style');
              });
          } else {
              $BOX_CONTENT.slideToggle(200);
              $BOX_PANEL.css('height', 'auto');
          }

          $ICON.toggleClass('fa-chevron-up fa-chevron-down');
      });

      $('.close-link').click(function () {
          var $BOX_PANEL = $(this).closest('.x_panel');

          $BOX_PANEL.remove();
      });
  });
  // /Panel toolbox

  // Tooltip
  $(document).ready(function() {
      $('[data-toggle="tooltip"]').tooltip({
          container: 'body'
      });
  });
  // /Tooltip

  // Progressbar
  if ($(".progress .progress-bar")[0]) {
      $('.progress .progress-bar').progressbar();
  }
  // /Progressbar

  // Switchery
  $(document).ready(function() {
      if ($(".js-switch")[0]) {
          var elems = Array.prototype.slice.call(document.querySelectorAll('.js-switch'));
          elems.forEach(function (html) {
              var switchery = new Switchery(html, {
                  color: '#26B99A'
              });
          });
      }
  });
  // /Switchery


  // iCheck
  $(document).ready(function() {
      if ($("input.flat")[0]) {
          $(document).ready(function () {
              $('input.flat').iCheck({
                  checkboxClass: 'icheckbox_flat-green',
                  radioClass: 'iradio_flat-green'
              });
          });
      }
  });
  // /iCheck

  // Table
  $('table input').on('ifChecked', function () {
      checkState = '';
      $(this).parent().parent().parent().addClass('selected');
      countChecked();
  });
  $('table input').on('ifUnchecked', function () {
      checkState = '';
      $(this).parent().parent().parent().removeClass('selected');
      countChecked();
  });

  var checkState = '';

  $('.bulk_action input').on('ifChecked', function () {
      checkState = '';
      $(this).parent().parent().parent().addClass('selected');
      countChecked();
  });
  $('.bulk_action input').on('ifUnchecked', function () {
      checkState = '';
      $(this).parent().parent().parent().removeClass('selected');
      countChecked();
  });
  $('.bulk_action input#check-all').on('ifChecked', function () {
      checkState = 'all';
      countChecked();
  });
  $('.bulk_action input#check-all').on('ifUnchecked', function () {
      checkState = 'none';
      countChecked();
  });

  function countChecked() {
      if (checkState === 'all') {
          $(".bulk_action input[name='table_records']").iCheck('check');
      }
      if (checkState === 'none') {
          $(".bulk_action input[name='table_records']").iCheck('uncheck');
      }

      var checkCount = $(".bulk_action input[name='table_records']:checked").length;

      if (checkCount) {
          $('.column-title').hide();
          $('.bulk-actions').show();
          $('.action-cnt').html(checkCount + ' Records Selected');
      } else {
          $('.column-title').show();
          $('.bulk-actions').hide();
      }
  }



  // Accordion
  $(document).ready(function() {
      $(".expand").on("click", function () {
          $(this).next().slideToggle(200);
          $expand = $(this).find(">:first-child");

          if ($expand.text() == "+") {
              $expand.text("-");
          } else {
              $expand.text("+");
          }
      });
  });

  // NProgress
  if (typeof NProgress != 'undefined') {
      $(document).ready(function () {
          NProgress.start();
      });

      $(window).load(function () {
          NProgress.done();
      });
  }


  	  //hover and retain popover when on popover content
          var originalLeave = $.fn.popover.Constructor.prototype.leave;
          $.fn.popover.Constructor.prototype.leave = function(obj) {
            var self = obj instanceof this.constructor ?
              obj : $(obj.currentTarget)[this.type](this.getDelegateOptions()).data('bs.' + this.type);
            var container, timeout;

            originalLeave.call(this, obj);

            if (obj.currentTarget) {
              container = $(obj.currentTarget).siblings('.popover');
              timeout = self.timeout;
              container.one('mouseenter', function() {
                //We entered the actual popover – call off the dogs
                clearTimeout(timeout);
                //Let's monitor popover content instead
                container.one('mouseleave', function() {
                  $.fn.popover.Constructor.prototype.leave.call(self, self);
                });
              });
            }
          };

          $('body').popover({
            selector: '[data-popover]',
            trigger: 'click hover',
            delay: {
              show: 50,
              hide: 400
            }
          });


  	function gd(year, month, day) {
  		return new Date(year, month - 1, day).getTime();
  	}


  	function init_flot_chart(){

  		if( typeof ($.plot) === 'undefined'){ return; }

  		console.log('init_flot_chart');



  		var arr_data1 = [
  			[gd(2012, 1, 1), 17],
  			[gd(2012, 1, 2), 74],
  			[gd(2012, 1, 3), 6],
  			[gd(2012, 1, 4), 39],
  			[gd(2012, 1, 5), 20],
  			[gd(2012, 1, 6), 85],
  			[gd(2012, 1, 7), 7]
  		];

  		var arr_data2 = [
  		  [gd(2012, 1, 1), 82],
  		  [gd(2012, 1, 2), 23],
  		  [gd(2012, 1, 3), 66],
  		  [gd(2012, 1, 4), 9],
  		  [gd(2012, 1, 5), 119],
  		  [gd(2012, 1, 6), 6],
  		  [gd(2012, 1, 7), 9]
  		];

  		var arr_data3 = [
  			[0, 1],
  			[1, 9],
  			[2, 6],
  			[3, 10],
  			[4, 5],
  			[5, 17],
  			[6, 6],
  			[7, 10],
  			[8, 7],
  			[9, 11],
  			[10, 35],
  			[11, 9],
  			[12, 12],
  			[13, 5],
  			[14, 3],
  			[15, 4],
  			[16, 9]
  		];

  		var chart_plot_02_data = [];

  		var chart_plot_03_data = [
  			[0, 1],
  			[1, 9],
  			[2, 6],
  			[3, 10],
  			[4, 5],
  			[5, 17],
  			[6, 6],
  			[7, 10],
  			[8, 7],
  			[9, 11],
  			[10, 35],
  			[11, 9],
  			[12, 12],
  			[13, 5],
  			[14, 3],
  			[15, 4],
  			[16, 9]
  		];


  		for (var i = 0; i < 30; i++) {
  		  chart_plot_02_data.push([new Date(Date.today().add(i).days()).getTime(), randNum() + i + i + 10]);
  		}


  		var chart_plot_01_settings = {
            series: {
              lines: {
                show: false,
                fill: true
              },
              splines: {
                show: true,
                tension: 0.4,
                lineWidth: 1,
                fill: 0.4
              },
              points: {
                radius: 0,
                show: true
              },
              shadowSize: 2
            },
            grid: {
              verticalLines: true,
              hoverable: true,
              clickable: true,
              tickColor: "#d5d5d5",
              borderWidth: 1,
              color: '#fff'
            },
            colors: ["rgba(38, 185, 154, 0.38)", "rgba(3, 88, 106, 0.38)"],
            xaxis: {
              tickColor: "rgba(51, 51, 51, 0.06)",
              mode: "time",
              tickSize: [1, "day"],
              //tickLength: 10,
              axisLabel: "Date",
              axisLabelUseCanvas: true,
              axisLabelFontSizePixels: 12,
              axisLabelFontFamily: 'Verdana, Arial',
              axisLabelPadding: 10
            },
            yaxis: {
              ticks: 8,
              tickColor: "rgba(51, 51, 51, 0.06)",
            },
            tooltip: false
          }

  		var chart_plot_02_settings = {
  			grid: {
  				show: true,
  				aboveData: true,
  				color: "#3f3f3f",
  				labelMargin: 10,
  				axisMargin: 0,
  				borderWidth: 0,
  				borderColor: null,
  				minBorderMargin: 5,
  				clickable: true,
  				hoverable: true,
  				autoHighlight: true,
  				mouseActiveRadius: 100
  			},
  			series: {
  				lines: {
  					show: true,
  					fill: true,
  					lineWidth: 2,
  					steps: false
  				},
  				points: {
  					show: true,
  					radius: 4.5,
  					symbol: "circle",
  					lineWidth: 3.0
  				}
  			},
  			legend: {
  				position: "ne",
  				margin: [0, -25],
  				noColumns: 0,
  				labelBoxBorderColor: null,
  				labelFormatter: function(label, series) {
  					return label + '&nbsp;&nbsp;';
  				},
  				width: 40,
  				height: 1
  			},
  			colors: ['#96CA59', '#3F97EB', '#72c380', '#6f7a8a', '#f7cb38', '#5a8022', '#2c7282'],
  			shadowSize: 0,
  			tooltip: true,
  			tooltipOpts: {
  				content: "%s: %y.0",
  				xDateFormat: "%d/%m",
  			shifts: {
  				x: -30,
  				y: -50
  			},
  			defaultTheme: false
  			},
  			yaxis: {
  				min: 0
  			},
  			xaxis: {
  				mode: "time",
  				minTickSize: [1, "day"],
  				timeformat: "%d/%m/%y",
  				min: chart_plot_02_data[0][0],
  				max: chart_plot_02_data[20][0]
  			}
  		};

  		var chart_plot_03_settings = {
  			series: {
  				curvedLines: {
  					apply: true,
  					active: true,
  					monotonicFit: true
  				}
  			},
  			colors: ["#26B99A"],
  			grid: {
  				borderWidth: {
  					top: 0,
  					right: 0,
  					bottom: 1,
  					left: 1
  				},
  				borderColor: {
  					bottom: "#7F8790",
  					left: "#7F8790"
  				}
  			}
  		};


          if ($("#chart_plot_01").length){
  			console.log('Plot1');

  			$.plot( $("#chart_plot_01"), [ arr_data1, arr_data2 ],  chart_plot_01_settings );
  		}


  		if ($("#chart_plot_02").length){
  			console.log('Plot2');

  			$.plot( $("#chart_plot_02"),
  			[{
  				label: "Email Sent",
  				data: chart_plot_02_data,
  				lines: {
  					fillColor: "rgba(150, 202, 89, 0.12)"
  				},
  				points: {
  					fillColor: "#fff" }
  			}], chart_plot_02_settings);

  		}

  		if ($("#chart_plot_03").length){
  			console.log('Plot3');


  			$.plot($("#chart_plot_03"), [{
  				label: "Registrations",
  				data: chart_plot_03_data,
  				lines: {
  					fillColor: "rgba(150, 202, 89, 0.12)"
  				},
  				points: {
  					fillColor: "#fff"
  				}
  			}], chart_plot_03_settings);

  		};

  	}


  	/* STARRR */

  	function init_starrr() {

  		if( typeof (starrr) === 'undefined'){ return; }
  		console.log('init_starrr');

  		$(".stars").starrr();

  		$('.stars-existing').starrr({
  		  rating: 4
  		});

  		$('.stars').on('starrr:change', function (e, value) {
  		  $('.stars-count').html(value);
  		});

  		$('.stars-existing').on('starrr:change', function (e, value) {
  		  $('.stars-count-existing').html(value);
  		});

  	  };


  	function init_JQVmap(){

  		//console.log('check init_JQVmap [' + typeof (VectorCanvas) + '][' + typeof (jQuery.fn.vectorMap) + ']' );

  		if(typeof (jQuery.fn.vectorMap) === 'undefined'){ return; }

  		console.log('init_JQVmap');

  			if ($('#world-map-gdp').length ){

  				$('#world-map-gdp').vectorMap({
  					map: 'world_en',
  					backgroundColor: null,
  					color: '#ffffff',
  					hoverOpacity: 0.7,
  					selectedColor: '#666666',
  					enableZoom: true,
  					showTooltip: true,
  					values: sample_data,
  					scaleColors: ['#E6F2F0', '#149B7E'],
  					normalizeFunction: 'polynomial'
  				});

  			}

  			if ($('#usa_map').length ){

  				$('#usa_map').vectorMap({
  					map: 'usa_en',
  					backgroundColor: null,
  					color: '#ffffff',
  					hoverOpacity: 0.7,
  					selectedColor: '#666666',
  					enableZoom: true,
  					showTooltip: true,
  					values: sample_data,
  					scaleColors: ['#E6F2F0', '#149B7E'],
  					normalizeFunction: 'polynomial'
  				});

  			}

  	};


  	function init_skycons(){

  			if( typeof (Skycons) === 'undefined'){ return; }
  			console.log('init_skycons');

  			var icons = new Skycons({
  				"color": "#73879C"
  			  }),
  			  list = [
  				"clear-day", "clear-night", "partly-cloudy-day",
  				"partly-cloudy-night", "cloudy", "rain", "sleet", "snow", "wind",
  				"fog"
  			  ],
  			  i;

  			for (i = list.length; i--;)
  			  icons.set(list[i], list[i]);

  			icons.play();

  	}


  	function init_chart_doughnut(){

  		if( typeof (Chart) === 'undefined'){ return; }

  		console.log('init_chart_doughnut');

  		if ($('.canvasDoughnut').length){

  		var chart_doughnut_settings = {
  				type: 'doughnut',
  				tooltipFillColor: "rgba(51, 51, 51, 0.55)",
  				data: {
  					labels: [
  						"Symbian",
  						"Blackberry",
  						"Other",
  						"Android",
  						"IOS"
  					],
  					datasets: [{
  						data: [15, 20, 30, 10, 30],
  						backgroundColor: [
  							"#BDC3C7",
  							"#9B59B6",
  							"#E74C3C",
  							"#26B99A",
  							"#3498DB"
  						],
  						hoverBackgroundColor: [
  							"#CFD4D8",
  							"#B370CF",
  							"#E95E4F",
  							"#36CAAB",
  							"#49A9EA"
  						]
  					}]
  				},
  				options: {
  					legend: false,
  					responsive: false
  				}
  			}

  			$('.canvasDoughnut').each(function(){

  				var chart_element = $(this);
  				var chart_doughnut = new Chart( chart_element, chart_doughnut_settings);

  			});

  		}

  	}

  	function init_gauge() {

  		if( typeof (Gauge) === 'undefined'){ return; }

  		console.log('init_gauge [' + $('.gauge-chart').length + ']');

  		console.log('init_gauge');


  		  var chart_gauge_settings = {
  		  lines: 12,
  		  angle: 0,
  		  lineWidth: 0.4,
  		  pointer: {
  			  length: 0.75,
  			  strokeWidth: 0.042,
  			  color: '#1D212A'
  		  },
  		  limitMax: 'false',
  		  colorStart: '#1ABC9C',
  		  colorStop: '#1ABC9C',
  		  strokeColor: '#F0F3F3',
  		  generateGradient: true
  	  };


  		if ($('#chart_gauge_01').length){

  			var chart_gauge_01_elem = document.getElementById('chart_gauge_01');
  			var chart_gauge_01 = new Gauge(chart_gauge_01_elem).setOptions(chart_gauge_settings);

  		}


  		if ($('#gauge-text').length){

  			chart_gauge_01.maxValue = 6000;
  			chart_gauge_01.animationSpeed = 32;
  			chart_gauge_01.set(3200);
  			chart_gauge_01.setTextField(document.getElementById("gauge-text"));

  		}

  		if ($('#chart_gauge_02').length){

  			var chart_gauge_02_elem = document.getElementById('chart_gauge_02');
  			var chart_gauge_02 = new Gauge(chart_gauge_02_elem).setOptions(chart_gauge_settings);

  		}


  		if ($('#gauge-text2').length){

  			chart_gauge_02.maxValue = 9000;
  			chart_gauge_02.animationSpeed = 32;
  			chart_gauge_02.set(2400);
  			chart_gauge_02.setTextField(document.getElementById("gauge-text2"));

  		}


  	}

  	/* SPARKLINES */

  		function init_sparklines() {

  			if(typeof (jQuery.fn.sparkline) === 'undefined'){ return; }
  			console.log('init_sparklines');


  			$(".sparkline_one").sparkline([2, 4, 3, 4, 5, 4, 5, 4, 3, 4, 5, 6, 4, 5, 6, 3, 5, 4, 5, 4, 5, 4, 3, 4, 5, 6, 7, 5, 4, 3, 5, 6], {
  				type: 'bar',
  				height: '125',
  				barWidth: 13,
  				colorMap: {
  					'7': '#a1a1a1'
  				},
  				barSpacing: 2,
  				barColor: '#26B99A'
  			});


  			$(".sparkline_two").sparkline([2, 4, 3, 4, 5, 4, 5, 4, 3, 4, 5, 6, 7, 5, 4, 3, 5, 6], {
  				type: 'bar',
  				height: '40',
  				barWidth: 9,
  				colorMap: {
  					'7': '#a1a1a1'
  				},
  				barSpacing: 2,
  				barColor: '#26B99A'
  			});


  			$(".sparkline_three").sparkline([2, 4, 3, 4, 5, 4, 5, 4, 3, 4, 5, 6, 7, 5, 4, 3, 5, 6], {
  				type: 'line',
  				width: '200',
  				height: '40',
  				lineColor: '#26B99A',
  				fillColor: 'rgba(223, 223, 223, 0.57)',
  				lineWidth: 2,
  				spotColor: '#26B99A',
  				minSpotColor: '#26B99A'
  			});


  			$(".sparkline11").sparkline([2, 4, 3, 4, 5, 4, 5, 4, 3, 4, 6, 2, 4, 3, 4, 5, 4, 5, 4, 3], {
  				type: 'bar',
  				height: '40',
  				barWidth: 8,
  				colorMap: {
  					'7': '#a1a1a1'
  				},
  				barSpacing: 2,
  				barColor: '#26B99A'
  			});


  			$(".sparkline22").sparkline([2, 4, 3, 4, 7, 5, 4, 3, 5, 6, 2, 4, 3, 4, 5, 4, 5, 4, 3, 4, 6], {
  				type: 'line',
  				height: '40',
  				width: '200',
  				lineColor: '#26B99A',
  				fillColor: '#ffffff',
  				lineWidth: 3,
  				spotColor: '#34495E',
  				minSpotColor: '#34495E'
  			});


  			$(".sparkline_bar").sparkline([2, 4, 3, 4, 5, 4, 5, 4, 3, 4, 5, 6, 4, 5, 6, 3, 5], {
  				type: 'bar',
  				colorMap: {
  					'7': '#a1a1a1'
  				},
  				barColor: '#26B99A'
  			});


  			$(".sparkline_area").sparkline([5, 6, 7, 9, 9, 5, 3, 2, 2, 4, 6, 7], {
  				type: 'line',
  				lineColor: '#26B99A',
  				fillColor: '#26B99A',
  				spotColor: '#4578a0',
  				minSpotColor: '#728fb2',
  				maxSpotColor: '#6d93c4',
  				highlightSpotColor: '#ef5179',
  				highlightLineColor: '#8ba8bf',
  				spotRadius: 2.5,
  				width: 85
  			});


  			$(".sparkline_line").sparkline([2, 4, 3, 4, 5, 4, 5, 4, 3, 4, 5, 6, 4, 5, 6, 3, 5], {
  				type: 'line',
  				lineColor: '#26B99A',
  				fillColor: '#ffffff',
  				width: 85,
  				spotColor: '#34495E',
  				minSpotColor: '#34495E'
  			});


  			$(".sparkline_pie").sparkline([1, 1, 2, 1], {
  				type: 'pie',
  				sliceColors: ['#26B99A', '#ccc', '#75BCDD', '#D66DE2']
  			});


  			$(".sparkline_discreet").sparkline([4, 6, 7, 7, 4, 3, 2, 1, 4, 4, 2, 4, 3, 7, 8, 9, 7, 6, 4, 3], {
  				type: 'discrete',
  				barWidth: 3,
  				lineColor: '#26B99A',
  				width: '85',
  			});


  		};


  	   /* AUTOCOMPLETE */

  		function init_autocomplete() {

  			if( typeof (autocomplete) === 'undefined'){ return; }
  			console.log('init_autocomplete');

  			var countries = { AD:"Andorra",A2:"Andorra Test",AE:"United Arab Emirates",AF:"Afghanistan",AG:"Antigua and Barbuda",AI:"Anguilla",AL:"Albania",AM:"Armenia",AN:"Netherlands Antilles",AO:"Angola",AQ:"Antarctica",AR:"Argentina",AS:"American Samoa",AT:"Austria",AU:"Australia",AW:"Aruba",AX:"Åland Islands",AZ:"Azerbaijan",BA:"Bosnia and Herzegovina",BB:"Barbados",BD:"Bangladesh",BE:"Belgium",BF:"Burkina Faso",BG:"Bulgaria",BH:"Bahrain",BI:"Burundi",BJ:"Benin",BL:"Saint Barthélemy",BM:"Bermuda",BN:"Brunei",BO:"Bolivia",BQ:"British Antarctic Territory",BR:"Brazil",BS:"Bahamas",BT:"Bhutan",BV:"Bouvet Island",BW:"Botswana",BY:"Belarus",BZ:"Belize",CA:"Canada",CC:"Cocos [Keeling] Islands",CD:"Congo - Kinshasa",CF:"Central African Republic",CG:"Congo - Brazzaville",CH:"Switzerland",CI:"Côte d’Ivoire",CK:"Cook Islands",CL:"Chile",CM:"Cameroon",CN:"China",CO:"Colombia",CR:"Costa Rica",CS:"Serbia and Montenegro",CT:"Canton and Enderbury Islands",CU:"Cuba",CV:"Cape Verde",CX:"Christmas Island",CY:"Cyprus",CZ:"Czech Republic",DD:"East Germany",DE:"Germany",DJ:"Djibouti",DK:"Denmark",DM:"Dominica",DO:"Dominican Republic",DZ:"Algeria",EC:"Ecuador",EE:"Estonia",EG:"Egypt",EH:"Western Sahara",ER:"Eritrea",ES:"Spain",ET:"Ethiopia",FI:"Finland",FJ:"Fiji",FK:"Falkland Islands",FM:"Micronesia",FO:"Faroe Islands",FQ:"French Southern and Antarctic Territories",FR:"France",FX:"Metropolitan France",GA:"Gabon",GB:"United Kingdom",GD:"Grenada",GE:"Georgia",GF:"French Guiana",GG:"Guernsey",GH:"Ghana",GI:"Gibraltar",GL:"Greenland",GM:"Gambia",GN:"Guinea",GP:"Guadeloupe",GQ:"Equatorial Guinea",GR:"Greece",GS:"South Georgia and the South Sandwich Islands",GT:"Guatemala",GU:"Guam",GW:"Guinea-Bissau",GY:"Guyana",HK:"Hong Kong SAR China",HM:"Heard Island and McDonald Islands",HN:"Honduras",HR:"Croatia",HT:"Haiti",HU:"Hungary",ID:"Indonesia",IE:"Ireland",IL:"Israel",IM:"Isle of Man",IN:"India",IO:"British Indian Ocean Territory",IQ:"Iraq",IR:"Iran",IS:"Iceland",IT:"Italy",JE:"Jersey",JM:"Jamaica",JO:"Jordan",JP:"Japan",JT:"Johnston Island",KE:"Kenya",KG:"Kyrgyzstan",KH:"Cambodia",KI:"Kiribati",KM:"Comoros",KN:"Saint Kitts and Nevis",KP:"North Korea",KR:"South Korea",KW:"Kuwait",KY:"Cayman Islands",KZ:"Kazakhstan",LA:"Laos",LB:"Lebanon",LC:"Saint Lucia",LI:"Liechtenstein",LK:"Sri Lanka",LR:"Liberia",LS:"Lesotho",LT:"Lithuania",LU:"Luxembourg",LV:"Latvia",LY:"Libya",MA:"Morocco",MC:"Monaco",MD:"Moldova",ME:"Montenegro",MF:"Saint Martin",MG:"Madagascar",MH:"Marshall Islands",MI:"Midway Islands",MK:"Macedonia",ML:"Mali",MM:"Myanmar [Burma]",MN:"Mongolia",MO:"Macau SAR China",MP:"Northern Mariana Islands",MQ:"Martinique",MR:"Mauritania",MS:"Montserrat",MT:"Malta",MU:"Mauritius",MV:"Maldives",MW:"Malawi",MX:"Mexico",MY:"Malaysia",MZ:"Mozambique",NA:"Namibia",NC:"New Caledonia",NE:"Niger",NF:"Norfolk Island",NG:"Nigeria",NI:"Nicaragua",NL:"Netherlands",NO:"Norway",NP:"Nepal",NQ:"Dronning Maud Land",NR:"Nauru",NT:"Neutral Zone",NU:"Niue",NZ:"New Zealand",OM:"Oman",PA:"Panama",PC:"Pacific Islands Trust Territory",PE:"Peru",PF:"French Polynesia",PG:"Papua New Guinea",PH:"Philippines",PK:"Pakistan",PL:"Poland",PM:"Saint Pierre and Miquelon",PN:"Pitcairn Islands",PR:"Puerto Rico",PS:"Palestinian Territories",PT:"Portugal",PU:"U.S. Miscellaneous Pacific Islands",PW:"Palau",PY:"Paraguay",PZ:"Panama Canal Zone",QA:"Qatar",RE:"Réunion",RO:"Romania",RS:"Serbia",RU:"Russia",RW:"Rwanda",SA:"Saudi Arabia",SB:"Solomon Islands",SC:"Seychelles",SD:"Sudan",SE:"Sweden",SG:"Singapore",SH:"Saint Helena",SI:"Slovenia",SJ:"Svalbard and Jan Mayen",SK:"Slovakia",SL:"Sierra Leone",SM:"San Marino",SN:"Senegal",SO:"Somalia",SR:"Suriname",ST:"São Tomé and Príncipe",SU:"Union of Soviet Socialist Republics",SV:"El Salvador",SY:"Syria",SZ:"Swaziland",TC:"Turks and Caicos Islands",TD:"Chad",TF:"French Southern Territories",TG:"Togo",TH:"Thailand",TJ:"Tajikistan",TK:"Tokelau",TL:"Timor-Leste",TM:"Turkmenistan",TN:"Tunisia",TO:"Tonga",TR:"Turkey",TT:"Trinidad and Tobago",TV:"Tuvalu",TW:"Taiwan",TZ:"Tanzania",UA:"Ukraine",UG:"Uganda",UM:"U.S. Minor Outlying Islands",US:"United States",UY:"Uruguay",UZ:"Uzbekistan",VA:"Vatican City",VC:"Saint Vincent and the Grenadines",VD:"North Vietnam",VE:"Venezuela",VG:"British Virgin Islands",VI:"U.S. Virgin Islands",VN:"Vietnam",VU:"Vanuatu",WF:"Wallis and Futuna",WK:"Wake Island",WS:"Samoa",YD:"People's Democratic Republic of Yemen",YE:"Yemen",YT:"Mayotte",ZA:"South Africa",ZM:"Zambia",ZW:"Zimbabwe",ZZ:"Unknown or Invalid Region" };

  			var countriesArray = $.map(countries, function(value, key) {
  			  return {
  				value: value,
  				data: key
  			  };
  			});

  			// initialize autocomplete with custom appendTo
  			$('#autocomplete-custom-append').autocomplete({
  			  lookup: countriesArray
  			});

  		};

  	 /* AUTOSIZE */

  		function init_autosize() {

  			if(typeof $.fn.autosize !== 'undefined'){

  			autosize($('.resizable_textarea'));

  			}

  		};

  	   /* PARSLEY */

  		function init_parsley() {
        if ($('#demo-form')[0] === undefined) { return; }

  			if( typeof (parsley) === 'undefined'){ return; }
  			console.log('init_parsley');

  			$/*.listen*/('parsley:field:validate', function() {
  			  validateFront();
  			});
  			$('#demo-form .btn').on('click', function() {
  			  $('#demo-form').parsley().validate();
  			  validateFront();
  			});
  			var validateFront = function() {
  			  if (true === $('#demo-form').parsley().isValid()) {
  				$('.bs-callout-info').removeClass('hidden');
  				$('.bs-callout-warning').addClass('hidden');
  			  } else {
  				$('.bs-callout-info').addClass('hidden');
  				$('.bs-callout-warning').removeClass('hidden');
  			  }
  			};

  			$/*.listen*/('parsley:field:validate', function() {
  			  validateFront();
  			});

  			$('#demo-form2 .btn').on('click', function() {
  			  $('#demo-form2').parsley().validate();
  			  validateFront();
  			});
  			var validateFront = function() {
  			  if (true === $('#demo-form2').parsley().isValid()) {
  				$('.bs-callout-info').removeClass('hidden');
  				$('.bs-callout-warning').addClass('hidden');
  			  } else {
  				$('.bs-callout-info').addClass('hidden');
  				$('.bs-callout-warning').removeClass('hidden');
  			  }
  			};

  			  try {
  				hljs.initHighlightingOnLoad();
  			  } catch (err) {}

  		};


  		  /* INPUTS */

  			function onAddTag(tag) {
  				alert("Added a tag: " + tag);
  			  }

  			  function onRemoveTag(tag) {
  				alert("Removed a tag: " + tag);
  			  }

  			  function onChangeTag(input, tag) {
  				alert("Changed a tag: " + tag);
  			  }

  			  //tags input
  			function init_TagsInput() {

  				if(typeof $.fn.tagsInput !== 'undefined'){

  				$('#tags_1').tagsInput({
  				  width: 'auto'
  				});

  				}

  		    };

  		/* SELECT2 */

  		function init_select2() {

  			if( typeof (select2) === 'undefined'){ return; }
  			console.log('init_toolbox');

  			$(".select2_single").select2({
  			  placeholder: "Select a state",
  			  allowClear: true
  			});
  			$(".select2_group").select2({});
  			$(".select2_multiple").select2({
  			  maximumSelectionLength: 4,
  			  placeholder: "With Max Selection limit 4",
  			  allowClear: true
  			});

  		};

  	   /* WYSIWYG EDITOR */

  		function init_wysiwyg() {

  		if( typeof ($.fn.wysiwyg) === 'undefined'){ return; }
  		console.log('init_wysiwyg');

          function init_ToolbarBootstrapBindings() {
            var fonts = ['Serif', 'Sans', 'Arial', 'Arial Black', 'Courier',
                'Courier New', 'Comic Sans MS', 'Helvetica', 'Impact', 'Lucida Grande', 'Lucida Sans', 'Tahoma', 'Times',
                'Times New Roman', 'Verdana'
              ],
              fontTarget = $('[title=Font]').siblings('.dropdown-menu');
            $.each(fonts, function(idx, fontName) {
              fontTarget.append($('<li><a data-edit="fontName ' + fontName + '" style="font-family:\'' + fontName + '\'">' + fontName + '</a></li>'));
            });
            $('a[title]').tooltip({
              container: 'body'
            });
            $('.dropdown-menu input').click(function() {
                return false;
              })
              .change(function() {
                $(this).parent('.dropdown-menu').siblings('.dropdown-toggle').dropdown('toggle');
              })
              .keydown('esc', function() {
                this.value = '';
                $(this).change();
              });

            $('[data-role=magic-overlay]').each(function() {
              var overlay = $(this),
                target = $(overlay.data('target'));
              overlay.css('opacity', 0).css('position', 'absolute').offset(target.offset()).width(target.outerWidth()).height(target.outerHeight());
            });

            if ("onwebkitspeechchange" in document.createElement("input")) {
              var editorOffset = $('#editor').offset();

              $('.voiceBtn').css('position', 'absolute').offset({
                top: editorOffset.top,
                left: editorOffset.left + $('#editor').innerWidth() - 35
              });
            } else {
              $('.voiceBtn').hide();
            }
          }

          function showErrorAlert(reason, detail) {
            var msg = '';
            if (reason === 'unsupported-file-type') {
              msg = "Unsupported format " + detail;
            } else {
              console.log("error uploading file", reason, detail);
            }
            $('<div class="alert"> <button type="button" class="close" data-dismiss="alert">&times;</button>' +
              '<strong>File upload error</strong> ' + msg + ' </div>').prependTo('#alerts');
          }

         $('.editor-wrapper').each(function(){
  			var id = $(this).attr('id');	//editor-one

  			$(this).wysiwyg({
  				toolbarSelector: '[data-target="#' + id + '"]',
  				fileUploadError: showErrorAlert
  			});
  		});


          window.prettyPrint;
          prettyPrint();

      };

  	/* CROPPER */

  		function init_cropper() {


  			if( typeof ($.fn.cropper) === 'undefined'){ return; }
  			console.log('init_cropper');

  			var $image = $('#image');
  			var $download = $('#download');
  			var $dataX = $('#dataX');
  			var $dataY = $('#dataY');
  			var $dataHeight = $('#dataHeight');
  			var $dataWidth = $('#dataWidth');
  			var $dataRotate = $('#dataRotate');
  			var $dataScaleX = $('#dataScaleX');
  			var $dataScaleY = $('#dataScaleY');
  			var options = {
  				  aspectRatio: 16 / 9,
  				  preview: '.img-preview',
  				  crop: function (e) {
  					$dataX.val(Math.round(e.x));
  					$dataY.val(Math.round(e.y));
  					$dataHeight.val(Math.round(e.height));
  					$dataWidth.val(Math.round(e.width));
  					$dataRotate.val(e.rotate);
  					$dataScaleX.val(e.scaleX);
  					$dataScaleY.val(e.scaleY);
  				  }
  				};


  			// Tooltip
  			$('[data-toggle="tooltip"]').tooltip();


  			// Cropper
  			$image.on({
  			  'build.cropper': function (e) {
  				console.log(e.type);
  			  },
  			  'built.cropper': function (e) {
  				console.log(e.type);
  			  },
  			  'cropstart.cropper': function (e) {
  				console.log(e.type, e.action);
  			  },
  			  'cropmove.cropper': function (e) {
  				console.log(e.type, e.action);
  			  },
  			  'cropend.cropper': function (e) {
  				console.log(e.type, e.action);
  			  },
  			  'crop.cropper': function (e) {
  				console.log(e.type, e.x, e.y, e.width, e.height, e.rotate, e.scaleX, e.scaleY);
  			  },
  			  'zoom.cropper': function (e) {
  				console.log(e.type, e.ratio);
  			  }
  			}).cropper(options);


  			// Buttons
  			if (!$.isFunction(document.createElement('canvas').getContext)) {
  			  $('button[data-method="getCroppedCanvas"]').prop('disabled', true);
  			}

  			if (typeof document.createElement('cropper').style.transition === 'undefined') {
  			  $('button[data-method="rotate"]').prop('disabled', true);
  			  $('button[data-method="scale"]').prop('disabled', true);
  			}


  			// Download
  			if (typeof $download[0].download === 'undefined') {
  			  $download.addClass('disabled');
  			}


  			// Options
  			$('.docs-toggles').on('change', 'input', function () {
  			  var $this = $(this);
  			  var name = $this.attr('name');
  			  var type = $this.prop('type');
  			  var cropBoxData;
  			  var canvasData;

  			  if (!$image.data('cropper')) {
  				return;
  			  }

  			  if (type === 'checkbox') {
  				options[name] = $this.prop('checked');
  				cropBoxData = $image.cropper('getCropBoxData');
  				canvasData = $image.cropper('getCanvasData');

  				options.built = function () {
  				  $image.cropper('setCropBoxData', cropBoxData);
  				  $image.cropper('setCanvasData', canvasData);
  				};
  			  } else if (type === 'radio') {
  				options[name] = $this.val();
  			  }

  			  $image.cropper('destroy').cropper(options);
  			});


  			// Methods
  			$('.docs-buttons').on('click', '[data-method]', function () {
  			  var $this = $(this);
  			  var data = $this.data();
  			  var $target;
  			  var result;

  			  if ($this.prop('disabled') || $this.hasClass('disabled')) {
  				return;
  			  }

  			  if ($image.data('cropper') && data.method) {
  				data = $.extend({}, data); // Clone a new one

  				if (typeof data.target !== 'undefined') {
  				  $target = $(data.target);

  				  if (typeof data.option === 'undefined') {
  					try {
  					  data.option = JSON.parse($target.val());
  					} catch (e) {
  					  console.log(e.message);
  					}
  				  }
  				}

  				result = $image.cropper(data.method, data.option, data.secondOption);

  				switch (data.method) {
  				  case 'scaleX':
  				  case 'scaleY':
  					$(this).data('option', -data.option);
  					break;

  				  case 'getCroppedCanvas':
  					if (result) {

  					  // Bootstrap's Modal
  					  $('#getCroppedCanvasModal').modal().find('.modal-body').html(result);

  					  if (!$download.hasClass('disabled')) {
  						$download.attr('href', result.toDataURL());
  					  }
  					}

  					break;
  				}

  				if ($.isPlainObject(result) && $target) {
  				  try {
  					$target.val(JSON.stringify(result));
  				  } catch (e) {
  					console.log(e.message);
  				  }
  				}

  			  }
  			});

  			// Keyboard
  			$(document.body).on('keydown', function (e) {
  			  if (!$image.data('cropper') || this.scrollTop > 300) {
  				return;
  			  }

  			  switch (e.which) {
  				case 37:
  				  e.preventDefault();
  				  $image.cropper('move', -1, 0);
  				  break;

  				case 38:
  				  e.preventDefault();
  				  $image.cropper('move', 0, -1);
  				  break;

  				case 39:
  				  e.preventDefault();
  				  $image.cropper('move', 1, 0);
  				  break;

  				case 40:
  				  e.preventDefault();
  				  $image.cropper('move', 0, 1);
  				  break;
  			  }
  			});

  			// Import image
  			var $inputImage = $('#inputImage');
  			var URL = window.URL || window.webkitURL;
  			var blobURL;

  			if (URL) {
  			  $inputImage.change(function () {
  				var files = this.files;
  				var file;

  				if (!$image.data('cropper')) {
  				  return;
  				}

  				if (files && files.length) {
  				  file = files[0];

  				  if (/^image\/\w+$/.test(file.type)) {
  					blobURL = URL.createObjectURL(file);
  					$image.one('built.cropper', function () {

  					  // Revoke when load complete
  					  URL.revokeObjectURL(blobURL);
  					}).cropper('reset').cropper('replace', blobURL);
  					$inputImage.val('');
  				  } else {
  					window.alert('Please choose an image file.');
  				  }
  				}
  			  });
  			} else {
  			  $inputImage.prop('disabled', true).parent().addClass('disabled');
  			}


  		};

  		/* CROPPER --- end */

  		/* KNOB */

  		function init_knob() {

  				if( typeof ($.fn.knob) === 'undefined'){ return; }
  				console.log('init_knob');

  				$(".knob").knob({
  				  change: function(value) {
  					//console.log("change : " + value);
  				  },
  				  release: function(value) {
  					//console.log(this.$.attr('value'));
  					console.log("release : " + value);
  				  },
  				  cancel: function() {
  					console.log("cancel : ", this);
  				  },
  				  /*format : function (value) {
  				   return value + '%';
  				   },*/
  				  draw: function() {

  					// "tron" case
  					if (this.$.data('skin') == 'tron') {

  					  this.cursorExt = 0.3;

  					  var a = this.arc(this.cv) // Arc
  						,
  						pa // Previous arc
  						, r = 1;

  					  this.g.lineWidth = this.lineWidth;

  					  if (this.o.displayPrevious) {
  						pa = this.arc(this.v);
  						this.g.beginPath();
  						this.g.strokeStyle = this.pColor;
  						this.g.arc(this.xy, this.xy, this.radius - this.lineWidth, pa.s, pa.e, pa.d);
  						this.g.stroke();
  					  }

  					  this.g.beginPath();
  					  this.g.strokeStyle = r ? this.o.fgColor : this.fgColor;
  					  this.g.arc(this.xy, this.xy, this.radius - this.lineWidth, a.s, a.e, a.d);
  					  this.g.stroke();

  					  this.g.lineWidth = 2;
  					  this.g.beginPath();
  					  this.g.strokeStyle = this.o.fgColor;
  					  this.g.arc(this.xy, this.xy, this.radius - this.lineWidth + 1 + this.lineWidth * 2 / 3, 0, 2 * Math.PI, false);
  					  this.g.stroke();

  					  return false;
  					}
  				  }

  				});

  				// Example of infinite knob, iPod click wheel
  				var v, up = 0,
  				  down = 0,
  				  i = 0,
  				  $idir = $("div.idir"),
  				  $ival = $("div.ival"),
  				  incr = function() {
  					i++;
  					$idir.show().html("+").fadeOut();
  					$ival.html(i);
  				  },
  				  decr = function() {
  					i--;
  					$idir.show().html("-").fadeOut();
  					$ival.html(i);
  				  };
  				$("input.infinite").knob({
  				  min: 0,
  				  max: 20,
  				  stopper: false,
  				  change: function() {
  					if (v > this.cv) {
  					  if (up) {
  						decr();
  						up = 0;
  					  } else {
  						up = 1;
  						down = 0;
  					  }
  					} else {
  					  if (v < this.cv) {
  						if (down) {
  						  incr();
  						  down = 0;
  						} else {
  						  down = 1;
  						  up = 0;
  						}
  					  }
  					}
  					v = this.cv;
  				  }
  				});

  		};

  		/* INPUT MASK */

  		function init_InputMask() {

  			if( typeof ($.fn.inputmask) === 'undefined'){ return; }
  			console.log('init_InputMask');

  				$(":input").inputmask();

  		};

  		/* COLOR PICKER */

  		function init_ColorPicker() {

  			if( typeof ($.fn.colorpicker) === 'undefined'){ return; }
  			console.log('init_ColorPicker');

  				$('.demo1').colorpicker();
  				$('.demo2').colorpicker();

  				$('#demo_forceformat').colorpicker({
  					format: 'rgba',
  					horizontal: true
  				});

  				$('#demo_forceformat3').colorpicker({
  					format: 'rgba',
  				});

  				$('.demo-auto').colorpicker();

  		};


  		/* ION RANGE SLIDER */

  		function init_IonRangeSlider() {

  			if( typeof ($.fn.ionRangeSlider) === 'undefined'){ return; }
  			console.log('init_IonRangeSlider');

  			$("#range_27").ionRangeSlider({
  			  type: "double",
  			  min: 1000000,
  			  max: 2000000,
  			  grid: true,
  			  force_edges: true
  			});
  			$("#range").ionRangeSlider({
  			  hide_min_max: true,
  			  keyboard: true,
  			  min: 0,
  			  max: 5000,
  			  from: 1000,
  			  to: 4000,
  			  type: 'double',
  			  step: 1,
  			  prefix: "$",
  			  grid: true
  			});
  			$("#range_25").ionRangeSlider({
  			  type: "double",
  			  min: 1000000,
  			  max: 2000000,
  			  grid: true
  			});
  			$("#range_26").ionRangeSlider({
  			  type: "double",
  			  min: 0,
  			  max: 10000,
  			  step: 500,
  			  grid: true,
  			  grid_snap: true
  			});
  			$("#range_31").ionRangeSlider({
  			  type: "double",
  			  min: 0,
  			  max: 100,
  			  from: 30,
  			  to: 70,
  			  from_fixed: true
  			});
  			$(".range_min_max").ionRangeSlider({
  			  type: "double",
  			  min: 0,
  			  max: 100,
  			  from: 30,
  			  to: 70,
  			  max_interval: 50
  			});
  			$(".range_time24").ionRangeSlider({
  			  min: +moment().subtract(12, "hours").format("X"),
  			  max: +moment().format("X"),
  			  from: +moment().subtract(6, "hours").format("X"),
  			  grid: true,
  			  force_edges: true,
  			  prettify: function(num) {
  				var m = moment(num, "X");
  				return m.format("Do MMMM, HH:mm");
  			  }
  			});

  		};


  	   /* DATERANGEPICKER */

  		function init_daterangepicker() {

  			if( typeof ($.fn.daterangepicker) === 'undefined'){ return; }
  			console.log('init_daterangepicker');

  			var cb = function(start, end, label) {
  			  console.log(start.toISOString(), end.toISOString(), label);
  			  $('#reportrange span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
  			};

  			var optionSet1 = {
  			  startDate: moment().subtract(29, 'days'),
  			  endDate: moment(),
  			  minDate: '01/01/2012',
  			  maxDate: '12/31/2015',
  			  dateLimit: {
  				days: 60
  			  },
  			  showDropdowns: true,
  			  showWeekNumbers: true,
  			  timePicker: false,
  			  timePickerIncrement: 1,
  			  timePicker12Hour: true,
  			  ranges: {
  				'Today': [moment(), moment()],
  				'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
  				'Last 7 Days': [moment().subtract(6, 'days'), moment()],
  				'Last 30 Days': [moment().subtract(29, 'days'), moment()],
  				'This Month': [moment().startOf('month'), moment().endOf('month')],
  				'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
  			  },
  			  opens: 'left',
  			  buttonClasses: ['btn btn-default'],
  			  applyClass: 'btn-small btn-primary',
  			  cancelClass: 'btn-small',
  			  format: 'MM/DD/YYYY',
  			  separator: ' to ',
  			  locale: {
  				applyLabel: 'Submit',
  				cancelLabel: 'Clear',
  				fromLabel: 'From',
  				toLabel: 'To',
  				customRangeLabel: 'Custom',
  				daysOfWeek: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  				monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  				firstDay: 1
  			  }
  			};

  			$('#reportrange span').html(moment().subtract(29, 'days').format('MMMM D, YYYY') + ' - ' + moment().format('MMMM D, YYYY'));
  			$('#reportrange').daterangepicker(optionSet1, cb);
  			$('#reportrange').on('show.daterangepicker', function() {
  			  console.log("show event fired");
  			});
  			$('#reportrange').on('hide.daterangepicker', function() {
  			  console.log("hide event fired");
  			});
  			$('#reportrange').on('apply.daterangepicker', function(ev, picker) {
  			  console.log("apply event fired, start/end dates are " + picker.startDate.format('MMMM D, YYYY') + " to " + picker.endDate.format('MMMM D, YYYY'));
  			});
  			$('#reportrange').on('cancel.daterangepicker', function(ev, picker) {
  			  console.log("cancel event fired");
  			});
  			$('#options1').click(function() {
  			  $('#reportrange').data('daterangepicker').setOptions(optionSet1, cb);
  			});
  			$('#options2').click(function() {
  			  $('#reportrange').data('daterangepicker').setOptions(optionSet2, cb);
  			});
  			$('#destroy').click(function() {
  			  $('#reportrange').data('daterangepicker').remove();
  			});

  		}

  	   function init_daterangepicker_right() {

  				if( typeof ($.fn.daterangepicker) === 'undefined'){ return; }
  				console.log('init_daterangepicker_right');

  				var cb = function(start, end, label) {
  				  console.log(start.toISOString(), end.toISOString(), label);
  				  $('#reportrange_right span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
  				};

  				var optionSet1 = {
  				  startDate: moment().subtract(29, 'days'),
  				  endDate: moment(),
  				  minDate: '01/01/2012',
  				  maxDate: '12/31/2020',
  				  dateLimit: {
  					days: 60
  				  },
  				  showDropdowns: true,
  				  showWeekNumbers: true,
  				  timePicker: false,
  				  timePickerIncrement: 1,
  				  timePicker12Hour: true,
  				  ranges: {
  					'Today': [moment(), moment()],
  					'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
  					'Last 7 Days': [moment().subtract(6, 'days'), moment()],
  					'Last 30 Days': [moment().subtract(29, 'days'), moment()],
  					'This Month': [moment().startOf('month'), moment().endOf('month')],
  					'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
  				  },
  				  opens: 'right',
  				  buttonClasses: ['btn btn-default'],
  				  applyClass: 'btn-small btn-primary',
  				  cancelClass: 'btn-small',
  				  format: 'MM/DD/YYYY',
  				  separator: ' to ',
  				  locale: {
  					applyLabel: 'Submit',
  					cancelLabel: 'Clear',
  					fromLabel: 'From',
  					toLabel: 'To',
  					customRangeLabel: 'Custom',
  					daysOfWeek: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  					monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  					firstDay: 1
  				  }
  				};

  				$('#reportrange_right span').html(moment().subtract(29, 'days').format('MMMM D, YYYY') + ' - ' + moment().format('MMMM D, YYYY'));

  				$('#reportrange_right').daterangepicker(optionSet1, cb);

  				$('#reportrange_right').on('show.daterangepicker', function() {
  				  console.log("show event fired");
  				});
  				$('#reportrange_right').on('hide.daterangepicker', function() {
  				  console.log("hide event fired");
  				});
  				$('#reportrange_right').on('apply.daterangepicker', function(ev, picker) {
  				  console.log("apply event fired, start/end dates are " + picker.startDate.format('MMMM D, YYYY') + " to " + picker.endDate.format('MMMM D, YYYY'));
  				});
  				$('#reportrange_right').on('cancel.daterangepicker', function(ev, picker) {
  				  console.log("cancel event fired");
  				});

  				$('#options1').click(function() {
  				  $('#reportrange_right').data('daterangepicker').setOptions(optionSet1, cb);
  				});

  				$('#options2').click(function() {
  				  $('#reportrange_right').data('daterangepicker').setOptions(optionSet2, cb);
  				});

  				$('#destroy').click(function() {
  				  $('#reportrange_right').data('daterangepicker').remove();
  				});

  	   }

  	    function init_daterangepicker_single_call() {

  			if( typeof ($.fn.daterangepicker) === 'undefined'){ return; }
  			console.log('init_daterangepicker_single_call');

  			$('#single_cal1').daterangepicker({
  			  singleDatePicker: true,
  			  singleClasses: "picker_1"
  			}, function(start, end, label) {
  			  console.log(start.toISOString(), end.toISOString(), label);
  			});
  			$('#single_cal2').daterangepicker({
  			  singleDatePicker: true,
  			  singleClasses: "picker_2"
  			}, function(start, end, label) {
  			  console.log(start.toISOString(), end.toISOString(), label);
  			});
  			$('#single_cal3').daterangepicker({
  			  singleDatePicker: true,
  			  singleClasses: "picker_3"
  			}, function(start, end, label) {
  			  console.log(start.toISOString(), end.toISOString(), label);
  			});
  			$('#single_cal4').daterangepicker({
  			  singleDatePicker: true,
  			  singleClasses: "picker_4"
  			}, function(start, end, label) {
  			  console.log(start.toISOString(), end.toISOString(), label);
  			});


  		}


  		function init_daterangepicker_reservation() {

  			if( typeof ($.fn.daterangepicker) === 'undefined'){ return; }
  			console.log('init_daterangepicker_reservation');

  			$('#reservation').daterangepicker(null, function(start, end, label) {
  			  console.log(start.toISOString(), end.toISOString(), label);
  			});

  			$('#reservation-time').daterangepicker({
  			  timePicker: true,
  			  timePickerIncrement: 30,
  			  locale: {
  				format: 'MM/DD/YYYY h:mm A'
  			  }
  			});

  		}

  	   /* SMART WIZARD */

  		function init_SmartWizard() {

  			if( typeof ($.fn.smartWizard) === 'undefined'){ return; }
  			console.log('init_SmartWizard');

  			$('#wizard').smartWizard();

  			$('#wizard_verticle').smartWizard({
  			  transitionEffect: 'slide'
  			});

  			$('.buttonNext').addClass('btn btn-success');
  			$('.buttonPrevious').addClass('btn btn-primary');
  			$('.buttonFinish').addClass('btn btn-default');

  		};


  	  /* VALIDATOR */

  	  function init_validator () {

  		if( typeof (validator) === 'undefined'){ return; }
  		console.log('init_validator');

  	  // initialize the validator function
        validator.message.date = 'not a real date';

        // validate a field on "blur" event, a 'select' on 'change' event & a '.reuired' classed multifield on 'keyup':
        $('form')
          .on('blur', 'input[required], input.optional, select.required', validator.checkField)
          .on('change', 'select.required', validator.checkField)
          .on('keypress', 'input[required][pattern]', validator.keypress);

        $('.multi.required').on('keyup blur', 'input', function() {
          validator.checkField.apply($(this).siblings().last()[0]);
        });

        $('form').submit(function(e) {
          e.preventDefault();
          var submit = true;

          // evaluate the form using generic validaing
          if (!validator.checkAll($(this))) {
            submit = false;
          }

          if (submit)
            this.submit();

          return false;
  		});

  	  };

  	  	/* PNotify */

  		function init_PNotify() {

  			if( typeof (PNotify) === 'undefined'){ return; }
  			console.log('init_PNotify');

  			new PNotify({
  			  title: "PNotify",
  			  type: "info",
  			  text: "Welcome. Try hovering over me. You can click things behind me, because I'm non-blocking.",
  			  nonblock: {
  				  nonblock: true
  			  },
  			  addclass: 'dark',
  			  styling: 'bootstrap3',
  			  hide: false,
  			  before_close: function(PNotify) {
  				PNotify.update({
  				  title: PNotify.options.title + " - Enjoy your Stay",
  				  before_close: null
  				});

  				PNotify.queueRemove();

  				return false;
  			  }
  			});

  		};


  	   /* CUSTOM NOTIFICATION */

  		function init_CustomNotification() {

  			console.log('run_customtabs');

  			if( typeof (CustomTabs) === 'undefined'){ return; }
  			console.log('init_CustomTabs');

  			var cnt = 10;

  			TabbedNotification = function(options) {
  			  var message = "<div id='ntf" + cnt + "' class='text alert-" + options.type + "' style='display:none'><h2><i class='fa fa-bell'></i> " + options.title +
  				"</h2><div class='close'><a href='javascript:;' class='notification_close'><i class='fa fa-close'></i></a></div><p>" + options.text + "</p></div>";

  			  if (!document.getElementById('custom_notifications')) {
  				alert('doesnt exists');
  			  } else {
  				$('#custom_notifications ul.notifications').append("<li><a id='ntlink" + cnt + "' class='alert-" + options.type + "' href='#ntf" + cnt + "'><i class='fa fa-bell animated shake'></i></a></li>");
  				$('#custom_notifications #notif-group').append(message);
  				cnt++;
  				CustomTabs(options);
  			  }
  			};

  			CustomTabs = function(options) {
  			  $('.tabbed_notifications > div').hide();
  			  $('.tabbed_notifications > div:first-of-type').show();
  			  $('#custom_notifications').removeClass('dsp_none');
  			  $('.notifications a').click(function(e) {
  				e.preventDefault();
  				var $this = $(this),
  				  tabbed_notifications = '#' + $this.parents('.notifications').data('tabbed_notifications'),
  				  others = $this.closest('li').siblings().children('a'),
  				  target = $this.attr('href');
  				others.removeClass('active');
  				$this.addClass('active');
  				$(tabbed_notifications).children('div').hide();
  				$(target).show();
  			  });
  			};

  			CustomTabs();

  			var tabid = idname = '';

  			$(document).on('click', '.notification_close', function(e) {
  			  idname = $(this).parent().parent().attr("id");
  			  tabid = idname.substr(-2);
  			  $('#ntf' + tabid).remove();
  			  $('#ntlink' + tabid).parent().remove();
  			  $('.notifications a').first().addClass('active');
  			  $('#notif-group div').first().css('display', 'block');
  			});

  		};

  			/* EASYPIECHART */

  			function init_EasyPieChart() {

  				if( typeof ($.fn.easyPieChart) === 'undefined'){ return; }
  				console.log('init_EasyPieChart');

  				$('.chart').easyPieChart({
  				  easing: 'easeOutElastic',
  				  delay: 3000,
  				  barColor: '#26B99A',
  				  trackColor: '#fff',
  				  scaleColor: false,
  				  lineWidth: 20,
  				  trackWidth: 16,
  				  lineCap: 'butt',
  				  onStep: function(from, to, percent) {
  					$(this.el).find('.percent').text(Math.round(percent));
  				  }
  				});
  				var chart = window.chart = $('.chart').data('easyPieChart');
  				$('.js_update').on('click', function() {
  				  chart.update(Math.random() * 200 - 100);
  				});

  				//hover and retain popover when on popover content
  				var originalLeave = $.fn.popover.Constructor.prototype.leave;
  				$.fn.popover.Constructor.prototype.leave = function(obj) {
  				  var self = obj instanceof this.constructor ?
  					obj : $(obj.currentTarget)[this.type](this.getDelegateOptions()).data('bs.' + this.type);
  				  var container, timeout;

  				  originalLeave.call(this, obj);

  				  if (obj.currentTarget) {
  					container = $(obj.currentTarget).siblings('.popover');
  					timeout = self.timeout;
  					container.one('mouseenter', function() {
  					  //We entered the actual popover – call off the dogs
  					  clearTimeout(timeout);
  					  //Let's monitor popover content instead
  					  container.one('mouseleave', function() {
  						$.fn.popover.Constructor.prototype.leave.call(self, self);
  					  });
  					});
  				  }
  				};

  				$('body').popover({
  				  selector: '[data-popover]',
  				  trigger: 'click hover',
  				  delay: {
  					show: 50,
  					hide: 400
  				  }
  				});

  			};


  		function init_charts() {

  				console.log('run_charts  typeof [' + typeof (Chart) + ']');

  				if( typeof (Chart) === 'undefined'){ return; }

  				console.log('init_charts');


  				Chart.defaults.global.legend = {
  					enabled: false
  				};



  			if ($('#canvas_line').length ){

  				var canvas_line_00 = new Chart(document.getElementById("canvas_line"), {
  				  type: 'line',
  				  data: {
  					labels: ["January", "February", "March", "April", "May", "June", "July"],
  					datasets: [{
  					  label: "My First dataset",
  					  backgroundColor: "rgba(38, 185, 154, 0.31)",
  					  borderColor: "rgba(38, 185, 154, 0.7)",
  					  pointBorderColor: "rgba(38, 185, 154, 0.7)",
  					  pointBackgroundColor: "rgba(38, 185, 154, 0.7)",
  					  pointHoverBackgroundColor: "#fff",
  					  pointHoverBorderColor: "rgba(220,220,220,1)",
  					  pointBorderWidth: 1,
  					  data: [31, 74, 6, 39, 20, 85, 7]
  					}, {
  					  label: "My Second dataset",
  					  backgroundColor: "rgba(3, 88, 106, 0.3)",
  					  borderColor: "rgba(3, 88, 106, 0.70)",
  					  pointBorderColor: "rgba(3, 88, 106, 0.70)",
  					  pointBackgroundColor: "rgba(3, 88, 106, 0.70)",
  					  pointHoverBackgroundColor: "#fff",
  					  pointHoverBorderColor: "rgba(151,187,205,1)",
  					  pointBorderWidth: 1,
  					  data: [82, 23, 66, 9, 99, 4, 2]
  					}]
  				  },
  				});

  			}


  			if ($('#canvas_line1').length ){

  				var canvas_line_01 = new Chart(document.getElementById("canvas_line1"), {
  				  type: 'line',
  				  data: {
  					labels: ["January", "February", "March", "April", "May", "June", "July"],
  					datasets: [{
  					  label: "My First dataset",
  					  backgroundColor: "rgba(38, 185, 154, 0.31)",
  					  borderColor: "rgba(38, 185, 154, 0.7)",
  					  pointBorderColor: "rgba(38, 185, 154, 0.7)",
  					  pointBackgroundColor: "rgba(38, 185, 154, 0.7)",
  					  pointHoverBackgroundColor: "#fff",
  					  pointHoverBorderColor: "rgba(220,220,220,1)",
  					  pointBorderWidth: 1,
  					  data: [31, 74, 6, 39, 20, 85, 7]
  					}, {
  					  label: "My Second dataset",
  					  backgroundColor: "rgba(3, 88, 106, 0.3)",
  					  borderColor: "rgba(3, 88, 106, 0.70)",
  					  pointBorderColor: "rgba(3, 88, 106, 0.70)",
  					  pointBackgroundColor: "rgba(3, 88, 106, 0.70)",
  					  pointHoverBackgroundColor: "#fff",
  					  pointHoverBorderColor: "rgba(151,187,205,1)",
  					  pointBorderWidth: 1,
  					  data: [82, 23, 66, 9, 99, 4, 2]
  					}]
  				  },
  				});

  			}


  			if ($('#canvas_line2').length ){

  				var canvas_line_02 = new Chart(document.getElementById("canvas_line2"), {
  				  type: 'line',
  				  data: {
  					labels: ["January", "February", "March", "April", "May", "June", "July"],
  					datasets: [{
  					  label: "My First dataset",
  					  backgroundColor: "rgba(38, 185, 154, 0.31)",
  					  borderColor: "rgba(38, 185, 154, 0.7)",
  					  pointBorderColor: "rgba(38, 185, 154, 0.7)",
  					  pointBackgroundColor: "rgba(38, 185, 154, 0.7)",
  					  pointHoverBackgroundColor: "#fff",
  					  pointHoverBorderColor: "rgba(220,220,220,1)",
  					  pointBorderWidth: 1,
  					  data: [31, 74, 6, 39, 20, 85, 7]
  					}, {
  					  label: "My Second dataset",
  					  backgroundColor: "rgba(3, 88, 106, 0.3)",
  					  borderColor: "rgba(3, 88, 106, 0.70)",
  					  pointBorderColor: "rgba(3, 88, 106, 0.70)",
  					  pointBackgroundColor: "rgba(3, 88, 106, 0.70)",
  					  pointHoverBackgroundColor: "#fff",
  					  pointHoverBorderColor: "rgba(151,187,205,1)",
  					  pointBorderWidth: 1,
  					  data: [82, 23, 66, 9, 99, 4, 2]
  					}]
  				  },
  				});

  			}


  			if ($('#canvas_line3').length ){

  				var canvas_line_03 = new Chart(document.getElementById("canvas_line3"), {
  				  type: 'line',
  				  data: {
  					labels: ["January", "February", "March", "April", "May", "June", "July"],
  					datasets: [{
  					  label: "My First dataset",
  					  backgroundColor: "rgba(38, 185, 154, 0.31)",
  					  borderColor: "rgba(38, 185, 154, 0.7)",
  					  pointBorderColor: "rgba(38, 185, 154, 0.7)",
  					  pointBackgroundColor: "rgba(38, 185, 154, 0.7)",
  					  pointHoverBackgroundColor: "#fff",
  					  pointHoverBorderColor: "rgba(220,220,220,1)",
  					  pointBorderWidth: 1,
  					  data: [31, 74, 6, 39, 20, 85, 7]
  					}, {
  					  label: "My Second dataset",
  					  backgroundColor: "rgba(3, 88, 106, 0.3)",
  					  borderColor: "rgba(3, 88, 106, 0.70)",
  					  pointBorderColor: "rgba(3, 88, 106, 0.70)",
  					  pointBackgroundColor: "rgba(3, 88, 106, 0.70)",
  					  pointHoverBackgroundColor: "#fff",
  					  pointHoverBorderColor: "rgba(151,187,205,1)",
  					  pointBorderWidth: 1,
  					  data: [82, 23, 66, 9, 99, 4, 2]
  					}]
  				  },
  				});

  			}


  			if ($('#canvas_line4').length ){

  				var canvas_line_04 = new Chart(document.getElementById("canvas_line4"), {
  				  type: 'line',
  				  data: {
  					labels: ["January", "February", "March", "April", "May", "June", "July"],
  					datasets: [{
  					  label: "My First dataset",
  					  backgroundColor: "rgba(38, 185, 154, 0.31)",
  					  borderColor: "rgba(38, 185, 154, 0.7)",
  					  pointBorderColor: "rgba(38, 185, 154, 0.7)",
  					  pointBackgroundColor: "rgba(38, 185, 154, 0.7)",
  					  pointHoverBackgroundColor: "#fff",
  					  pointHoverBorderColor: "rgba(220,220,220,1)",
  					  pointBorderWidth: 1,
  					  data: [31, 74, 6, 39, 20, 85, 7]
  					}, {
  					  label: "My Second dataset",
  					  backgroundColor: "rgba(3, 88, 106, 0.3)",
  					  borderColor: "rgba(3, 88, 106, 0.70)",
  					  pointBorderColor: "rgba(3, 88, 106, 0.70)",
  					  pointBackgroundColor: "rgba(3, 88, 106, 0.70)",
  					  pointHoverBackgroundColor: "#fff",
  					  pointHoverBorderColor: "rgba(151,187,205,1)",
  					  pointBorderWidth: 1,
  					  data: [82, 23, 66, 9, 99, 4, 2]
  					}]
  				  },
  				});

  			}


  			  // Line chart

  			if ($('#lineChart').length ){

  			  var ctx = document.getElementById("lineChart");
  			  var lineChart = new Chart(ctx, {
  				type: 'line',
  				data: {
  				  labels: ["January", "February", "March", "April", "May", "June", "July"],
  				  datasets: [{
  					label: "My First dataset",
  					backgroundColor: "rgba(38, 185, 154, 0.31)",
  					borderColor: "rgba(38, 185, 154, 0.7)",
  					pointBorderColor: "rgba(38, 185, 154, 0.7)",
  					pointBackgroundColor: "rgba(38, 185, 154, 0.7)",
  					pointHoverBackgroundColor: "#fff",
  					pointHoverBorderColor: "rgba(220,220,220,1)",
  					pointBorderWidth: 1,
  					data: [31, 74, 6, 39, 20, 85, 7]
  				  }, {
  					label: "My Second dataset",
  					backgroundColor: "rgba(3, 88, 106, 0.3)",
  					borderColor: "rgba(3, 88, 106, 0.70)",
  					pointBorderColor: "rgba(3, 88, 106, 0.70)",
  					pointBackgroundColor: "rgba(3, 88, 106, 0.70)",
  					pointHoverBackgroundColor: "#fff",
  					pointHoverBorderColor: "rgba(151,187,205,1)",
  					pointBorderWidth: 1,
  					data: [82, 23, 66, 9, 99, 4, 2]
  				  }]
  				},
  			  });

  			}

  			  // Bar chart

  			if ($('#mybarChart').length ){

  			  var ctx = document.getElementById("mybarChart");
  			  var mybarChart = new Chart(ctx, {
  				type: 'bar',
  				data: {
  				  labels: ["January", "February", "March", "April", "May", "June", "July"],
  				  datasets: [{
  					label: '# of Votes',
  					backgroundColor: "#26B99A",
  					data: [51, 30, 40, 28, 92, 50, 45]
  				  }, {
  					label: '# of Votes',
  					backgroundColor: "#03586A",
  					data: [41, 56, 25, 48, 72, 34, 12]
  				  }]
  				},

  				options: {
  				  scales: {
  					yAxes: [{
  					  ticks: {
  						beginAtZero: true
  					  }
  					}]
  				  }
  				}
  			  });

  			}


  			  // Doughnut chart

  			if ($('#canvasDoughnut').length ){

  			  var ctx = document.getElementById("canvasDoughnut");
  			  var data = {
  				labels: [
  				  "Dark Grey",
  				  "Purple Color",
  				  "Gray Color",
  				  "Green Color",
  				  "Blue Color"
  				],
  				datasets: [{
  				  data: [120, 50, 140, 180, 100],
  				  backgroundColor: [
  					"#455C73",
  					"#9B59B6",
  					"#BDC3C7",
  					"#26B99A",
  					"#3498DB"
  				  ],
  				  hoverBackgroundColor: [
  					"#34495E",
  					"#B370CF",
  					"#CFD4D8",
  					"#36CAAB",
  					"#49A9EA"
  				  ]

  				}]
  			  };

  			  var canvasDoughnut = new Chart(ctx, {
  				type: 'doughnut',
  				tooltipFillColor: "rgba(51, 51, 51, 0.55)",
  				data: data
  			  });

  			}

  			  // Radar chart

  			if ($('#canvasRadar').length ){

  			  var ctx = document.getElementById("canvasRadar");
  			  var data = {
  				labels: ["Eating", "Drinking", "Sleeping", "Designing", "Coding", "Cycling", "Running"],
  				datasets: [{
  				  label: "My First dataset",
  				  backgroundColor: "rgba(3, 88, 106, 0.2)",
  				  borderColor: "rgba(3, 88, 106, 0.80)",
  				  pointBorderColor: "rgba(3, 88, 106, 0.80)",
  				  pointBackgroundColor: "rgba(3, 88, 106, 0.80)",
  				  pointHoverBackgroundColor: "#fff",
  				  pointHoverBorderColor: "rgba(220,220,220,1)",
  				  data: [65, 59, 90, 81, 56, 55, 40]
  				}, {
  				  label: "My Second dataset",
  				  backgroundColor: "rgba(38, 185, 154, 0.2)",
  				  borderColor: "rgba(38, 185, 154, 0.85)",
  				  pointColor: "rgba(38, 185, 154, 0.85)",
  				  pointStrokeColor: "#fff",
  				  pointHighlightFill: "#fff",
  				  pointHighlightStroke: "rgba(151,187,205,1)",
  				  data: [28, 48, 40, 19, 96, 27, 100]
  				}]
  			  };

  			  var canvasRadar = new Chart(ctx, {
  				type: 'radar',
  				data: data,
  			  });

  			}


  			  // Pie chart
  			  if ($('#pieChart').length ){

  				  var ctx = document.getElementById("pieChart");
  				  var data = {
  					datasets: [{
  					  data: [120, 50, 140, 180, 100],
  					  backgroundColor: [
  						"#455C73",
  						"#9B59B6",
  						"#BDC3C7",
  						"#26B99A",
  						"#3498DB"
  					  ],
  					  label: 'My dataset' // for legend
  					}],
  					labels: [
  					  "Dark Gray",
  					  "Purple",
  					  "Gray",
  					  "Green",
  					  "Blue"
  					]
  				  };

  				  var pieChart = new Chart(ctx, {
  					data: data,
  					type: 'pie',
  					otpions: {
  					  legend: false
  					}
  				  });

  			  }


  			  // PolarArea chart

  			if ($('#polarArea').length ){

  				var ctx = document.getElementById("polarArea");
  				var data = {
  				datasets: [{
  				  data: [120, 50, 140, 180, 100],
  				  backgroundColor: [
  					"#455C73",
  					"#9B59B6",
  					"#BDC3C7",
  					"#26B99A",
  					"#3498DB"
  				  ],
  				  label: 'My dataset'
  				}],
  				labels: [
  				  "Dark Gray",
  				  "Purple",
  				  "Gray",
  				  "Green",
  				  "Blue"
  				]
  				};

  				var polarArea = new Chart(ctx, {
  				data: data,
  				type: 'polarArea',
  				options: {
  				  scale: {
  					ticks: {
  					  beginAtZero: true
  					}
  				  }
  				}
  				});

  			}
  		}

  		/* COMPOSE */

  		function init_compose() {

  			if( typeof ($.fn.slideToggle) === 'undefined'){ return; }
  			console.log('init_compose');

  			$('#compose, .compose-close').click(function(){
  				$('.compose').slideToggle();
  			});

  		};

  	   	/* CALENDAR */

  		    function  init_calendar() {

  				if( typeof ($.fn.fullCalendar) === 'undefined'){ return; }
  				console.log('init_calendar');

  				var date = new Date(),
  					d = date.getDate(),
  					m = date.getMonth(),
  					y = date.getFullYear(),
  					started,
  					categoryClass;

  				var calendar = $('#calendar').fullCalendar({
  				  header: {
  					left: 'prev,next today',
  					center: 'title',
  					right: 'month,agendaWeek,agendaDay,listMonth'
  				  },
  				  selectable: true,
  				  selectHelper: true,
  				  select: function(start, end, allDay) {
  					$('#fc_create').click();

  					started = start;
  					ended = end;

  					$(".antosubmit").on("click", function() {
  					  var title = $("#title").val();
  					  if (end) {
  						ended = end;
  					  }

  					  categoryClass = $("#event_type").val();

  					  if (title) {
  						calendar.fullCalendar('renderEvent', {
  							title: title,
  							start: started,
  							end: end,
  							allDay: allDay
  						  },
  						  true // make the event "stick"
  						);
  					  }

  					  $('#title').val('');

  					  calendar.fullCalendar('unselect');

  					  $('.antoclose').click();

  					  return false;
  					});
  				  },
  				  eventClick: function(calEvent, jsEvent, view) {
  					$('#fc_edit').click();
  					$('#title2').val(calEvent.title);

  					categoryClass = $("#event_type").val();

  					$(".antosubmit2").on("click", function() {
  					  calEvent.title = $("#title2").val();

  					  calendar.fullCalendar('updateEvent', calEvent);
  					  $('.antoclose2').click();
  					});

  					calendar.fullCalendar('unselect');
  				  },
  				  editable: true,
  				  events: [{
  					title: 'All Day Event',
  					start: new Date(y, m, 1)
  				  }, {
  					title: 'Long Event',
  					start: new Date(y, m, d - 5),
  					end: new Date(y, m, d - 2)
  				  }, {
  					title: 'Meeting',
  					start: new Date(y, m, d, 10, 30),
  					allDay: false
  				  }, {
  					title: 'Lunch',
  					start: new Date(y, m, d + 14, 12, 0),
  					end: new Date(y, m, d, 14, 0),
  					allDay: false
  				  }, {
  					title: 'Birthday Party',
  					start: new Date(y, m, d + 1, 19, 0),
  					end: new Date(y, m, d + 1, 22, 30),
  					allDay: false
  				  }, {
  					title: 'Click for Google',
  					start: new Date(y, m, 28),
  					end: new Date(y, m, 29),
  					url: 'http://google.com/'
  				  }]
  				});

  			};

  		/* DATA TABLES */

  			function init_DataTables() {

  				console.log('run_datatables');

  				if( typeof ($.fn.DataTable) === 'undefined'){ return; }
  				console.log('init_DataTables');

  				var handleDataTableButtons = function() {
  				  if ($("#datatable-buttons").length) {
  					$("#datatable-buttons").DataTable({
  					  dom: "Bfrtip",
  					  buttons: [
  						{
  						  extend: "copy",
  						  className: "btn-sm"
  						},
  						{
  						  extend: "csv",
  						  className: "btn-sm"
  						},
  						{
  						  extend: "excel",
  						  className: "btn-sm"
  						},
  						{
  						  extend: "pdfHtml5",
  						  className: "btn-sm"
  						},
  						{
  						  extend: "print",
  						  className: "btn-sm"
  						},
  					  ],
  					  responsive: true
  					});
  				  }
  				};

  				TableManageButtons = function() {
  				  "use strict";
  				  return {
  					init: function() {
  					  handleDataTableButtons();
  					}
  				  };
  				}();

  				$('#datatable').dataTable();

  				$('#datatable-keytable').DataTable({
  				  keys: true
  				});

  				$('#datatable-responsive').DataTable();

  				$('#datatable-scroller').DataTable({
  				  ajax: "js/datatables/json/scroller-demo.json",
  				  deferRender: true,
  				  scrollY: 380,
  				  scrollCollapse: true,
  				  scroller: true
  				});

  				$('#datatable-fixed-header').DataTable({
  				  fixedHeader: true
  				});

  				var $datatable = $('#datatable-checkbox');

  				$datatable.dataTable({
  				  'order': [[ 1, 'asc' ]],
  				  'columnDefs': [
  					{ orderable: false, targets: [0] }
  				  ]
  				});
  				$datatable.on('draw.dt', function() {
  				  $('checkbox input').iCheck({
  					checkboxClass: 'icheckbox_flat-green'
  				  });
  				});

  				TableManageButtons.init();

  			};

  			/* CHART - MORRIS  */

  		function init_morris_charts() {

  			if( typeof (Morris) === 'undefined'){ return; }
  			console.log('init_morris_charts');

  			if ($('#graph_bar').length){

  				Morris.Bar({
  				  element: 'graph_bar',
  				  data: [
  					{device: 'iPhone 4', geekbench: 380},
  					{device: 'iPhone 4S', geekbench: 655},
  					{device: 'iPhone 3GS', geekbench: 275},
  					{device: 'iPhone 5', geekbench: 1571},
  					{device: 'iPhone 5S', geekbench: 655},
  					{device: 'iPhone 6', geekbench: 2154},
  					{device: 'iPhone 6 Plus', geekbench: 1144},
  					{device: 'iPhone 6S', geekbench: 2371},
  					{device: 'iPhone 6S Plus', geekbench: 1471},
  					{device: 'Other', geekbench: 1371}
  				  ],
  				  xkey: 'device',
  				  ykeys: ['geekbench'],
  				  labels: ['Geekbench'],
  				  barRatio: 0.4,
  				  barColors: ['#26B99A', '#34495E', '#ACADAC', '#3498DB'],
  				  xLabelAngle: 35,
  				  hideHover: 'auto',
  				  resize: true
  				});

  			}

  			if ($('#graph_bar_group').length ){

  				Morris.Bar({
  				  element: 'graph_bar_group',
  				  data: [
  					{"period": "2016-10-01", "licensed": 807, "sorned": 660},
  					{"period": "2016-09-30", "licensed": 1251, "sorned": 729},
  					{"period": "2016-09-29", "licensed": 1769, "sorned": 1018},
  					{"period": "2016-09-20", "licensed": 2246, "sorned": 1461},
  					{"period": "2016-09-19", "licensed": 2657, "sorned": 1967},
  					{"period": "2016-09-18", "licensed": 3148, "sorned": 2627},
  					{"period": "2016-09-17", "licensed": 3471, "sorned": 3740},
  					{"period": "2016-09-16", "licensed": 2871, "sorned": 2216},
  					{"period": "2016-09-15", "licensed": 2401, "sorned": 1656},
  					{"period": "2016-09-10", "licensed": 2115, "sorned": 1022}
  				  ],
  				  xkey: 'period',
  				  barColors: ['#26B99A', '#34495E', '#ACADAC', '#3498DB'],
  				  ykeys: ['licensed', 'sorned'],
  				  labels: ['Licensed', 'SORN'],
  				  hideHover: 'auto',
  				  xLabelAngle: 60,
  				  resize: true
  				});

  			}

  			if ($('#graphx').length ){

  				Morris.Bar({
  				  element: 'graphx',
  				  data: [
  					{x: '2015 Q1', y: 2, z: 3, a: 4},
  					{x: '2015 Q2', y: 3, z: 5, a: 6},
  					{x: '2015 Q3', y: 4, z: 3, a: 2},
  					{x: '2015 Q4', y: 2, z: 4, a: 5}
  				  ],
  				  xkey: 'x',
  				  ykeys: ['y', 'z', 'a'],
  				  barColors: ['#26B99A', '#34495E', '#ACADAC', '#3498DB'],
  				  hideHover: 'auto',
  				  labels: ['Y', 'Z', 'A'],
  				  resize: true
  				}).on('click', function (i, row) {
  					console.log(i, row);
  				});

  			}

  			if ($('#graph_area').length ){

  				Morris.Area({
  				  element: 'graph_area',
  				  data: [
  					{period: '2014 Q1', iphone: 2666, ipad: null, itouch: 2647},
  					{period: '2014 Q2', iphone: 2778, ipad: 2294, itouch: 2441},
  					{period: '2014 Q3', iphone: 4912, ipad: 1969, itouch: 2501},
  					{period: '2014 Q4', iphone: 3767, ipad: 3597, itouch: 5689},
  					{period: '2015 Q1', iphone: 6810, ipad: 1914, itouch: 2293},
  					{period: '2015 Q2', iphone: 5670, ipad: 4293, itouch: 1881},
  					{period: '2015 Q3', iphone: 4820, ipad: 3795, itouch: 1588},
  					{period: '2015 Q4', iphone: 15073, ipad: 5967, itouch: 5175},
  					{period: '2016 Q1', iphone: 10687, ipad: 4460, itouch: 2028},
  					{period: '2016 Q2', iphone: 8432, ipad: 5713, itouch: 1791}
  				  ],
  				  xkey: 'period',
  				  ykeys: ['iphone', 'ipad', 'itouch'],
  				  lineColors: ['#26B99A', '#34495E', '#ACADAC', '#3498DB'],
  				  labels: ['iPhone', 'iPad', 'iPod Touch'],
  				  pointSize: 2,
  				  hideHover: 'auto',
  				  resize: true
  				});

  			}

  			if ($('#graph_donut').length ){

  				Morris.Donut({
  				  element: 'graph_donut',
  				  data: [
  					{label: 'Jam', value: 25},
  					{label: 'Frosted', value: 40},
  					{label: 'Custard', value: 25},
  					{label: 'Sugar', value: 10}
  				  ],
  				  colors: ['#26B99A', '#34495E', '#ACADAC', '#3498DB'],
  				  formatter: function (y) {
  					return y + "%";
  				  },
  				  resize: true
  				});

  			}

  			if ($('#graph_line').length ){

  				Morris.Line({
  				  element: 'graph_line',
  				  xkey: 'year',
  				  ykeys: ['value'],
  				  labels: ['Value'],
  				  hideHover: 'auto',
  				  lineColors: ['#26B99A', '#34495E', '#ACADAC', '#3498DB'],
  				  data: [
  					{year: '2012', value: 20},
  					{year: '2013', value: 10},
  					{year: '2014', value: 5},
  					{year: '2015', value: 5},
  					{year: '2016', value: 20}
  				  ],
  				  resize: true
  				});

  				$MENU_TOGGLE.on('click', function() {
  				  $(window).resize();
  				});

  			}

  		};



  		/* ECHRTS */


  		function init_echarts() {

  				if( typeof (echarts) === 'undefined'){ return; }
  				console.log('init_echarts');


  				  var theme = {
  				  color: [
  					  '#26B99A', '#34495E', '#BDC3C7', '#3498DB',
  					  '#9B59B6', '#8abb6f', '#759c6a', '#bfd3b7'
  				  ],

  				  title: {
  					  itemGap: 8,
  					  textStyle: {
  						  fontWeight: 'normal',
  						  color: '#408829'
  					  }
  				  },

  				  dataRange: {
  					  color: ['#1f610a', '#97b58d']
  				  },

  				  toolbox: {
  					  color: ['#408829', '#408829', '#408829', '#408829']
  				  },

  				  tooltip: {
  					  backgroundColor: 'rgba(0,0,0,0.5)',
  					  axisPointer: {
  						  type: 'line',
  						  lineStyle: {
  							  color: '#408829',
  							  type: 'dashed'
  						  },
  						  crossStyle: {
  							  color: '#408829'
  						  },
  						  shadowStyle: {
  							  color: 'rgba(200,200,200,0.3)'
  						  }
  					  }
  				  },

  				  dataZoom: {
  					  dataBackgroundColor: '#eee',
  					  fillerColor: 'rgba(64,136,41,0.2)',
  					  handleColor: '#408829'
  				  },
  				  grid: {
  					  borderWidth: 0
  				  },

  				  categoryAxis: {
  					  axisLine: {
  						  lineStyle: {
  							  color: '#408829'
  						  }
  					  },
  					  splitLine: {
  						  lineStyle: {
  							  color: ['#eee']
  						  }
  					  }
  				  },

  				  valueAxis: {
  					  axisLine: {
  						  lineStyle: {
  							  color: '#408829'
  						  }
  					  },
  					  splitArea: {
  						  show: true,
  						  areaStyle: {
  							  color: ['rgba(250,250,250,0.1)', 'rgba(200,200,200,0.1)']
  						  }
  					  },
  					  splitLine: {
  						  lineStyle: {
  							  color: ['#eee']
  						  }
  					  }
  				  },
  				  timeline: {
  					  lineStyle: {
  						  color: '#408829'
  					  },
  					  controlStyle: {
  						  normal: {color: '#408829'},
  						  emphasis: {color: '#408829'}
  					  }
  				  },

  				  k: {
  					  itemStyle: {
  						  normal: {
  							  color: '#68a54a',
  							  color0: '#a9cba2',
  							  lineStyle: {
  								  width: 1,
  								  color: '#408829',
  								  color0: '#86b379'
  							  }
  						  }
  					  }
  				  },
  				  map: {
  					  itemStyle: {
  						  normal: {
  							  areaStyle: {
  								  color: '#ddd'
  							  },
  							  label: {
  								  textStyle: {
  									  color: '#c12e34'
  								  }
  							  }
  						  },
  						  emphasis: {
  							  areaStyle: {
  								  color: '#99d2dd'
  							  },
  							  label: {
  								  textStyle: {
  									  color: '#c12e34'
  								  }
  							  }
  						  }
  					  }
  				  },
  				  force: {
  					  itemStyle: {
  						  normal: {
  							  linkStyle: {
  								  strokeColor: '#408829'
  							  }
  						  }
  					  }
  				  },
  				  chord: {
  					  padding: 4,
  					  itemStyle: {
  						  normal: {
  							  lineStyle: {
  								  width: 1,
  								  color: 'rgba(128, 128, 128, 0.5)'
  							  },
  							  chordStyle: {
  								  lineStyle: {
  									  width: 1,
  									  color: 'rgba(128, 128, 128, 0.5)'
  								  }
  							  }
  						  },
  						  emphasis: {
  							  lineStyle: {
  								  width: 1,
  								  color: 'rgba(128, 128, 128, 0.5)'
  							  },
  							  chordStyle: {
  								  lineStyle: {
  									  width: 1,
  									  color: 'rgba(128, 128, 128, 0.5)'
  								  }
  							  }
  						  }
  					  }
  				  },
  				  gauge: {
  					  startAngle: 225,
  					  endAngle: -45,
  					  axisLine: {
  						  show: true,
  						  lineStyle: {
  							  color: [[0.2, '#86b379'], [0.8, '#68a54a'], [1, '#408829']],
  							  width: 8
  						  }
  					  },
  					  axisTick: {
  						  splitNumber: 10,
  						  length: 12,
  						  lineStyle: {
  							  color: 'auto'
  						  }
  					  },
  					  axisLabel: {
  						  textStyle: {
  							  color: 'auto'
  						  }
  					  },
  					  splitLine: {
  						  length: 18,
  						  lineStyle: {
  							  color: 'auto'
  						  }
  					  },
  					  pointer: {
  						  length: '90%',
  						  color: 'auto'
  					  },
  					  title: {
  						  textStyle: {
  							  color: '#333'
  						  }
  					  },
  					  detail: {
  						  textStyle: {
  							  color: 'auto'
  						  }
  					  }
  				  },
  				  textStyle: {
  					  fontFamily: 'Arial, Verdana, sans-serif'
  				  }
  			  };


  			  //echart Bar

  			if ($('#mainb').length ){

  				  var echartBar = echarts.init(document.getElementById('mainb'), theme);

  				  echartBar.setOption({
  					title: {
  					  text: 'Graph title',
  					  subtext: 'Graph Sub-text'
  					},
  					tooltip: {
  					  trigger: 'axis'
  					},
  					legend: {
  					  data: ['sales', 'purchases']
  					},
  					toolbox: {
  					  show: false
  					},
  					calculable: false,
  					xAxis: [{
  					  type: 'category',
  					  data: ['1?', '2?', '3?', '4?', '5?', '6?', '7?', '8?', '9?', '10?', '11?', '12?']
  					}],
  					yAxis: [{
  					  type: 'value'
  					}],
  					series: [{
  					  name: 'sales',
  					  type: 'bar',
  					  data: [2.0, 4.9, 7.0, 23.2, 25.6, 76.7, 135.6, 162.2, 32.6, 20.0, 6.4, 3.3],
  					  markPoint: {
  						data: [{
  						  type: 'max',
  						  name: '???'
  						}, {
  						  type: 'min',
  						  name: '???'
  						}]
  					  },
  					  markLine: {
  						data: [{
  						  type: 'average',
  						  name: '???'
  						}]
  					  }
  					}, {
  					  name: 'purchases',
  					  type: 'bar',
  					  data: [2.6, 5.9, 9.0, 26.4, 28.7, 70.7, 175.6, 182.2, 48.7, 18.8, 6.0, 2.3],
  					  markPoint: {
  						data: [{
  						  name: 'sales',
  						  value: 182.2,
  						  xAxis: 7,
  						  yAxis: 183,
  						}, {
  						  name: 'purchases',
  						  value: 2.3,
  						  xAxis: 11,
  						  yAxis: 3
  						}]
  					  },
  					  markLine: {
  						data: [{
  						  type: 'average',
  						  name: '???'
  						}]
  					  }
  					}]
  				  });

  			}




  			   //echart Radar

  			if ($('#echart_sonar').length ){

  			  var echartRadar = echarts.init(document.getElementById('echart_sonar'), theme);

  			  echartRadar.setOption({
  				title: {
  				  text: 'Budget vs spending',
  				  subtext: 'Subtitle'
  				},
  				 tooltip: {
  					trigger: 'item'
  				},
  				legend: {
  				  orient: 'vertical',
  				  x: 'right',
  				  y: 'bottom',
  				  data: ['Allocated Budget', 'Actual Spending']
  				},
  				toolbox: {
  				  show: true,
  				  feature: {
  					restore: {
  					  show: true,
  					  title: "Restore"
  					},
  					saveAsImage: {
  					  show: true,
  					  title: "Save Image"
  					}
  				  }
  				},
  				polar: [{
  				  indicator: [{
  					text: 'Sales',
  					max: 6000
  				  }, {
  					text: 'Administration',
  					max: 16000
  				  }, {
  					text: 'Information Techology',
  					max: 30000
  				  }, {
  					text: 'Customer Support',
  					max: 38000
  				  }, {
  					text: 'Development',
  					max: 52000
  				  }, {
  					text: 'Marketing',
  					max: 25000
  				  }]
  				}],
  				calculable: true,
  				series: [{
  				  name: 'Budget vs spending',
  				  type: 'radar',
  				  data: [{
  					value: [4300, 10000, 28000, 35000, 50000, 19000],
  					name: 'Allocated Budget'
  				  }, {
  					value: [5000, 14000, 28000, 31000, 42000, 21000],
  					name: 'Actual Spending'
  				  }]
  				}]
  			  });

  			}

  			   //echart Funnel

  			if ($('#echart_pyramid').length ){

  			  var echartFunnel = echarts.init(document.getElementById('echart_pyramid'), theme);

  			  echartFunnel.setOption({
  				title: {
  				  text: 'Echart Pyramid Graph',
  				  subtext: 'Subtitle'
  				},
  				tooltip: {
  				  trigger: 'item',
  				  formatter: "{a} <br/>{b} : {c}%"
  				},
  				toolbox: {
  				  show: true,
  				  feature: {
  					restore: {
  					  show: true,
  					  title: "Restore"
  					},
  					saveAsImage: {
  					  show: true,
  					  title: "Save Image"
  					}
  				  }
  				},
  				legend: {
  				  data: ['Something #1', 'Something #2', 'Something #3', 'Something #4', 'Something #5'],
  				  orient: 'vertical',
  				  x: 'left',
  				  y: 'bottom'
  				},
  				calculable: true,
  				series: [{
  				  name: '漏斗图',
  				  type: 'funnel',
  				  width: '40%',
  				  data: [{
  					value: 60,
  					name: 'Something #1'
  				  }, {
  					value: 40,
  					name: 'Something #2'
  				  }, {
  					value: 20,
  					name: 'Something #3'
  				  }, {
  					value: 80,
  					name: 'Something #4'
  				  }, {
  					value: 100,
  					name: 'Something #5'
  				  }]
  				}]
  			  });

  			}

  			   //echart Gauge

  			if ($('#echart_gauge').length ){

  			  var echartGauge = echarts.init(document.getElementById('echart_gauge'), theme);

  			  echartGauge.setOption({
  				tooltip: {
  				  formatter: "{a} <br/>{b} : {c}%"
  				},
  				toolbox: {
  				  show: true,
  				  feature: {
  					restore: {
  					  show: true,
  					  title: "Restore"
  					},
  					saveAsImage: {
  					  show: true,
  					  title: "Save Image"
  					}
  				  }
  				},
  				series: [{
  				  name: 'Performance',
  				  type: 'gauge',
  				  center: ['50%', '50%'],
  				  startAngle: 140,
  				  endAngle: -140,
  				  min: 0,
  				  max: 100,
  				  precision: 0,
  				  splitNumber: 10,
  				  axisLine: {
  					show: true,
  					lineStyle: {
  					  color: [
  						[0.2, 'lightgreen'],
  						[0.4, 'orange'],
  						[0.8, 'skyblue'],
  						[1, '#ff4500']
  					  ],
  					  width: 30
  					}
  				  },
  				  axisTick: {
  					show: true,
  					splitNumber: 5,
  					length: 8,
  					lineStyle: {
  					  color: '#eee',
  					  width: 1,
  					  type: 'solid'
  					}
  				  },
  				  axisLabel: {
  					show: true,
  					formatter: function(v) {
  					  switch (v + '') {
  						case '10':
  						  return 'a';
  						case '30':
  						  return 'b';
  						case '60':
  						  return 'c';
  						case '90':
  						  return 'd';
  						default:
  						  return '';
  					  }
  					},
  					textStyle: {
  					  color: '#333'
  					}
  				  },
  				  splitLine: {
  					show: true,
  					length: 30,
  					lineStyle: {
  					  color: '#eee',
  					  width: 2,
  					  type: 'solid'
  					}
  				  },
  				  pointer: {
  					length: '80%',
  					width: 8,
  					color: 'auto'
  				  },
  				  title: {
  					show: true,
  					offsetCenter: ['-65%', -10],
  					textStyle: {
  					  color: '#333',
  					  fontSize: 15
  					}
  				  },
  				  detail: {
  					show: true,
  					backgroundColor: 'rgba(0,0,0,0)',
  					borderWidth: 0,
  					borderColor: '#ccc',
  					width: 100,
  					height: 40,
  					offsetCenter: ['-60%', 10],
  					formatter: '{value}%',
  					textStyle: {
  					  color: 'auto',
  					  fontSize: 30
  					}
  				  },
  				  data: [{
  					value: 50,
  					name: 'Performance'
  				  }]
  				}]
  			  });

  			}

  			   //echart Line

  			if ($('#echart_line').length ){

  			  var echartLine = echarts.init(document.getElementById('echart_line'), theme);

  			  echartLine.setOption({
  				title: {
  				  text: 'Line Graph',
  				  subtext: 'Subtitle'
  				},
  				tooltip: {
  				  trigger: 'axis'
  				},
  				legend: {
  				  x: 220,
  				  y: 40,
  				  data: ['Intent', 'Pre-order', 'Deal']
  				},
  				toolbox: {
  				  show: true,
  				  feature: {
  					magicType: {
  					  show: true,
  					  title: {
  						line: 'Line',
  						bar: 'Bar',
  						stack: 'Stack',
  						tiled: 'Tiled'
  					  },
  					  type: ['line', 'bar', 'stack', 'tiled']
  					},
  					restore: {
  					  show: true,
  					  title: "Restore"
  					},
  					saveAsImage: {
  					  show: true,
  					  title: "Save Image"
  					}
  				  }
  				},
  				calculable: true,
  				xAxis: [{
  				  type: 'category',
  				  boundaryGap: false,
  				  data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  				}],
  				yAxis: [{
  				  type: 'value'
  				}],
  				series: [{
  				  name: 'Deal',
  				  type: 'line',
  				  smooth: true,
  				  itemStyle: {
  					normal: {
  					  areaStyle: {
  						type: 'default'
  					  }
  					}
  				  },
  				  data: [10, 12, 21, 54, 260, 830, 710]
  				}, {
  				  name: 'Pre-order',
  				  type: 'line',
  				  smooth: true,
  				  itemStyle: {
  					normal: {
  					  areaStyle: {
  						type: 'default'
  					  }
  					}
  				  },
  				  data: [30, 182, 434, 791, 390, 30, 10]
  				}, {
  				  name: 'Intent',
  				  type: 'line',
  				  smooth: true,
  				  itemStyle: {
  					normal: {
  					  areaStyle: {
  						type: 'default'
  					  }
  					}
  				  },
  				  data: [1320, 1132, 601, 234, 120, 90, 20]
  				}]
  			  });

  			}

  			   //echart Scatter

  			if ($('#echart_scatter').length ){

  			  var echartScatter = echarts.init(document.getElementById('echart_scatter'), theme);

  			  echartScatter.setOption({
  				title: {
  				  text: 'Scatter Graph',
  				  subtext: 'Heinz  2003'
  				},
  				tooltip: {
  				  trigger: 'axis',
  				  showDelay: 0,
  				  axisPointer: {
  					type: 'cross',
  					lineStyle: {
  					  type: 'dashed',
  					  width: 1
  					}
  				  }
  				},
  				legend: {
  				  data: ['Data2', 'Data1']
  				},
  				toolbox: {
  				  show: true,
  				  feature: {
  					saveAsImage: {
  					  show: true,
  					  title: "Save Image"
  					}
  				  }
  				},
  				xAxis: [{
  				  type: 'value',
  				  scale: true,
  				  axisLabel: {
  					formatter: '{value} cm'
  				  }
  				}],
  				yAxis: [{
  				  type: 'value',
  				  scale: true,
  				  axisLabel: {
  					formatter: '{value} kg'
  				  }
  				}],
  				series: [{
  				  name: 'Data1',
  				  type: 'scatter',
  				  tooltip: {
  					trigger: 'item',
  					formatter: function(params) {
  					  if (params.value.length > 1) {
  						return params.seriesName + ' :<br/>' + params.value[0] + 'cm ' + params.value[1] + 'kg ';
  					  } else {
  						return params.seriesName + ' :<br/>' + params.name + ' : ' + params.value + 'kg ';
  					  }
  					}
  				  },
  				  data: [
  					[161.2, 51.6],
  					[167.5, 59.0],
  					[159.5, 49.2],
  					[157.0, 63.0],
  					[155.8, 53.6],
  					[170.0, 59.0],
  					[159.1, 47.6],
  					[166.0, 69.8],
  					[176.2, 66.8],
  					[160.2, 75.2],
  					[172.5, 55.2],
  					[170.9, 54.2],
  					[172.9, 62.5],
  					[153.4, 42.0],
  					[160.0, 50.0],
  					[147.2, 49.8],
  					[168.2, 49.2],
  					[175.0, 73.2],
  					[157.0, 47.8],
  					[167.6, 68.8],
  					[159.5, 50.6],
  					[175.0, 82.5],
  					[166.8, 57.2],
  					[176.5, 87.8],
  					[170.2, 72.8],
  					[174.0, 54.5],
  					[173.0, 59.8],
  					[179.9, 67.3],
  					[170.5, 67.8],
  					[160.0, 47.0],
  					[154.4, 46.2],
  					[162.0, 55.0],
  					[176.5, 83.0],
  					[160.0, 54.4],
  					[152.0, 45.8],
  					[162.1, 53.6],
  					[170.0, 73.2],
  					[160.2, 52.1],
  					[161.3, 67.9],
  					[166.4, 56.6],
  					[168.9, 62.3],
  					[163.8, 58.5],
  					[167.6, 54.5],
  					[160.0, 50.2],
  					[161.3, 60.3],
  					[167.6, 58.3],
  					[165.1, 56.2],
  					[160.0, 50.2],
  					[170.0, 72.9],
  					[157.5, 59.8],
  					[167.6, 61.0],
  					[160.7, 69.1],
  					[163.2, 55.9],
  					[152.4, 46.5],
  					[157.5, 54.3],
  					[168.3, 54.8],
  					[180.3, 60.7],
  					[165.5, 60.0],
  					[165.0, 62.0],
  					[164.5, 60.3],
  					[156.0, 52.7],
  					[160.0, 74.3],
  					[163.0, 62.0],
  					[165.7, 73.1],
  					[161.0, 80.0],
  					[162.0, 54.7],
  					[166.0, 53.2],
  					[174.0, 75.7],
  					[172.7, 61.1],
  					[167.6, 55.7],
  					[151.1, 48.7],
  					[164.5, 52.3],
  					[163.5, 50.0],
  					[152.0, 59.3],
  					[169.0, 62.5],
  					[164.0, 55.7],
  					[161.2, 54.8],
  					[155.0, 45.9],
  					[170.0, 70.6],
  					[176.2, 67.2],
  					[170.0, 69.4],
  					[162.5, 58.2],
  					[170.3, 64.8],
  					[164.1, 71.6],
  					[169.5, 52.8],
  					[163.2, 59.8],
  					[154.5, 49.0],
  					[159.8, 50.0],
  					[173.2, 69.2],
  					[170.0, 55.9],
  					[161.4, 63.4],
  					[169.0, 58.2],
  					[166.2, 58.6],
  					[159.4, 45.7],
  					[162.5, 52.2],
  					[159.0, 48.6],
  					[162.8, 57.8],
  					[159.0, 55.6],
  					[179.8, 66.8],
  					[162.9, 59.4],
  					[161.0, 53.6],
  					[151.1, 73.2],
  					[168.2, 53.4],
  					[168.9, 69.0],
  					[173.2, 58.4],
  					[171.8, 56.2],
  					[178.0, 70.6],
  					[164.3, 59.8],
  					[163.0, 72.0],
  					[168.5, 65.2],
  					[166.8, 56.6],
  					[172.7, 105.2],
  					[163.5, 51.8],
  					[169.4, 63.4],
  					[167.8, 59.0],
  					[159.5, 47.6],
  					[167.6, 63.0],
  					[161.2, 55.2],
  					[160.0, 45.0],
  					[163.2, 54.0],
  					[162.2, 50.2],
  					[161.3, 60.2],
  					[149.5, 44.8],
  					[157.5, 58.8],
  					[163.2, 56.4],
  					[172.7, 62.0],
  					[155.0, 49.2],
  					[156.5, 67.2],
  					[164.0, 53.8],
  					[160.9, 54.4],
  					[162.8, 58.0],
  					[167.0, 59.8],
  					[160.0, 54.8],
  					[160.0, 43.2],
  					[168.9, 60.5],
  					[158.2, 46.4],
  					[156.0, 64.4],
  					[160.0, 48.8],
  					[167.1, 62.2],
  					[158.0, 55.5],
  					[167.6, 57.8],
  					[156.0, 54.6],
  					[162.1, 59.2],
  					[173.4, 52.7],
  					[159.8, 53.2],
  					[170.5, 64.5],
  					[159.2, 51.8],
  					[157.5, 56.0],
  					[161.3, 63.6],
  					[162.6, 63.2],
  					[160.0, 59.5],
  					[168.9, 56.8],
  					[165.1, 64.1],
  					[162.6, 50.0],
  					[165.1, 72.3],
  					[166.4, 55.0],
  					[160.0, 55.9],
  					[152.4, 60.4],
  					[170.2, 69.1],
  					[162.6, 84.5],
  					[170.2, 55.9],
  					[158.8, 55.5],
  					[172.7, 69.5],
  					[167.6, 76.4],
  					[162.6, 61.4],
  					[167.6, 65.9],
  					[156.2, 58.6],
  					[175.2, 66.8],
  					[172.1, 56.6],
  					[162.6, 58.6],
  					[160.0, 55.9],
  					[165.1, 59.1],
  					[182.9, 81.8],
  					[166.4, 70.7],
  					[165.1, 56.8],
  					[177.8, 60.0],
  					[165.1, 58.2],
  					[175.3, 72.7],
  					[154.9, 54.1],
  					[158.8, 49.1],
  					[172.7, 75.9],
  					[168.9, 55.0],
  					[161.3, 57.3],
  					[167.6, 55.0],
  					[165.1, 65.5],
  					[175.3, 65.5],
  					[157.5, 48.6],
  					[163.8, 58.6],
  					[167.6, 63.6],
  					[165.1, 55.2],
  					[165.1, 62.7],
  					[168.9, 56.6],
  					[162.6, 53.9],
  					[164.5, 63.2],
  					[176.5, 73.6],
  					[168.9, 62.0],
  					[175.3, 63.6],
  					[159.4, 53.2],
  					[160.0, 53.4],
  					[170.2, 55.0],
  					[162.6, 70.5],
  					[167.6, 54.5],
  					[162.6, 54.5],
  					[160.7, 55.9],
  					[160.0, 59.0],
  					[157.5, 63.6],
  					[162.6, 54.5],
  					[152.4, 47.3],
  					[170.2, 67.7],
  					[165.1, 80.9],
  					[172.7, 70.5],
  					[165.1, 60.9],
  					[170.2, 63.6],
  					[170.2, 54.5],
  					[170.2, 59.1],
  					[161.3, 70.5],
  					[167.6, 52.7],
  					[167.6, 62.7],
  					[165.1, 86.3],
  					[162.6, 66.4],
  					[152.4, 67.3],
  					[168.9, 63.0],
  					[170.2, 73.6],
  					[175.2, 62.3],
  					[175.2, 57.7],
  					[160.0, 55.4],
  					[165.1, 104.1],
  					[174.0, 55.5],
  					[170.2, 77.3],
  					[160.0, 80.5],
  					[167.6, 64.5],
  					[167.6, 72.3],
  					[167.6, 61.4],
  					[154.9, 58.2],
  					[162.6, 81.8],
  					[175.3, 63.6],
  					[171.4, 53.4],
  					[157.5, 54.5],
  					[165.1, 53.6],
  					[160.0, 60.0],
  					[174.0, 73.6],
  					[162.6, 61.4],
  					[174.0, 55.5],
  					[162.6, 63.6],
  					[161.3, 60.9],
  					[156.2, 60.0],
  					[149.9, 46.8],
  					[169.5, 57.3],
  					[160.0, 64.1],
  					[175.3, 63.6],
  					[169.5, 67.3],
  					[160.0, 75.5],
  					[172.7, 68.2],
  					[162.6, 61.4],
  					[157.5, 76.8],
  					[176.5, 71.8],
  					[164.4, 55.5],
  					[160.7, 48.6],
  					[174.0, 66.4],
  					[163.8, 67.3]
  				  ],
  				  markPoint: {
  					data: [{
  					  type: 'max',
  					  name: 'Max'
  					}, {
  					  type: 'min',
  					  name: 'Min'
  					}]
  				  },
  				  markLine: {
  					data: [{
  					  type: 'average',
  					  name: 'Mean'
  					}]
  				  }
  				}, {
  				  name: 'Data2',
  				  type: 'scatter',
  				  tooltip: {
  					trigger: 'item',
  					formatter: function(params) {
  					  if (params.value.length > 1) {
  						return params.seriesName + ' :<br/>' + params.value[0] + 'cm ' + params.value[1] + 'kg ';
  					  } else {
  						return params.seriesName + ' :<br/>' + params.name + ' : ' + params.value + 'kg ';
  					  }
  					}
  				  },
  				  data: [
  					[174.0, 65.6],
  					[175.3, 71.8],
  					[193.5, 80.7],
  					[186.5, 72.6],
  					[187.2, 78.8],
  					[181.5, 74.8],
  					[184.0, 86.4],
  					[184.5, 78.4],
  					[175.0, 62.0],
  					[184.0, 81.6],
  					[180.0, 76.6],
  					[177.8, 83.6],
  					[192.0, 90.0],
  					[176.0, 74.6],
  					[174.0, 71.0],
  					[184.0, 79.6],
  					[192.7, 93.8],
  					[171.5, 70.0],
  					[173.0, 72.4],
  					[176.0, 85.9],
  					[176.0, 78.8],
  					[180.5, 77.8],
  					[172.7, 66.2],
  					[176.0, 86.4],
  					[173.5, 81.8],
  					[178.0, 89.6],
  					[180.3, 82.8],
  					[180.3, 76.4],
  					[164.5, 63.2],
  					[173.0, 60.9],
  					[183.5, 74.8],
  					[175.5, 70.0],
  					[188.0, 72.4],
  					[189.2, 84.1],
  					[172.8, 69.1],
  					[170.0, 59.5],
  					[182.0, 67.2],
  					[170.0, 61.3],
  					[177.8, 68.6],
  					[184.2, 80.1],
  					[186.7, 87.8],
  					[171.4, 84.7],
  					[172.7, 73.4],
  					[175.3, 72.1],
  					[180.3, 82.6],
  					[182.9, 88.7],
  					[188.0, 84.1],
  					[177.2, 94.1],
  					[172.1, 74.9],
  					[167.0, 59.1],
  					[169.5, 75.6],
  					[174.0, 86.2],
  					[172.7, 75.3],
  					[182.2, 87.1],
  					[164.1, 55.2],
  					[163.0, 57.0],
  					[171.5, 61.4],
  					[184.2, 76.8],
  					[174.0, 86.8],
  					[174.0, 72.2],
  					[177.0, 71.6],
  					[186.0, 84.8],
  					[167.0, 68.2],
  					[171.8, 66.1],
  					[182.0, 72.0],
  					[167.0, 64.6],
  					[177.8, 74.8],
  					[164.5, 70.0],
  					[192.0, 101.6],
  					[175.5, 63.2],
  					[171.2, 79.1],
  					[181.6, 78.9],
  					[167.4, 67.7],
  					[181.1, 66.0],
  					[177.0, 68.2],
  					[174.5, 63.9],
  					[177.5, 72.0],
  					[170.5, 56.8],
  					[182.4, 74.5],
  					[197.1, 90.9],
  					[180.1, 93.0],
  					[175.5, 80.9],
  					[180.6, 72.7],
  					[184.4, 68.0],
  					[175.5, 70.9],
  					[180.6, 72.5],
  					[177.0, 72.5],
  					[177.1, 83.4],
  					[181.6, 75.5],
  					[176.5, 73.0],
  					[175.0, 70.2],
  					[174.0, 73.4],
  					[165.1, 70.5],
  					[177.0, 68.9],
  					[192.0, 102.3],
  					[176.5, 68.4],
  					[169.4, 65.9],
  					[182.1, 75.7],
  					[179.8, 84.5],
  					[175.3, 87.7],
  					[184.9, 86.4],
  					[177.3, 73.2],
  					[167.4, 53.9],
  					[178.1, 72.0],
  					[168.9, 55.5],
  					[157.2, 58.4],
  					[180.3, 83.2],
  					[170.2, 72.7],
  					[177.8, 64.1],
  					[172.7, 72.3],
  					[165.1, 65.0],
  					[186.7, 86.4],
  					[165.1, 65.0],
  					[174.0, 88.6],
  					[175.3, 84.1],
  					[185.4, 66.8],
  					[177.8, 75.5],
  					[180.3, 93.2],
  					[180.3, 82.7],
  					[177.8, 58.0],
  					[177.8, 79.5],
  					[177.8, 78.6],
  					[177.8, 71.8],
  					[177.8, 116.4],
  					[163.8, 72.2],
  					[188.0, 83.6],
  					[198.1, 85.5],
  					[175.3, 90.9],
  					[166.4, 85.9],
  					[190.5, 89.1],
  					[166.4, 75.0],
  					[177.8, 77.7],
  					[179.7, 86.4],
  					[172.7, 90.9],
  					[190.5, 73.6],
  					[185.4, 76.4],
  					[168.9, 69.1],
  					[167.6, 84.5],
  					[175.3, 64.5],
  					[170.2, 69.1],
  					[190.5, 108.6],
  					[177.8, 86.4],
  					[190.5, 80.9],
  					[177.8, 87.7],
  					[184.2, 94.5],
  					[176.5, 80.2],
  					[177.8, 72.0],
  					[180.3, 71.4],
  					[171.4, 72.7],
  					[172.7, 84.1],
  					[172.7, 76.8],
  					[177.8, 63.6],
  					[177.8, 80.9],
  					[182.9, 80.9],
  					[170.2, 85.5],
  					[167.6, 68.6],
  					[175.3, 67.7],
  					[165.1, 66.4],
  					[185.4, 102.3],
  					[181.6, 70.5],
  					[172.7, 95.9],
  					[190.5, 84.1],
  					[179.1, 87.3],
  					[175.3, 71.8],
  					[170.2, 65.9],
  					[193.0, 95.9],
  					[171.4, 91.4],
  					[177.8, 81.8],
  					[177.8, 96.8],
  					[167.6, 69.1],
  					[167.6, 82.7],
  					[180.3, 75.5],
  					[182.9, 79.5],
  					[176.5, 73.6],
  					[186.7, 91.8],
  					[188.0, 84.1],
  					[188.0, 85.9],
  					[177.8, 81.8],
  					[174.0, 82.5],
  					[177.8, 80.5],
  					[171.4, 70.0],
  					[185.4, 81.8],
  					[185.4, 84.1],
  					[188.0, 90.5],
  					[188.0, 91.4],
  					[182.9, 89.1],
  					[176.5, 85.0],
  					[175.3, 69.1],
  					[175.3, 73.6],
  					[188.0, 80.5],
  					[188.0, 82.7],
  					[175.3, 86.4],
  					[170.5, 67.7],
  					[179.1, 92.7],
  					[177.8, 93.6],
  					[175.3, 70.9],
  					[182.9, 75.0],
  					[170.8, 93.2],
  					[188.0, 93.2],
  					[180.3, 77.7],
  					[177.8, 61.4],
  					[185.4, 94.1],
  					[168.9, 75.0],
  					[185.4, 83.6],
  					[180.3, 85.5],
  					[174.0, 73.9],
  					[167.6, 66.8],
  					[182.9, 87.3],
  					[160.0, 72.3],
  					[180.3, 88.6],
  					[167.6, 75.5],
  					[186.7, 101.4],
  					[175.3, 91.1],
  					[175.3, 67.3],
  					[175.9, 77.7],
  					[175.3, 81.8],
  					[179.1, 75.5],
  					[181.6, 84.5],
  					[177.8, 76.6],
  					[182.9, 85.0],
  					[177.8, 102.5],
  					[184.2, 77.3],
  					[179.1, 71.8],
  					[176.5, 87.9],
  					[188.0, 94.3],
  					[174.0, 70.9],
  					[167.6, 64.5],
  					[170.2, 77.3],
  					[167.6, 72.3],
  					[188.0, 87.3],
  					[174.0, 80.0],
  					[176.5, 82.3],
  					[180.3, 73.6],
  					[167.6, 74.1],
  					[188.0, 85.9],
  					[180.3, 73.2],
  					[167.6, 76.3],
  					[183.0, 65.9],
  					[183.0, 90.9],
  					[179.1, 89.1],
  					[170.2, 62.3],
  					[177.8, 82.7],
  					[179.1, 79.1],
  					[190.5, 98.2],
  					[177.8, 84.1],
  					[180.3, 83.2],
  					[180.3, 83.2]
  				  ],
  				  markPoint: {
  					data: [{
  					  type: 'max',
  					  name: 'Max'
  					}, {
  					  type: 'min',
  					  name: 'Min'
  					}]
  				  },
  				  markLine: {
  					data: [{
  					  type: 'average',
  					  name: 'Mean'
  					}]
  				  }
  				}]
  			  });

  			}

  			   //echart Bar Horizontal

  			if ($('#echart_bar_horizontal').length ){

  			  var echartBar = echarts.init(document.getElementById('echart_bar_horizontal'), theme);

  			  echartBar.setOption({
  				title: {
  				  text: 'Bar Graph',
  				  subtext: 'Graph subtitle'
  				},
  				tooltip: {
  				  trigger: 'axis'
  				},
  				legend: {
  				  x: 100,
  				  data: ['2015', '2016']
  				},
  				toolbox: {
  				  show: true,
  				  feature: {
  					saveAsImage: {
  					  show: true,
  					  title: "Save Image"
  					}
  				  }
  				},
  				calculable: true,
  				xAxis: [{
  				  type: 'value',
  				  boundaryGap: [0, 0.01]
  				}],
  				yAxis: [{
  				  type: 'category',
  				  data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  				}],
  				series: [{
  				  name: '2015',
  				  type: 'bar',
  				  data: [18203, 23489, 29034, 104970, 131744, 630230]
  				}, {
  				  name: '2016',
  				  type: 'bar',
  				  data: [19325, 23438, 31000, 121594, 134141, 681807]
  				}]
  			  });

  			}

  			   //echart Pie Collapse

  			if ($('#echart_pie2').length ){

  			  var echartPieCollapse = echarts.init(document.getElementById('echart_pie2'), theme);

  			  echartPieCollapse.setOption({
  				tooltip: {
  				  trigger: 'item',
  				  formatter: "{a} <br/>{b} : {c} ({d}%)"
  				},
  				legend: {
  				  x: 'center',
  				  y: 'bottom',
  				  data: ['rose1', 'rose2', 'rose3', 'rose4', 'rose5', 'rose6']
  				},
  				toolbox: {
  				  show: true,
  				  feature: {
  					magicType: {
  					  show: true,
  					  type: ['pie', 'funnel']
  					},
  					restore: {
  					  show: true,
  					  title: "Restore"
  					},
  					saveAsImage: {
  					  show: true,
  					  title: "Save Image"
  					}
  				  }
  				},
  				calculable: true,
  				series: [{
  				  name: 'Area Mode',
  				  type: 'pie',
  				  radius: [25, 90],
  				  center: ['50%', 170],
  				  roseType: 'area',
  				  x: '50%',
  				  max: 40,
  				  sort: 'ascending',
  				  data: [{
  					value: 10,
  					name: 'rose1'
  				  }, {
  					value: 5,
  					name: 'rose2'
  				  }, {
  					value: 15,
  					name: 'rose3'
  				  }, {
  					value: 25,
  					name: 'rose4'
  				  }, {
  					value: 20,
  					name: 'rose5'
  				  }, {
  					value: 35,
  					name: 'rose6'
  				  }]
  				}]
  			  });

  			}

  			   //echart Donut

  			if ($('#echart_donut').length ){

  			  var echartDonut = echarts.init(document.getElementById('echart_donut'), theme);

  			  echartDonut.setOption({
  				tooltip: {
  				  trigger: 'item',
  				  formatter: "{a} <br/>{b} : {c} ({d}%)"
  				},
  				calculable: true,
  				legend: {
  				  x: 'center',
  				  y: 'bottom',
  				  data: ['Direct Access', 'E-mail Marketing', 'Union Ad', 'Video Ads', 'Search Engine']
  				},
  				toolbox: {
  				  show: true,
  				  feature: {
  					magicType: {
  					  show: true,
  					  type: ['pie', 'funnel'],
  					  option: {
  						funnel: {
  						  x: '25%',
  						  width: '50%',
  						  funnelAlign: 'center',
  						  max: 1548
  						}
  					  }
  					},
  					restore: {
  					  show: true,
  					  title: "Restore"
  					},
  					saveAsImage: {
  					  show: true,
  					  title: "Save Image"
  					}
  				  }
  				},
  				series: [{
  				  name: 'Access to the resource',
  				  type: 'pie',
  				  radius: ['35%', '55%'],
  				  itemStyle: {
  					normal: {
  					  label: {
  						show: true
  					  },
  					  labelLine: {
  						show: true
  					  }
  					},
  					emphasis: {
  					  label: {
  						show: true,
  						position: 'center',
  						textStyle: {
  						  fontSize: '14',
  						  fontWeight: 'normal'
  						}
  					  }
  					}
  				  },
  				  data: [{
  					value: 335,
  					name: 'Direct Access'
  				  }, {
  					value: 310,
  					name: 'E-mail Marketing'
  				  }, {
  					value: 234,
  					name: 'Union Ad'
  				  }, {
  					value: 135,
  					name: 'Video Ads'
  				  }, {
  					value: 1548,
  					name: 'Search Engine'
  				  }]
  				}]
  			  });

  			}

  			   //echart Pie

  			if ($('#echart_pie').length ){

  			  var echartPie = echarts.init(document.getElementById('echart_pie'), theme);

  			  echartPie.setOption({
  				tooltip: {
  				  trigger: 'item',
  				  formatter: "{a} <br/>{b} : {c} ({d}%)"
  				},
  				legend: {
  				  x: 'center',
  				  y: 'bottom',
  				  data: ['Direct Access', 'E-mail Marketing', 'Union Ad', 'Video Ads', 'Search Engine']
  				},
  				toolbox: {
  				  show: true,
  				  feature: {
  					magicType: {
  					  show: true,
  					  type: ['pie', 'funnel'],
  					  option: {
  						funnel: {
  						  x: '25%',
  						  width: '50%',
  						  funnelAlign: 'left',
  						  max: 1548
  						}
  					  }
  					},
  					restore: {
  					  show: true,
  					  title: "Restore"
  					},
  					saveAsImage: {
  					  show: true,
  					  title: "Save Image"
  					}
  				  }
  				},
  				calculable: true,
  				series: [{
  				  name: '访问来源',
  				  type: 'pie',
  				  radius: '55%',
  				  center: ['50%', '48%'],
  				  data: [{
  					value: 335,
  					name: 'Direct Access'
  				  }, {
  					value: 310,
  					name: 'E-mail Marketing'
  				  }, {
  					value: 234,
  					name: 'Union Ad'
  				  }, {
  					value: 135,
  					name: 'Video Ads'
  				  }, {
  					value: 1548,
  					name: 'Search Engine'
  				  }]
  				}]
  			  });

  			  var dataStyle = {
  				normal: {
  				  label: {
  					show: false
  				  },
  				  labelLine: {
  					show: false
  				  }
  				}
  			  };

  			  var placeHolderStyle = {
  				normal: {
  				  color: 'rgba(0,0,0,0)',
  				  label: {
  					show: false
  				  },
  				  labelLine: {
  					show: false
  				  }
  				},
  				emphasis: {
  				  color: 'rgba(0,0,0,0)'
  				}
  			  };

  			}

  			   //echart Mini Pie

  			if ($('#echart_mini_pie').length ){

  			  var echartMiniPie = echarts.init(document.getElementById('echart_mini_pie'), theme);

  			  echartMiniPie .setOption({
  				title: {
  				  text: 'Chart #2',
  				  subtext: 'From ExcelHome',
  				  sublink: 'http://e.weibo.com/1341556070/AhQXtjbqh',
  				  x: 'center',
  				  y: 'center',
  				  itemGap: 20,
  				  textStyle: {
  					color: 'rgba(30,144,255,0.8)',
  					fontFamily: '微软雅黑',
  					fontSize: 35,
  					fontWeight: 'bolder'
  				  }
  				},
  				tooltip: {
  				  show: true,
  				  formatter: "{a} <br/>{b} : {c} ({d}%)"
  				},
  				legend: {
  				  orient: 'vertical',
  				  x: 170,
  				  y: 45,
  				  itemGap: 12,
  				  data: ['68%Something #1', '29%Something #2', '3%Something #3'],
  				},
  				toolbox: {
  				  show: true,
  				  feature: {
  					mark: {
  					  show: true
  					},
  					dataView: {
  					  show: true,
  					  title: "Text View",
  					  lang: [
  						"Text View",
  						"Close",
  						"Refresh",
  					  ],
  					  readOnly: false
  					},
  					restore: {
  					  show: true,
  					  title: "Restore"
  					},
  					saveAsImage: {
  					  show: true,
  					  title: "Save Image"
  					}
  				  }
  				},
  				series: [{
  				  name: '1',
  				  type: 'pie',
  				  clockWise: false,
  				  radius: [105, 130],
  				  itemStyle: dataStyle,
  				  data: [{
  					value: 68,
  					name: '68%Something #1'
  				  }, {
  					value: 32,
  					name: 'invisible',
  					itemStyle: placeHolderStyle
  				  }]
  				}, {
  				  name: '2',
  				  type: 'pie',
  				  clockWise: false,
  				  radius: [80, 105],
  				  itemStyle: dataStyle,
  				  data: [{
  					value: 29,
  					name: '29%Something #2'
  				  }, {
  					value: 71,
  					name: 'invisible',
  					itemStyle: placeHolderStyle
  				  }]
  				}, {
  				  name: '3',
  				  type: 'pie',
  				  clockWise: false,
  				  radius: [25, 80],
  				  itemStyle: dataStyle,
  				  data: [{
  					value: 3,
  					name: '3%Something #3'
  				  }, {
  					value: 97,
  					name: 'invisible',
  					itemStyle: placeHolderStyle
  				  }]
  				}]
  			  });

  			}

  			   //echart Map

  			if ($('#echart_world_map').length ){

  				  var echartMap = echarts.init(document.getElementById('echart_world_map'), theme);


  				  echartMap.setOption({
  					title: {
  					  text: 'World Population (2010)',
  					  subtext: 'from United Nations, Total population, both sexes combined, as of 1 July (thousands)',
  					  x: 'center',
  					  y: 'top'
  					},
  					tooltip: {
  					  trigger: 'item',
  					  formatter: function(params) {
  						var value = (params.value + '').split('.');
  						value = value[0].replace(/(\d{1,3})(?=(?:\d{3})+(?!\d))/g, '$1,') + '.' + value[1];
  						return params.seriesName + '<br/>' + params.name + ' : ' + value;
  					  }
  					},
  					toolbox: {
  					  show: true,
  					  orient: 'vertical',
  					  x: 'right',
  					  y: 'center',
  					  feature: {
  						mark: {
  						  show: true
  						},
  						dataView: {
  						  show: true,
  						  title: "Text View",
  						  lang: [
  							"Text View",
  							"Close",
  							"Refresh",
  						  ],
  						  readOnly: false
  						},
  						restore: {
  						  show: true,
  						  title: "Restore"
  						},
  						saveAsImage: {
  						  show: true,
  						  title: "Save Image"
  						}
  					  }
  					},
  					dataRange: {
  					  min: 0,
  					  max: 1000000,
  					  text: ['High', 'Low'],
  					  realtime: false,
  					  calculable: true,
  					  color: ['#087E65', '#26B99A', '#CBEAE3']
  					},
  					series: [{
  					  name: 'World Population (2010)',
  					  type: 'map',
  					  mapType: 'world',
  					  roam: false,
  					  mapLocation: {
  						y: 60
  					  },
  					  itemStyle: {
  						emphasis: {
  						  label: {
  							show: true
  						  }
  						}
  					  },
  					  data: [{
  						name: 'Afghanistan',
  						value: 28397.812
  					  }, {
  						name: 'Angola',
  						value: 19549.124
  					  }, {
  						name: 'Albania',
  						value: 3150.143
  					  }, {
  						name: 'United Arab Emirates',
  						value: 8441.537
  					  }, {
  						name: 'Argentina',
  						value: 40374.224
  					  }, {
  						name: 'Armenia',
  						value: 2963.496
  					  }, {
  						name: 'French Southern and Antarctic Lands',
  						value: 268.065
  					  }, {
  						name: 'Australia',
  						value: 22404.488
  					  }, {
  						name: 'Austria',
  						value: 8401.924
  					  }, {
  						name: 'Azerbaijan',
  						value: 9094.718
  					  }, {
  						name: 'Burundi',
  						value: 9232.753
  					  }, {
  						name: 'Belgium',
  						value: 10941.288
  					  }, {
  						name: 'Benin',
  						value: 9509.798
  					  }, {
  						name: 'Burkina Faso',
  						value: 15540.284
  					  }, {
  						name: 'Bangladesh',
  						value: 151125.475
  					  }, {
  						name: 'Bulgaria',
  						value: 7389.175
  					  }, {
  						name: 'The Bahamas',
  						value: 66402.316
  					  }, {
  						name: 'Bosnia and Herzegovina',
  						value: 3845.929
  					  }, {
  						name: 'Belarus',
  						value: 9491.07
  					  }, {
  						name: 'Belize',
  						value: 308.595
  					  }, {
  						name: 'Bermuda',
  						value: 64.951
  					  }, {
  						name: 'Bolivia',
  						value: 716.939
  					  }, {
  						name: 'Brazil',
  						value: 195210.154
  					  }, {
  						name: 'Brunei',
  						value: 27.223
  					  }, {
  						name: 'Bhutan',
  						value: 716.939
  					  }, {
  						name: 'Botswana',
  						value: 1969.341
  					  }, {
  						name: 'Central African Republic',
  						value: 4349.921
  					  }, {
  						name: 'Canada',
  						value: 34126.24
  					  }, {
  						name: 'Switzerland',
  						value: 7830.534
  					  }, {
  						name: 'Chile',
  						value: 17150.76
  					  }, {
  						name: 'China',
  						value: 1359821.465
  					  }, {
  						name: 'Ivory Coast',
  						value: 60508.978
  					  }, {
  						name: 'Cameroon',
  						value: 20624.343
  					  }, {
  						name: 'Democratic Republic of the Congo',
  						value: 62191.161
  					  }, {
  						name: 'Republic of the Congo',
  						value: 3573.024
  					  }, {
  						name: 'Colombia',
  						value: 46444.798
  					  }, {
  						name: 'Costa Rica',
  						value: 4669.685
  					  }, {
  						name: 'Cuba',
  						value: 11281.768
  					  }, {
  						name: 'Northern Cyprus',
  						value: 1.468
  					  }, {
  						name: 'Cyprus',
  						value: 1103.685
  					  }, {
  						name: 'Czech Republic',
  						value: 10553.701
  					  }, {
  						name: 'Germany',
  						value: 83017.404
  					  }, {
  						name: 'Djibouti',
  						value: 834.036
  					  }, {
  						name: 'Denmark',
  						value: 5550.959
  					  }, {
  						name: 'Dominican Republic',
  						value: 10016.797
  					  }, {
  						name: 'Algeria',
  						value: 37062.82
  					  }, {
  						name: 'Ecuador',
  						value: 15001.072
  					  }, {
  						name: 'Egypt',
  						value: 78075.705
  					  }, {
  						name: 'Eritrea',
  						value: 5741.159
  					  }, {
  						name: 'Spain',
  						value: 46182.038
  					  }, {
  						name: 'Estonia',
  						value: 1298.533
  					  }, {
  						name: 'Ethiopia',
  						value: 87095.281
  					  }, {
  						name: 'Finland',
  						value: 5367.693
  					  }, {
  						name: 'Fiji',
  						value: 860.559
  					  }, {
  						name: 'Falkland Islands',
  						value: 49.581
  					  }, {
  						name: 'France',
  						value: 63230.866
  					  }, {
  						name: 'Gabon',
  						value: 1556.222
  					  }, {
  						name: 'United Kingdom',
  						value: 62066.35
  					  }, {
  						name: 'Georgia',
  						value: 4388.674
  					  }, {
  						name: 'Ghana',
  						value: 24262.901
  					  }, {
  						name: 'Guinea',
  						value: 10876.033
  					  }, {
  						name: 'Gambia',
  						value: 1680.64
  					  }, {
  						name: 'Guinea Bissau',
  						value: 10876.033
  					  }, {
  						name: 'Equatorial Guinea',
  						value: 696.167
  					  }, {
  						name: 'Greece',
  						value: 11109.999
  					  }, {
  						name: 'Greenland',
  						value: 56.546
  					  }, {
  						name: 'Guatemala',
  						value: 14341.576
  					  }, {
  						name: 'French Guiana',
  						value: 231.169
  					  }, {
  						name: 'Guyana',
  						value: 786.126
  					  }, {
  						name: 'Honduras',
  						value: 7621.204
  					  }, {
  						name: 'Croatia',
  						value: 4338.027
  					  }, {
  						name: 'Haiti',
  						value: 9896.4
  					  }, {
  						name: 'Hungary',
  						value: 10014.633
  					  }, {
  						name: 'Indonesia',
  						value: 240676.485
  					  }, {
  						name: 'India',
  						value: 1205624.648
  					  }, {
  						name: 'Ireland',
  						value: 4467.561
  					  }, {
  						name: 'Iran',
  						value: 240676.485
  					  }, {
  						name: 'Iraq',
  						value: 30962.38
  					  }, {
  						name: 'Iceland',
  						value: 318.042
  					  }, {
  						name: 'Israel',
  						value: 7420.368
  					  }, {
  						name: 'Italy',
  						value: 60508.978
  					  }, {
  						name: 'Jamaica',
  						value: 2741.485
  					  }, {
  						name: 'Jordan',
  						value: 6454.554
  					  }, {
  						name: 'Japan',
  						value: 127352.833
  					  }, {
  						name: 'Kazakhstan',
  						value: 15921.127
  					  }, {
  						name: 'Kenya',
  						value: 40909.194
  					  }, {
  						name: 'Kyrgyzstan',
  						value: 5334.223
  					  }, {
  						name: 'Cambodia',
  						value: 14364.931
  					  }, {
  						name: 'South Korea',
  						value: 51452.352
  					  }, {
  						name: 'Kosovo',
  						value: 97.743
  					  }, {
  						name: 'Kuwait',
  						value: 2991.58
  					  }, {
  						name: 'Laos',
  						value: 6395.713
  					  }, {
  						name: 'Lebanon',
  						value: 4341.092
  					  }, {
  						name: 'Liberia',
  						value: 3957.99
  					  }, {
  						name: 'Libya',
  						value: 6040.612
  					  }, {
  						name: 'Sri Lanka',
  						value: 20758.779
  					  }, {
  						name: 'Lesotho',
  						value: 2008.921
  					  }, {
  						name: 'Lithuania',
  						value: 3068.457
  					  }, {
  						name: 'Luxembourg',
  						value: 507.885
  					  }, {
  						name: 'Latvia',
  						value: 2090.519
  					  }, {
  						name: 'Morocco',
  						value: 31642.36
  					  }, {
  						name: 'Moldova',
  						value: 103.619
  					  }, {
  						name: 'Madagascar',
  						value: 21079.532
  					  }, {
  						name: 'Mexico',
  						value: 117886.404
  					  }, {
  						name: 'Macedonia',
  						value: 507.885
  					  }, {
  						name: 'Mali',
  						value: 13985.961
  					  }, {
  						name: 'Myanmar',
  						value: 51931.231
  					  }, {
  						name: 'Montenegro',
  						value: 620.078
  					  }, {
  						name: 'Mongolia',
  						value: 2712.738
  					  }, {
  						name: 'Mozambique',
  						value: 23967.265
  					  }, {
  						name: 'Mauritania',
  						value: 3609.42
  					  }, {
  						name: 'Malawi',
  						value: 15013.694
  					  }, {
  						name: 'Malaysia',
  						value: 28275.835
  					  }, {
  						name: 'Namibia',
  						value: 2178.967
  					  }, {
  						name: 'New Caledonia',
  						value: 246.379
  					  }, {
  						name: 'Niger',
  						value: 15893.746
  					  }, {
  						name: 'Nigeria',
  						value: 159707.78
  					  }, {
  						name: 'Nicaragua',
  						value: 5822.209
  					  }, {
  						name: 'Netherlands',
  						value: 16615.243
  					  }, {
  						name: 'Norway',
  						value: 4891.251
  					  }, {
  						name: 'Nepal',
  						value: 26846.016
  					  }, {
  						name: 'New Zealand',
  						value: 4368.136
  					  }, {
  						name: 'Oman',
  						value: 2802.768
  					  }, {
  						name: 'Pakistan',
  						value: 173149.306
  					  }, {
  						name: 'Panama',
  						value: 3678.128
  					  }, {
  						name: 'Peru',
  						value: 29262.83
  					  }, {
  						name: 'Philippines',
  						value: 93444.322
  					  }, {
  						name: 'Papua New Guinea',
  						value: 6858.945
  					  }, {
  						name: 'Poland',
  						value: 38198.754
  					  }, {
  						name: 'Puerto Rico',
  						value: 3709.671
  					  }, {
  						name: 'North Korea',
  						value: 1.468
  					  }, {
  						name: 'Portugal',
  						value: 10589.792
  					  }, {
  						name: 'Paraguay',
  						value: 6459.721
  					  }, {
  						name: 'Qatar',
  						value: 1749.713
  					  }, {
  						name: 'Romania',
  						value: 21861.476
  					  }, {
  						name: 'Russia',
  						value: 21861.476
  					  }, {
  						name: 'Rwanda',
  						value: 10836.732
  					  }, {
  						name: 'Western Sahara',
  						value: 514.648
  					  }, {
  						name: 'Saudi Arabia',
  						value: 27258.387
  					  }, {
  						name: 'Sudan',
  						value: 35652.002
  					  }, {
  						name: 'South Sudan',
  						value: 9940.929
  					  }, {
  						name: 'Senegal',
  						value: 12950.564
  					  }, {
  						name: 'Solomon Islands',
  						value: 526.447
  					  }, {
  						name: 'Sierra Leone',
  						value: 5751.976
  					  }, {
  						name: 'El Salvador',
  						value: 6218.195
  					  }, {
  						name: 'Somaliland',
  						value: 9636.173
  					  }, {
  						name: 'Somalia',
  						value: 9636.173
  					  }, {
  						name: 'Republic of Serbia',
  						value: 3573.024
  					  }, {
  						name: 'Suriname',
  						value: 524.96
  					  }, {
  						name: 'Slovakia',
  						value: 5433.437
  					  }, {
  						name: 'Slovenia',
  						value: 2054.232
  					  }, {
  						name: 'Sweden',
  						value: 9382.297
  					  }, {
  						name: 'Swaziland',
  						value: 1193.148
  					  }, {
  						name: 'Syria',
  						value: 7830.534
  					  }, {
  						name: 'Chad',
  						value: 11720.781
  					  }, {
  						name: 'Togo',
  						value: 6306.014
  					  }, {
  						name: 'Thailand',
  						value: 66402.316
  					  }, {
  						name: 'Tajikistan',
  						value: 7627.326
  					  }, {
  						name: 'Turkmenistan',
  						value: 5041.995
  					  }, {
  						name: 'East Timor',
  						value: 10016.797
  					  }, {
  						name: 'Trinidad and Tobago',
  						value: 1328.095
  					  }, {
  						name: 'Tunisia',
  						value: 10631.83
  					  }, {
  						name: 'Turkey',
  						value: 72137.546
  					  }, {
  						name: 'United Republic of Tanzania',
  						value: 44973.33
  					  }, {
  						name: 'Uganda',
  						value: 33987.213
  					  }, {
  						name: 'Ukraine',
  						value: 46050.22
  					  }, {
  						name: 'Uruguay',
  						value: 3371.982
  					  }, {
  						name: 'United States of America',
  						value: 312247.116
  					  }, {
  						name: 'Uzbekistan',
  						value: 27769.27
  					  }, {
  						name: 'Venezuela',
  						value: 236.299
  					  }, {
  						name: 'Vietnam',
  						value: 89047.397
  					  }, {
  						name: 'Vanuatu',
  						value: 236.299
  					  }, {
  						name: 'West Bank',
  						value: 13.565
  					  }, {
  						name: 'Yemen',
  						value: 22763.008
  					  }, {
  						name: 'South Africa',
  						value: 51452.352
  					  }, {
  						name: 'Zambia',
  						value: 13216.985
  					  }, {
  						name: 'Zimbabwe',
  						value: 13076.978
  					  }]
  					}]
  				  });

  			}

  		}


  	$(document).ready(function() {

  		init_sparklines();
  		init_flot_chart();
  		init_sidebar();
  		init_wysiwyg();
  		init_InputMask();
  		init_JQVmap();
  		init_cropper();
  		init_knob();
  		init_IonRangeSlider();
  		init_ColorPicker();
  		init_TagsInput();
  		init_parsley();
  		init_daterangepicker();
  		init_daterangepicker_right();
  		init_daterangepicker_single_call();
  		init_daterangepicker_reservation();
  		init_SmartWizard();
  		init_EasyPieChart();
  		init_charts();
  		init_echarts();
  		init_morris_charts();
  		init_skycons();
  		init_select2();
  		init_validator();
  		init_DataTables();
  		init_chart_doughnut();
  		init_gauge();
  		init_PNotify();
  		init_starrr();
  		init_calendar();
  		init_compose();
  		init_CustomNotification();
  		init_autosize();
  		init_autocomplete();

  	});
});
/*
 Input Mask plugin for jquery
 http://github.com/RobinHerbots/jquery.inputmask
 Copyright (c) 2010 - 2014 Robin Herbots
 Licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php)
 Version: 2.5.5
*/

(function(d){if(void 0===d.fn.inputmask){var Q=function(d){var k=document.createElement("input");d="on"+d;var a=d in k;a||(k.setAttribute(d,"return;"),a="function"==typeof k[d]);return a},D=function(e,k,a){return(e=a.aliases[e])?(e.alias&&D(e.alias,void 0,a),d.extend(!0,a,e),d.extend(!0,a,k),!0):!1},C=function(e){function k(a){e.numericInput&&(a=a.split("").reverse().join(""));var g=!1,k=0,n=e.greedy,p=e.repeat;"*"==p&&(n=!1);1==a.length&&!1==n&&0!=p&&(e.placeholder="");a=d.map(a.split(""),function(a,
d){var l=[];if(a==e.escapeChar)g=!0;else if(a!=e.optionalmarker.start&&a!=e.optionalmarker.end||g){var p=e.definitions[a];if(p&&!g)for(var r=0;r<p.cardinality;r++)l.push(e.placeholder.charAt((k+r)%e.placeholder.length));else l.push(a),g=!1;k+=l.length;return l}});for(var s=a.slice(),r=1;r<p&&n;r++)s=s.concat(a.slice());return{mask:s,repeat:p,greedy:n}}function a(a){e.numericInput&&(a=a.split("").reverse().join(""));var g=!1,k=!1,p=!1;return d.map(a.split(""),function(a,d){var l=[];if(a==e.escapeChar)k=
!0;else{if(a!=e.optionalmarker.start||k){if(a!=e.optionalmarker.end||k){var m=e.definitions[a];if(m&&!k){for(var u=m.prevalidator,x=u?u.length:0,w=1;w<m.cardinality;w++){var B=x>=w?u[w-1]:[],J=B.validator,B=B.cardinality;l.push({fn:J?"string"==typeof J?RegExp(J):new function(){this.test=J}:/./,cardinality:B?B:1,optionality:g,newBlockMarker:!0==g?p:!1,offset:0,casing:m.casing,def:m.definitionSymbol||a});!0==g&&(p=!1)}l.push({fn:m.validator?"string"==typeof m.validator?RegExp(m.validator):new function(){this.test=
m.validator}:/./,cardinality:m.cardinality,optionality:g,newBlockMarker:p,offset:0,casing:m.casing,def:m.definitionSymbol||a})}else l.push({fn:null,cardinality:0,optionality:g,newBlockMarker:p,offset:0,casing:null,def:a}),k=!1;p=!1;return l}g=!1}else g=!0;p=!0}})}function m(a){for(var d=a.length,g=0;g<d&&a.charAt(g)!=e.optionalmarker.start;g++);var k=[a.substring(0,g)];g<d&&k.push(a.substring(g+1,d));return k}function g(l,t,x){for(var n=0,w=0,s=t.length,r=0;r<s&&!(t.charAt(r)==e.optionalmarker.start&&
n++,t.charAt(r)==e.optionalmarker.end&&w++,0<n&&n==w);r++);n=[t.substring(0,r)];r<s&&n.push(t.substring(r+1,s));r=m(n[0]);1<r.length?(t=l+r[0]+(e.optionalmarker.start+r[1]+e.optionalmarker.end)+(1<n.length?n[1]:""),-1==d.inArray(t,p)&&""!=t&&(p.push(t),s=k(t),u.push({mask:t,_buffer:s.mask,buffer:s.mask.slice(),tests:a(t),lastValidPosition:-1,greedy:s.greedy,repeat:s.repeat,metadata:x})),t=l+r[0]+(1<n.length?n[1]:""),-1==d.inArray(t,p)&&""!=t&&(p.push(t),s=k(t),u.push({mask:t,_buffer:s.mask,buffer:s.mask.slice(),
tests:a(t),lastValidPosition:-1,greedy:s.greedy,repeat:s.repeat,metadata:x})),1<m(r[1]).length&&g(l+r[0],r[1]+n[1],x),1<n.length&&1<m(n[1]).length&&(g(l+r[0]+(e.optionalmarker.start+r[1]+e.optionalmarker.end),n[1],x),g(l+r[0],n[1],x))):(t=l+n,-1==d.inArray(t,p)&&""!=t&&(p.push(t),s=k(t),u.push({mask:t,_buffer:s.mask,buffer:s.mask.slice(),tests:a(t),lastValidPosition:-1,greedy:s.greedy,repeat:s.repeat,metadata:x})))}var u=[],p=[];d.isFunction(e.mask)&&(e.mask=e.mask.call(this,e));d.isArray(e.mask)?
d.each(e.mask,function(a,d){void 0!=d.mask?g("",d.mask.toString(),d):g("",d.toString())}):g("",e.mask.toString());return e.greedy?u:u.sort(function(a,d){return a.mask.length-d.mask.length})},fa="function"===typeof ScriptEngineMajorVersion?ScriptEngineMajorVersion():10<=(new Function("/*@cc_on return @_jscript_version; @*/"))(),x=navigator.userAgent,ga=null!==x.match(/iphone/i),ha=null!==x.match(/android.*safari.*/i),ia=null!==x.match(/android.*chrome.*/i),Y=null!==x.match(/android.*firefox.*/i),Z=
/Kindle/i.test(x)||/Silk/i.test(x)||/KFTT/i.test(x)||/KFOT/i.test(x)||/KFJWA/i.test(x)||/KFJWI/i.test(x)||/KFSOWI/i.test(x)||/KFTHWA/i.test(x)||/KFTHWI/i.test(x)||/KFAPWA/i.test(x)||/KFAPWI/i.test(x),S=Q("paste")?"paste":Q("input")?"input":"propertychange",w=function(e,k,a,m){function g(){return e[k]}function u(){return g().tests}function p(){return g()._buffer}function l(){return g().buffer}function t(h,c,b){function f(h,b,c,f){for(var d=w(h),g=c?1:0,v="",L=b.buffer,e=b.tests[d].cardinality;e>g;e--)v+=
H(L,d-(e-1));c&&(v+=c);return null!=b.tests[d].fn?b.tests[d].fn.test(v,L,h,f,a):c==H(b._buffer.slice(),h,!0)||c==a.skipOptionalPartCharacter?{refresh:!0,c:H(b._buffer.slice(),h,!0),pos:h}:!1}if(b=!0===b){var v=f(h,g(),c,b);!0===v&&(v={pos:h});return v}var L=[],v=!1,K=k,p=l().slice(),m=g().lastValidPosition;F(h);var t=[];d.each(e,function(a,d){if("object"==typeof d){k=a;var e=h,y=g().lastValidPosition,q;if(y==m){if(1<e-m)for(y=-1==y?0:y;y<e&&(q=f(y,g(),p[y],!0),!1!==q);y++)G(l(),y,p[y],!0),!0===q&&
(q={pos:y}),q=q.pos||y,g().lastValidPosition<q&&(g().lastValidPosition=q);if(!n(e)&&!f(e,g(),c,b)){y=r(e)-e;for(q=0;q<y&&!1===f(++e,g(),c,b);q++);t.push(k)}}(g().lastValidPosition>=m||k==K)&&0<=e&&e<s()&&(v=f(e,g(),c,b),!1!==v&&(!0===v&&(v={pos:e}),q=v.pos||e,g().lastValidPosition<q&&(g().lastValidPosition=q)),L.push({activeMasksetIndex:a,result:v}))}});k=K;return function(a,b){var g=!1;d.each(b,function(h,b){if(g=-1==d.inArray(b.activeMasksetIndex,a)&&!1!==b.result)return!1});if(g)b=d.map(b,function(h,
b){if(-1==d.inArray(h.activeMasksetIndex,a))return h;e[h.activeMasksetIndex].lastValidPosition=m});else{var v=-1,L=-1,l;d.each(b,function(h,b){-1!=d.inArray(b.activeMasksetIndex,a)&&!1!==b.result&(-1==v||v>b.result.pos)&&(v=b.result.pos,L=b.activeMasksetIndex)});b=d.map(b,function(b,g){if(-1!=d.inArray(b.activeMasksetIndex,a)){if(b.result.pos==v)return b;if(!1!==b.result){for(var K=h;K<v;K++)if(l=f(K,e[b.activeMasksetIndex],e[L].buffer[K],!0),!1===l){e[b.activeMasksetIndex].lastValidPosition=v-1;
break}else G(e[b.activeMasksetIndex].buffer,K,e[L].buffer[K],!0),e[b.activeMasksetIndex].lastValidPosition=K;l=f(v,e[b.activeMasksetIndex],c,!0);!1!==l&&(G(e[b.activeMasksetIndex].buffer,v,c,!0),e[b.activeMasksetIndex].lastValidPosition=v);return b}}})}return b}(t,L)}function x(){var a=k,c={activeMasksetIndex:0,lastValidPosition:-1,next:-1};d.each(e,function(a,h){"object"==typeof h&&(k=a,g().lastValidPosition>c.lastValidPosition?(c.activeMasksetIndex=a,c.lastValidPosition=g().lastValidPosition,c.next=
r(g().lastValidPosition)):g().lastValidPosition==c.lastValidPosition&&(-1==c.next||c.next>r(g().lastValidPosition))&&(c.activeMasksetIndex=a,c.lastValidPosition=g().lastValidPosition,c.next=r(g().lastValidPosition)))});k=-1!=c.lastValidPosition&&e[a].lastValidPosition==c.lastValidPosition?a:c.activeMasksetIndex;a!=k&&(J(l(),r(c.lastValidPosition),s()),g().writeOutBuffer=!0);q.data("_inputmask").activeMasksetIndex=k}function n(a){a=w(a);a=u()[a];return void 0!=a?a.fn:!1}function w(a){return a%u().length}
function s(){var h=p(),c=g().greedy,b=g().repeat,f=l();if(d.isFunction(a.getMaskLength))return a.getMaskLength(h,c,b,f,a);var v=h.length;c||("*"==b?v=f.length+1:1<b&&(v+=h.length*(b-1)));return v}function r(a){var c=s();if(a>=c)return c;for(;++a<c&&!n(a););return a}function F(a){if(0>=a)return 0;for(;0<--a&&!n(a););return a}function G(a,c,b,f){f&&(c=D(a,c));f=u()[w(c)];var d=b;if(void 0!=d&&void 0!=f)switch(f.casing){case "upper":d=b.toUpperCase();break;case "lower":d=b.toLowerCase()}a[c]=d}function H(a,
c,b){b&&(c=D(a,c));return a[c]}function D(a,c){for(var b;void 0==a[c]&&a.length<s();)for(b=0;void 0!==p()[b];)a.push(p()[b++]);return c}function B(a,c,b){a._valueSet(c.join(""));void 0!=b&&z(a,b)}function J(a,c,b,f){for(var d=s();c<b&&c<d;c++)!0===f?n(c)||G(a,c,""):G(a,c,H(p().slice(),c,!0))}function C(a,c){var b=w(c);G(a,c,H(p(),b))}function O(h){return a.placeholder.charAt(h%a.placeholder.length)}function I(a,c,b,f,v){f=void 0!=f?f.slice():T(a._valueGet()).split("");d.each(e,function(a,b){"object"==
typeof b&&(b.buffer=b._buffer.slice(),b.lastValidPosition=-1,b.p=-1)});!0!==b&&(k=0);c&&a._valueSet("");s();d.each(f,function(f,e){if(!0===v){var l=g().p,l=-1==l?l:F(l),k=-1==l?f:r(l);-1==d.inArray(e,p().slice(l+1,k))&&R.call(a,void 0,!0,e.charCodeAt(0),c,b,f)}else R.call(a,void 0,!0,e.charCodeAt(0),c,b,f),b=b||0<f&&f>g().p});!0===b&&-1!=g().p&&(g().lastValidPosition=F(g().p))}function Q(a){return d.inputmask.escapeRegex.call(this,a)}function T(a){return a.replace(RegExp("("+Q(p().join(""))+")*$"),
"")}function U(a){var c=l(),b=c.slice(),f,d;for(d=b.length-1;0<=d;d--)if(f=w(d),u()[f].optionality)if(n(d)&&t(d,c[d],!0))break;else b.pop();else break;B(a,b)}function ja(h,c){if(!u()||!0!==c&&h.hasClass("hasDatepicker"))return h[0]._valueGet();var b=d.map(l(),function(a,b){return n(b)&&t(b,a,!0)?a:null}),b=(A?b.reverse():b).join("");return d.isFunction(a.onUnMask)?a.onUnMask.call(h,l().join(""),b,a):b}function M(h){!A||"number"!=typeof h||a.greedy&&""==a.placeholder||(h=l().length-h);return h}function z(h,
c,b){var f=h.jquery&&0<h.length?h[0]:h;if("number"==typeof c)c=M(c),b=M(b),d(f).is(":visible")&&(b="number"==typeof b?b:c,f.scrollLeft=f.scrollWidth,!1==a.insertMode&&c==b&&b++,f.setSelectionRange?(f.selectionStart=c,f.selectionEnd=b):f.createTextRange&&(h=f.createTextRange(),h.collapse(!0),h.moveEnd("character",b),h.moveStart("character",c),h.select()));else{if(!d(h).is(":visible"))return{begin:0,end:0};f.setSelectionRange?(c=f.selectionStart,b=f.selectionEnd):document.selection&&document.selection.createRange&&
(h=document.selection.createRange(),c=0-h.duplicate().moveStart("character",-1E5),b=c+h.text.length);c=M(c);b=M(b);return{begin:c,end:b}}}function P(h){if(d.isFunction(a.isComplete))return a.isComplete.call(q,h,a);if("*"!=a.repeat){var c=!1,b=0,f=k;d.each(e,function(a,f){if("object"==typeof f){k=a;var d=F(s());if(f.lastValidPosition>=b&&f.lastValidPosition==d){for(var g=!0,e=0;e<=d;e++){var l=n(e),m=w(e);if(l&&(void 0==h[e]||h[e]==O(e))||!l&&h[e]!=p()[m]){g=!1;break}}if(c=c||g)return!1}b=f.lastValidPosition}});
k=f;return c}}function ka(a){a=d._data(a).events;d.each(a,function(a,b){d.each(b,function(a,b){if("inputmask"==b.namespace&&"setvalue"!=b.type){var c=b.handler;b.handler=function(a){if(this.readOnly||this.disabled)a.preventDefault;else return c.apply(this,arguments)}}})})}function la(a){function c(a){if(void 0==d.valHooks[a]||!0!=d.valHooks[a].inputmaskpatch){var b=d.valHooks[a]&&d.valHooks[a].get?d.valHooks[a].get:function(a){return a.value},c=d.valHooks[a]&&d.valHooks[a].set?d.valHooks[a].set:function(a,
b){a.value=b;return a};d.valHooks[a]={get:function(a){var c=d(a);if(c.data("_inputmask")){if(c.data("_inputmask").opts.autoUnmask)return c.inputmask("unmaskedvalue");a=b(a);c=c.data("_inputmask");return a!=c.masksets[c.activeMasksetIndex]._buffer.join("")?a:""}return b(a)},set:function(a,b){var f=d(a),h=c(a,b);f.data("_inputmask")&&f.triggerHandler("setvalue.inputmask");return h},inputmaskpatch:!0}}}var b;Object.getOwnPropertyDescriptor&&(b=Object.getOwnPropertyDescriptor(a,"value"));if(b&&b.get){if(!a._valueGet){var f=
b.get,g=b.set;a._valueGet=function(){return A?f.call(this).split("").reverse().join(""):f.call(this)};a._valueSet=function(a){g.call(this,A?a.split("").reverse().join(""):a)};Object.defineProperty(a,"value",{get:function(){var a=d(this),b=d(this).data("_inputmask"),c=b.masksets,h=b.activeMasksetIndex;return b&&b.opts.autoUnmask?a.inputmask("unmaskedvalue"):f.call(this)!=c[h]._buffer.join("")?f.call(this):""},set:function(a){g.call(this,a);d(this).triggerHandler("setvalue.inputmask")}})}}else document.__lookupGetter__&&
a.__lookupGetter__("value")?a._valueGet||(f=a.__lookupGetter__("value"),g=a.__lookupSetter__("value"),a._valueGet=function(){return A?f.call(this).split("").reverse().join(""):f.call(this)},a._valueSet=function(a){g.call(this,A?a.split("").reverse().join(""):a)},a.__defineGetter__("value",function(){var a=d(this),b=d(this).data("_inputmask"),c=b.masksets,h=b.activeMasksetIndex;return b&&b.opts.autoUnmask?a.inputmask("unmaskedvalue"):f.call(this)!=c[h]._buffer.join("")?f.call(this):""}),a.__defineSetter__("value",
function(a){g.call(this,a);d(this).triggerHandler("setvalue.inputmask")})):(a._valueGet||(a._valueGet=function(){return A?this.value.split("").reverse().join(""):this.value},a._valueSet=function(a){this.value=A?a.split("").reverse().join(""):a}),c(a.type))}function $(a,c,b,f){var d=l();if(!1!==f)for(;!n(a)&&0<=a-1;)a--;for(f=a;f<c&&f<s();f++)if(n(f)){C(d,f);var e=r(f),k=H(d,e);if(k!=O(e))if(e<s()&&!1!==t(f,k,!0)&&u()[w(f)].def==u()[w(e)].def)G(d,f,k,!0);else if(n(f))break}else C(d,f);void 0!=b&&G(d,
F(c),b);if(!1==g().greedy){c=T(d.join("")).split("");d.length=c.length;f=0;for(b=d.length;f<b;f++)d[f]=c[f];0==d.length&&(g().buffer=p().slice())}return a}function aa(a,c,b){var d=l();if(H(d,a,!0)!=O(a))for(var e=F(c);e>a&&0<=e;e--)if(n(e)){var k=F(e),m=H(d,k);m!=O(k)&&!1!==t(e,m,!0)&&u()[w(e)].def==u()[w(k)].def&&(G(d,e,m,!0),C(d,k))}else C(d,e);void 0!=b&&H(d,a)==O(a)&&G(d,a,b);a=d.length;if(!1==g().greedy){b=T(d.join("")).split("");d.length=b.length;e=0;for(k=d.length;e<k;e++)d[e]=b[e];0==d.length&&
(g().buffer=p().slice())}return c-(a-d.length)}function ba(d,c,b){if(a.numericInput||A){switch(c){case a.keyCode.BACKSPACE:c=a.keyCode.DELETE;break;case a.keyCode.DELETE:c=a.keyCode.BACKSPACE}if(A){var f=b.end;b.end=b.begin;b.begin=f}}f=!0;b.begin==b.end?(f=c==a.keyCode.BACKSPACE?b.begin-1:b.begin,a.isNumeric&&""!=a.radixPoint&&l()[f]==a.radixPoint&&(b.begin=l().length-1==f?b.begin:c==a.keyCode.BACKSPACE?f:r(f),b.end=b.begin),f=!1,c==a.keyCode.BACKSPACE?b.begin--:c==a.keyCode.DELETE&&b.end++):1!=
b.end-b.begin||a.insertMode||(f=!1,c==a.keyCode.BACKSPACE&&b.begin--);J(l(),b.begin,b.end);var e=s();if(!1==a.greedy&&(isNaN(a.repeat)||0<a.repeat))$(b.begin,e,void 0,!A&&c==a.keyCode.BACKSPACE&&!f);else{for(var k=b.begin,p=b.begin;p<b.end;p++)if(n(p)||!f)k=$(b.begin,e,void 0,!A&&c==a.keyCode.BACKSPACE&&!f);f||(b.begin=k)}c=r(-1);J(l(),b.begin,b.end,!0);I(d,!1,!1,l());g().lastValidPosition<c?(g().lastValidPosition=-1,g().p=c):g().p=b.begin}function V(e){W=!1;var c=this,b=d(c),f=e.keyCode,k=z(c);f==
a.keyCode.BACKSPACE||f==a.keyCode.DELETE||ga&&127==f||e.ctrlKey&&88==f?(e.preventDefault(),88==f&&(N=l().join("")),ba(c,f,k),x(),B(c,l(),g().p),c._valueGet()==p().join("")&&b.trigger("cleared"),a.showTooltip&&b.prop("title",g().mask)):f==a.keyCode.END||f==a.keyCode.PAGE_DOWN?setTimeout(function(){var b=r(g().lastValidPosition);a.insertMode||b!=s()||e.shiftKey||b--;z(c,e.shiftKey?k.begin:b,b)},0):f==a.keyCode.HOME&&!e.shiftKey||f==a.keyCode.PAGE_UP?z(c,0,e.shiftKey?k.begin:0):f==a.keyCode.ESCAPE||
90==f&&e.ctrlKey?(I(c,!0,!1,N.split("")),b.click()):f!=a.keyCode.INSERT||e.shiftKey||e.ctrlKey?!1!=a.insertMode||e.shiftKey||(f==a.keyCode.RIGHT?setTimeout(function(){var a=z(c);z(c,a.begin)},0):f==a.keyCode.LEFT&&setTimeout(function(){var a=z(c);z(c,a.begin-1)},0)):(a.insertMode=!a.insertMode,z(c,a.insertMode||k.begin!=s()?k.begin:k.begin-1));b=z(c);!0===a.onKeyDown.call(this,e,l(),a)&&z(c,b.begin,b.end);ca=-1!=d.inArray(f,a.ignorables)}function R(h,c,b,f,p,m){if(void 0==b&&W)return!1;W=!0;var q=
d(this);h=h||window.event;b=c?b:h.which||h.charCode||h.keyCode;if(!(!0===c||h.ctrlKey&&h.altKey)&&(h.ctrlKey||h.metaKey||ca))return!0;if(b){!0!==c&&46==b&&!1==h.shiftKey&&","==a.radixPoint&&(b=44);var n,w,u=String.fromCharCode(b);c?(b=p?m:g().lastValidPosition+1,n={begin:b,end:b}):n=z(this);m=A?1<n.begin-n.end||1==n.begin-n.end&&a.insertMode:1<n.end-n.begin||1==n.end-n.begin&&a.insertMode;var D=k;m&&(d.each(e,function(a,b){"object"==typeof b&&(k=a,g().undoBuffer=l().join(""))}),k=D,ba(this,a.keyCode.DELETE,
n),a.insertMode||d.each(e,function(a,b){"object"==typeof b&&(k=a,aa(n.begin,s()),g().lastValidPosition=r(g().lastValidPosition))}),k=D);var C=l().join("").indexOf(a.radixPoint);a.isNumeric&&!0!==c&&-1!=C&&(a.greedy&&n.begin<=C?(n.begin=F(n.begin),n.end=n.begin):u==a.radixPoint&&(n.begin=C,n.end=n.begin));var E=n.begin;b=t(E,u,p);!0===p&&(b=[{activeMasksetIndex:k,result:b}]);var y=-1;d.each(b,function(b,d){k=d.activeMasksetIndex;g().writeOutBuffer=!0;var c=d.result;if(!1!==c){var e=!1,f=l();!0!==c&&
(e=c.refresh,E=void 0!=c.pos?c.pos:E,u=void 0!=c.c?c.c:u);if(!0!==e){if(!0==a.insertMode){c=s();for(f=f.slice();H(f,c,!0)!=O(c)&&c>=E;)c=0==c?-1:F(c);c>=E?(aa(E,s(),u),f=g().lastValidPosition,c=r(f),c!=s()&&f>=E&&H(l().slice(),c,!0)!=O(c)&&(g().lastValidPosition=c)):g().writeOutBuffer=!1}else G(f,E,u,!0);if(-1==y||y>r(E))y=r(E)}else!p&&(f=E<s()?E+1:E,-1==y||y>f)&&(y=f);y>g().p&&(g().p=y)}});!0!==p&&(k=D,x());if(!1!==f)if(d.each(b,function(a,b){if(b.activeMasksetIndex==k)return w=b,!1}),void 0!=w){var J=
this;setTimeout(function(){a.onKeyValidation.call(J,w.result,a)},0);if(g().writeOutBuffer&&!1!==w.result){var I=l();f=c?void 0:a.numericInput?E>C?F(y):u==a.radixPoint?y-1:F(y-1):y;B(this,I,f);!0!==c&&setTimeout(function(){!0===P(I)&&q.trigger("complete");X=!0;q.trigger("input")},0)}else m&&(g().buffer=g().undoBuffer.split(""))}else m&&(g().buffer=g().undoBuffer.split(""));a.showTooltip&&q.prop("title",g().mask);h&&(h.preventDefault?h.preventDefault():h.returnValue=!1)}}function da(e){var c=d(this),
b=e.keyCode,f=l();a.onKeyUp.call(this,e,f,a);b==a.keyCode.TAB&&a.showMaskOnFocus&&(c.hasClass("focus.inputmask")&&0==this._valueGet().length?(f=p().slice(),B(this,f),z(this,0),N=l().join("")):(B(this,f),f.join("")==p().join("")&&-1!=d.inArray(a.radixPoint,f)?(z(this,M(0)),c.click()):z(this,M(0),M(s()))))}function ea(e){if(!0===X&&"input"==e.type)return X=!1,!0;var c=this,b=d(c);if("propertychange"==e.type&&c._valueGet().length<=s())return!0;setTimeout(function(){var f=d.isFunction(a.onBeforePaste)?
a.onBeforePaste.call(c,c._valueGet(),a):c._valueGet();I(c,!1,!1,f.split(""),!0);B(c,l());!0===P(l())&&b.trigger("complete");b.click()},0)}function ma(e){var c=d(this),b=z(this),f=this._valueGet(),f=f.replace(RegExp("("+Q(p().join(""))+")*"),"");b.begin>f.length&&(z(this,f.length),b=z(this));1!=l().length-f.length||f.charAt(b.begin)==l()[b.begin]||f.charAt(b.begin+1)==l()[b.begin]||n(b.begin)?(I(this,!1,!1,f.split("")),B(this,l()),!0===P(l())&&c.trigger("complete"),c.click()):(e.keyCode=a.keyCode.BACKSPACE,
V.call(this,e));e.preventDefault()}function na(h){q=d(h);if(q.is(":input")){q.data("_inputmask",{masksets:e,activeMasksetIndex:k,opts:a,isRTL:!1});a.showTooltip&&q.prop("title",g().mask);g().greedy=g().greedy?g().greedy:0==g().repeat;if(null!=q.attr("maxLength")){var c=q.prop("maxLength");-1<c&&d.each(e,function(a,b){"object"==typeof b&&"*"==b.repeat&&(b.repeat=c)});s()>=c&&-1<c&&(c<p().length&&(p().length=c),!1==g().greedy&&(g().repeat=Math.round(c/p().length)),q.prop("maxLength",2*s()))}la(h);a.numericInput&&
(a.isNumeric=a.numericInput);("rtl"==h.dir||a.numericInput&&a.rightAlignNumerics||a.isNumeric&&a.rightAlignNumerics)&&q.css("text-align","right");if("rtl"==h.dir||a.numericInput){h.dir="ltr";q.removeAttr("dir");var b=q.data("_inputmask");b.isRTL=!0;q.data("_inputmask",b);A=!0}q.unbind(".inputmask");q.removeClass("focus.inputmask");q.closest("form").bind("submit",function(){N!=l().join("")&&q.change()}).bind("reset",function(){setTimeout(function(){q.trigger("setvalue")},0)});q.bind("mouseenter.inputmask",
function(){!d(this).hasClass("focus.inputmask")&&a.showMaskOnHover&&this._valueGet()!=l().join("")&&B(this,l())}).bind("blur.inputmask",function(){var b=d(this),c=this._valueGet(),f=l();b.removeClass("focus.inputmask");N!=l().join("")&&b.change();a.clearMaskOnLostFocus&&""!=c&&(c==p().join("")?this._valueSet(""):U(this));!1===P(f)&&(b.trigger("incomplete"),a.clearIncomplete&&(d.each(e,function(a,b){"object"==typeof b&&(b.buffer=b._buffer.slice(),b.lastValidPosition=-1)}),k=0,a.clearMaskOnLostFocus?
this._valueSet(""):(f=p().slice(),B(this,f))))}).bind("focus.inputmask",function(){var b=d(this),c=this._valueGet();a.showMaskOnFocus&&!b.hasClass("focus.inputmask")&&(!a.showMaskOnHover||a.showMaskOnHover&&""==c)&&this._valueGet()!=l().join("")&&B(this,l(),r(g().lastValidPosition));b.addClass("focus.inputmask");N=l().join("")}).bind("mouseleave.inputmask",function(){var b=d(this);a.clearMaskOnLostFocus&&(b.hasClass("focus.inputmask")||this._valueGet()==b.attr("placeholder")||(this._valueGet()==p().join("")||
""==this._valueGet()?this._valueSet(""):U(this)))}).bind("click.inputmask",function(){var b=this;setTimeout(function(){var c=z(b),f=l();if(c.begin==c.end){var c=A?M(c.begin):c.begin,e=g().lastValidPosition,f=a.isNumeric?!1===a.skipRadixDance&&""!=a.radixPoint&&-1!=d.inArray(a.radixPoint,f)?a.numericInput?r(d.inArray(a.radixPoint,f)):d.inArray(a.radixPoint,f):r(e):r(e);c<f?n(c)?z(b,c):z(b,r(c)):z(b,f)}},0)}).bind("dblclick.inputmask",function(){var a=this;setTimeout(function(){z(a,0,r(g().lastValidPosition))},
0)}).bind(S+".inputmask dragdrop.inputmask drop.inputmask",ea).bind("setvalue.inputmask",function(){I(this,!0);N=l().join("");this._valueGet()==p().join("")&&this._valueSet("")}).bind("complete.inputmask",a.oncomplete).bind("incomplete.inputmask",a.onincomplete).bind("cleared.inputmask",a.oncleared);q.bind("keydown.inputmask",V).bind("keypress.inputmask",R).bind("keyup.inputmask",da);if(ha||Y||ia||Z)if(q.attr("autocomplete","off").attr("autocorrect","off").attr("autocapitalize","off").attr("spellcheck",
!1),Y||Z)q.unbind("keydown.inputmask",V).unbind("keypress.inputmask",R).unbind("keyup.inputmask",da),"input"==S&&q.unbind(S+".inputmask"),q.bind("input.inputmask",ma);fa&&q.bind("input.inputmask",ea);b=d.isFunction(a.onBeforeMask)?a.onBeforeMask.call(h,h._valueGet(),a):h._valueGet();I(h,!0,!1,b.split(""));N=l().join("");var f;try{f=document.activeElement}catch(m){}f===h?(q.addClass("focus.inputmask"),z(h,r(g().lastValidPosition))):a.clearMaskOnLostFocus?l().join("")==p().join("")?h._valueSet(""):
U(h):B(h,l());ka(h)}}var A=!1,N=l().join(""),q,W=!1,X=!1,ca=!1;if(void 0!=m)switch(m.action){case "isComplete":return P(m.buffer);case "unmaskedvalue":return A=m.$input.data("_inputmask").isRTL,ja(m.$input,m.skipDatepickerCheck);case "mask":na(m.el);break;case "format":return q=d({}),q.data("_inputmask",{masksets:e,activeMasksetIndex:k,opts:a,isRTL:a.numericInput}),a.numericInput&&(a.isNumeric=a.numericInput,A=!0),I(q,!1,!1,m.value.split(""),!0),l().join("");case "isValid":return q=d({}),q.data("_inputmask",
{masksets:e,activeMasksetIndex:k,opts:a,isRTL:a.numericInput}),a.numericInput&&(a.isNumeric=a.numericInput,A=!0),I(q,!1,!0,m.value.split("")),P(l())}};d.inputmask={defaults:{placeholder:"_",optionalmarker:{start:"[",end:"]"},quantifiermarker:{start:"{",end:"}"},groupmarker:{start:"(",end:")"},escapeChar:"\\",mask:null,oncomplete:d.noop,onincomplete:d.noop,oncleared:d.noop,repeat:0,greedy:!0,autoUnmask:!1,clearMaskOnLostFocus:!0,insertMode:!0,clearIncomplete:!1,aliases:{},onKeyUp:d.noop,onKeyDown:d.noop,
onBeforeMask:void 0,onBeforePaste:void 0,onUnMask:void 0,showMaskOnFocus:!0,showMaskOnHover:!0,onKeyValidation:d.noop,skipOptionalPartCharacter:" ",showTooltip:!1,numericInput:!1,isNumeric:!1,radixPoint:"",skipRadixDance:!1,rightAlignNumerics:!0,definitions:{9:{validator:"[0-9]",cardinality:1,definitionSymbol:"*"},a:{validator:"[A-Za-z\u0410-\u044f\u0401\u0451]",cardinality:1,definitionSymbol:"*"},"*":{validator:"[A-Za-z\u0410-\u044f\u0401\u04510-9]",cardinality:1}},keyCode:{ALT:18,BACKSPACE:8,CAPS_LOCK:20,
COMMA:188,COMMAND:91,COMMAND_LEFT:91,COMMAND_RIGHT:93,CONTROL:17,DELETE:46,DOWN:40,END:35,ENTER:13,ESCAPE:27,HOME:36,INSERT:45,LEFT:37,MENU:93,NUMPAD_ADD:107,NUMPAD_DECIMAL:110,NUMPAD_DIVIDE:111,NUMPAD_ENTER:108,NUMPAD_MULTIPLY:106,NUMPAD_SUBTRACT:109,PAGE_DOWN:34,PAGE_UP:33,PERIOD:190,RIGHT:39,SHIFT:16,SPACE:32,TAB:9,UP:38,WINDOWS:91},ignorables:[8,9,13,19,27,33,34,35,36,37,38,39,40,45,46,93,112,113,114,115,116,117,118,119,120,121,122,123],getMaskLength:void 0,isComplete:void 0},escapeRegex:function(d){return d.replace(RegExp("(\\/|\\.|\\*|\\+|\\?|\\||\\(|\\)|\\[|\\]|\\{|\\}|\\\\)",
"gim"),"\\$1")},format:function(e,k){var a=d.extend(!0,{},d.inputmask.defaults,k);D(a.alias,k,a);return w(C(a),0,a,{action:"format",value:e})},isValid:function(e,k){var a=d.extend(!0,{},d.inputmask.defaults,k);D(a.alias,k,a);return w(C(a),0,a,{action:"isValid",value:e})}};d.fn.inputmask=function(e,k){var a=d.extend(!0,{},d.inputmask.defaults,k),m,g=0;if("string"===typeof e)switch(e){case "mask":return D(a.alias,k,a),m=C(a),0==m.length?this:this.each(function(){w(d.extend(!0,{},m),0,a,{action:"mask",
el:this})});case "unmaskedvalue":var u=d(this);return u.data("_inputmask")?(m=u.data("_inputmask").masksets,g=u.data("_inputmask").activeMasksetIndex,a=u.data("_inputmask").opts,w(m,g,a,{action:"unmaskedvalue",$input:u})):u.val();case "remove":return this.each(function(){var e=d(this);if(e.data("_inputmask")){m=e.data("_inputmask").masksets;g=e.data("_inputmask").activeMasksetIndex;a=e.data("_inputmask").opts;this._valueSet(w(m,g,a,{action:"unmaskedvalue",$input:e,skipDatepickerCheck:!0}));e.removeData("_inputmask");
e.unbind(".inputmask");e.removeClass("focus.inputmask");var l;Object.getOwnPropertyDescriptor&&(l=Object.getOwnPropertyDescriptor(this,"value"));l&&l.get?this._valueGet&&Object.defineProperty(this,"value",{get:this._valueGet,set:this._valueSet}):document.__lookupGetter__&&this.__lookupGetter__("value")&&this._valueGet&&(this.__defineGetter__("value",this._valueGet),this.__defineSetter__("value",this._valueSet));try{delete this._valueGet,delete this._valueSet}catch(k){this._valueSet=this._valueGet=
void 0}}});case "getemptymask":return this.data("_inputmask")?(m=this.data("_inputmask").masksets,g=this.data("_inputmask").activeMasksetIndex,m[g]._buffer.join("")):"";case "hasMaskedValue":return this.data("_inputmask")?!this.data("_inputmask").opts.autoUnmask:!1;case "isComplete":return m=this.data("_inputmask").masksets,g=this.data("_inputmask").activeMasksetIndex,a=this.data("_inputmask").opts,w(m,g,a,{action:"isComplete",buffer:this[0]._valueGet().split("")});case "getmetadata":if(this.data("_inputmask"))return m=
this.data("_inputmask").masksets,g=this.data("_inputmask").activeMasksetIndex,m[g].metadata;break;default:return D(e,k,a)||(a.mask=e),m=C(a),0==m.length?this:this.each(function(){w(d.extend(!0,{},m),g,a,{action:"mask",el:this})})}else{if("object"==typeof e)return a=d.extend(!0,{},d.inputmask.defaults,e),D(a.alias,e,a),m=C(a),0==m.length?this:this.each(function(){w(d.extend(!0,{},m),g,a,{action:"mask",el:this})});if(void 0==e)return this.each(function(){var e=d(this).attr("data-inputmask");if(e&&""!=
e)try{var e=e.replace(RegExp("'","g"),'"'),g=d.parseJSON("{"+e+"}");d.extend(!0,g,k);a=d.extend(!0,{},d.inputmask.defaults,g);D(a.alias,g,a);a.alias=void 0;d(this).inputmask(a)}catch(m){}})}}}})(jQuery);
(function(d){d.extend(d.inputmask.defaults.definitions,{A:{validator:"[A-Za-z]",cardinality:1,casing:"upper"},"#":{validator:"[A-Za-z\u0410-\u044f\u0401\u04510-9]",cardinality:1,casing:"upper"}});d.extend(d.inputmask.defaults.aliases,{url:{mask:"ir",placeholder:"",separator:"",defaultPrefix:"http://",regex:{urlpre1:/[fh]/,urlpre2:/(ft|ht)/,urlpre3:/(ftp|htt)/,urlpre4:/(ftp:|http|ftps)/,urlpre5:/(ftp:\/|ftps:|http:|https)/,urlpre6:/(ftp:\/\/|ftps:\/|http:\/|https:)/,urlpre7:/(ftp:\/\/|ftps:\/\/|http:\/\/|https:\/)/,
urlpre8:/(ftp:\/\/|ftps:\/\/|http:\/\/|https:\/\/)/},definitions:{i:{validator:function(a,c,b,k,h){return!0},cardinality:8,prevalidator:function(){for(var a=[],c=0;8>c;c++)a[c]=function(){var b=c;return{validator:function(a,c,f,e,d){if(d.regex["urlpre"+(b+1)]){var g=a;0<b+1-a.length&&(g=c.join("").substring(0,b+1-a.length)+""+g);a=d.regex["urlpre"+(b+1)].test(g);if(!e&&!a){f-=b;for(e=0;e<d.defaultPrefix.length;e++)c[f]=d.defaultPrefix[e],f++;for(e=0;e<g.length-1;e++)c[f]=g[e],f++;return{pos:f}}return a}return!1},
cardinality:b}}();return a}()},r:{validator:".",cardinality:50}},insertMode:!1,autoUnmask:!1},ip:{mask:["[[x]y]z.[[x]y]z.[[x]y]z.x[yz]","[[x]y]z.[[x]y]z.[[x]y]z.[[x]y][z]"],definitions:{x:{validator:"[012]",cardinality:1,definitionSymbol:"i"},y:{validator:function(a,c,b,d,h){a=-1<b-1&&"."!=c[b-1]?c[b-1]+a:"0"+a;return/2[0-5]|[01][0-9]/.test(a)},cardinality:1,definitionSymbol:"i"},z:{validator:function(a,c,b,d,h){-1<b-1&&"."!=c[b-1]?(a=c[b-1]+a,a=-1<b-2&&"."!=c[b-2]?c[b-2]+a:"0"+a):a="00"+a;return/25[0-5]|2[0-4][0-9]|[01][0-9][0-9]/.test(a)},
cardinality:1,definitionSymbol:"i"}}}})})(jQuery);
(function(k){k.extend(k.inputmask.defaults.aliases,{decimal:{mask:"~",placeholder:"",repeat:"*",greedy:!1,numericInput:!1,isNumeric:!0,digits:"*",groupSeparator:"",radixPoint:".",groupSize:3,autoGroup:!1,allowPlus:!0,allowMinus:!0,integerDigits:"*",defaultValue:"",prefix:"",suffix:"",getMaskLength:function(a,e,d,c,b){var f=a.length;e||("*"==d?f=c.length+1:1<d&&(f+=a.length*(d-1)));a=k.inputmask.escapeRegex.call(this,b.groupSeparator);b=k.inputmask.escapeRegex.call(this,b.radixPoint);c=c.join("");
b=c.replace(RegExp(a,"g"),"").replace(RegExp(b),"");return f+(c.length-b.length)},postFormat:function(a,e,d,c){if(""==c.groupSeparator)return e;var b=a.slice();k.inArray(c.radixPoint,a);d||b.splice(e,0,"?");b=b.join("");if(c.autoGroup||d&&-1!=b.indexOf(c.groupSeparator)){for(var f=k.inputmask.escapeRegex.call(this,c.groupSeparator),b=b.replace(RegExp(f,"g"),""),f=b.split(c.radixPoint),b=f[0],g=RegExp("([-+]?[\\d?]+)([\\d?]{"+c.groupSize+"})");g.test(b);)b=b.replace(g,"$1"+c.groupSeparator+"$2"),b=
b.replace(c.groupSeparator+c.groupSeparator,c.groupSeparator);1<f.length&&(b+=c.radixPoint+f[1])}a.length=b.length;c=0;for(f=b.length;c<f;c++)a[c]=b.charAt(c);b=k.inArray("?",a);d||a.splice(b,1);return d?e:b},regex:{number:function(a){var e=k.inputmask.escapeRegex.call(this,a.groupSeparator),d=k.inputmask.escapeRegex.call(this,a.radixPoint),c=isNaN(a.digits)?a.digits:"{0,"+a.digits+"}";return RegExp("^"+(a.allowPlus||a.allowMinus?"["+(a.allowPlus?"+":"")+(a.allowMinus?"-":"")+"]?":"")+"(\\d+|\\d{1,"+
a.groupSize+"}(("+e+"\\d{"+a.groupSize+"})?)+)("+d+"\\d"+c+")?$")}},onKeyDown:function(a,e,d){var c=k(this);if(a.keyCode==d.keyCode.TAB){if(a=k.inArray(d.radixPoint,e),-1!=a){for(var b=c.data("_inputmask").masksets,c=c.data("_inputmask").activeMasksetIndex,f=1;f<=d.digits&&f<d.getMaskLength(b[c]._buffer,b[c].greedy,b[c].repeat,e,d);f++)if(void 0==e[a+f]||""==e[a+f])e[a+f]="0";this._valueSet(e.join(""))}}else if(a.keyCode==d.keyCode.DELETE||a.keyCode==d.keyCode.BACKSPACE)return d.postFormat(e,0,!0,
d),this._valueSet(e.join("")),!0},definitions:{"~":{validator:function(a,e,d,c,b){var f=k.extend({},b,{digits:c?"*":b.digits});if(""==a)return!1;if(!c&&1>=d&&"0"===e[0]&&/[\d-]/.test(a)&&1==e.join("").length)return e[0]="",{pos:0};var g=c?e.slice(0,d):e.slice();g.splice(d,0,a);var g=g.join(""),h=k.inputmask.escapeRegex.call(this,b.groupSeparator),g=g.replace(RegExp(h,"g"),"");c&&g.lastIndexOf(b.radixPoint)==g.length-1&&(h=k.inputmask.escapeRegex.call(this,b.radixPoint),g=g.replace(RegExp(h,"g"),""));
if(!c&&""==g)return!1;h=b.regex.number(f).test(g);if(!h&&(g+="0",h=b.regex.number(f).test(g),!h)){h=g.lastIndexOf(b.groupSeparator);for(h=g.length-h;3>=h;h++)g+="0";h=b.regex.number(f).test(g);if(!h&&!c&&a==b.radixPoint&&(h=b.regex.number(f).test("0"+g+"0")))return e[d]="0",d++,{pos:d}}return!1==h||c||a==b.radixPoint?h:{pos:b.postFormat(e,d,"-"==a||"+"==a?!0:!1,b)}},cardinality:1,prevalidator:null}},insertMode:!0,autoUnmask:!1},integer:{regex:{number:function(a){var e=k.inputmask.escapeRegex.call(this,
a.groupSeparator);return RegExp("^"+(a.allowPlus||a.allowMinus?"["+(a.allowPlus?"+":"")+(a.allowMinus?"-":"")+"]?":"")+"(\\d+|\\d{1,"+a.groupSize+"}(("+e+"\\d{"+a.groupSize+"})?)+)$")}},alias:"decimal"}})})(jQuery);
(function(h){h.extend(h.inputmask.defaults.definitions,{h:{validator:"[01][0-9]|2[0-3]",cardinality:2,prevalidator:[{validator:"[0-2]",cardinality:1}]},s:{validator:"[0-5][0-9]",cardinality:2,prevalidator:[{validator:"[0-5]",cardinality:1}]},d:{validator:"0[1-9]|[12][0-9]|3[01]",cardinality:2,prevalidator:[{validator:"[0-3]",cardinality:1}]},m:{validator:"0[1-9]|1[012]",cardinality:2,prevalidator:[{validator:"[01]",cardinality:1}]},y:{validator:"(19|20)\\d{2}",cardinality:4,prevalidator:[{validator:"[12]",
cardinality:1},{validator:"(19|20)",cardinality:2},{validator:"(19|20)\\d",cardinality:3}]}});h.extend(h.inputmask.defaults.aliases,{"dd/mm/yyyy":{mask:"1/2/y",placeholder:"dd/mm/yyyy",regex:{val1pre:/[0-3]/,val1:/0[1-9]|[12][0-9]|3[01]/,val2pre:function(a){a=h.inputmask.escapeRegex.call(this,a);return RegExp("((0[1-9]|[12][0-9]|3[01])"+a+"[01])")},val2:function(a){a=h.inputmask.escapeRegex.call(this,a);return RegExp("((0[1-9]|[12][0-9])"+a+"(0[1-9]|1[012]))|(30"+a+"(0[13-9]|1[012]))|(31"+a+"(0[13578]|1[02]))")}},
leapday:"29/02/",separator:"/",yearrange:{minyear:1900,maxyear:2099},isInYearRange:function(a,d,c){var f=parseInt(a.concat(d.toString().slice(a.length)));a=parseInt(a.concat(c.toString().slice(a.length)));return(NaN!=f?d<=f&&f<=c:!1)||(NaN!=a?d<=a&&a<=c:!1)},determinebaseyear:function(a,d,c){var f=(new Date).getFullYear();if(a>f)return a;if(d<f){for(var f=d.toString().slice(0,2),b=d.toString().slice(2,4);d<f+c;)f--;d=f+b;return a>d?a:d}return f},onKeyUp:function(a,d,c){d=h(this);a.ctrlKey&&a.keyCode==
c.keyCode.RIGHT&&(a=new Date,d.val(a.getDate().toString()+(a.getMonth()+1).toString()+a.getFullYear().toString()))},definitions:{1:{validator:function(a,d,c,f,b){var e=b.regex.val1.test(a);return f||e||a.charAt(1)!=b.separator&&-1=="-./".indexOf(a.charAt(1))||!(e=b.regex.val1.test("0"+a.charAt(0)))?e:(d[c-1]="0",{pos:c,c:a.charAt(0)})},cardinality:2,prevalidator:[{validator:function(a,d,c,f,b){var e=b.regex.val1pre.test(a);return f||e||!(e=b.regex.val1.test("0"+a))?e:(d[c]="0",c++,{pos:c})},cardinality:1}]},
2:{validator:function(a,d,c,f,b){var e=d.join("").substr(0,3);-1!=e.indexOf(b.placeholder[0])&&(e="01"+b.separator);var g=b.regex.val2(b.separator).test(e+a);return f||g||a.charAt(1)!=b.separator&&-1=="-./".indexOf(a.charAt(1))||!(g=b.regex.val2(b.separator).test(e+"0"+a.charAt(0)))?g:(d[c-1]="0",{pos:c,c:a.charAt(0)})},cardinality:2,prevalidator:[{validator:function(a,d,c,f,b){var e=d.join("").substr(0,3);-1!=e.indexOf(b.placeholder[0])&&(e="01"+b.separator);var g=b.regex.val2pre(b.separator).test(e+
a);return f||g||!(g=b.regex.val2(b.separator).test(e+"0"+a))?g:(d[c]="0",c++,{pos:c})},cardinality:1}]},y:{validator:function(a,d,c,f,b){if(b.isInYearRange(a,b.yearrange.minyear,b.yearrange.maxyear)){if(d.join("").substr(0,6)!=b.leapday)return!0;a=parseInt(a,10);return 0===a%4?0===a%100?0===a%400?!0:!1:!0:!1}return!1},cardinality:4,prevalidator:[{validator:function(a,d,c,f,b){var e=b.isInYearRange(a,b.yearrange.minyear,b.yearrange.maxyear);if(!f&&!e){f=b.determinebaseyear(b.yearrange.minyear,b.yearrange.maxyear,
a+"0").toString().slice(0,1);if(e=b.isInYearRange(f+a,b.yearrange.minyear,b.yearrange.maxyear))return d[c++]=f[0],{pos:c};f=b.determinebaseyear(b.yearrange.minyear,b.yearrange.maxyear,a+"0").toString().slice(0,2);if(e=b.isInYearRange(f+a,b.yearrange.minyear,b.yearrange.maxyear))return d[c++]=f[0],d[c++]=f[1],{pos:c}}return e},cardinality:1},{validator:function(a,d,c,f,b){var e=b.isInYearRange(a,b.yearrange.minyear,b.yearrange.maxyear);if(!f&&!e){f=b.determinebaseyear(b.yearrange.minyear,b.yearrange.maxyear,
a).toString().slice(0,2);if(e=b.isInYearRange(a[0]+f[1]+a[1],b.yearrange.minyear,b.yearrange.maxyear))return d[c++]=f[1],{pos:c};f=b.determinebaseyear(b.yearrange.minyear,b.yearrange.maxyear,a).toString().slice(0,2);b.isInYearRange(f+a,b.yearrange.minyear,b.yearrange.maxyear)?d.join("").substr(0,6)!=b.leapday?e=!0:(b=parseInt(a,10),e=0===b%4?0===b%100?0===b%400?!0:!1:!0:!1):e=!1;if(e)return d[c-1]=f[0],d[c++]=f[1],d[c++]=a[0],{pos:c}}return e},cardinality:2},{validator:function(a,d,c,f,b){return b.isInYearRange(a,
b.yearrange.minyear,b.yearrange.maxyear)},cardinality:3}]}},insertMode:!1,autoUnmask:!1},"mm/dd/yyyy":{placeholder:"mm/dd/yyyy",alias:"dd/mm/yyyy",regex:{val2pre:function(a){a=h.inputmask.escapeRegex.call(this,a);return RegExp("((0[13-9]|1[012])"+a+"[0-3])|(02"+a+"[0-2])")},val2:function(a){a=h.inputmask.escapeRegex.call(this,a);return RegExp("((0[1-9]|1[012])"+a+"(0[1-9]|[12][0-9]))|((0[13-9]|1[012])"+a+"30)|((0[13578]|1[02])"+a+"31)")},val1pre:/[01]/,val1:/0[1-9]|1[012]/},leapday:"02/29/",onKeyUp:function(a,
d,c){d=h(this);a.ctrlKey&&a.keyCode==c.keyCode.RIGHT&&(a=new Date,d.val((a.getMonth()+1).toString()+a.getDate().toString()+a.getFullYear().toString()))}},"yyyy/mm/dd":{mask:"y/1/2",placeholder:"yyyy/mm/dd",alias:"mm/dd/yyyy",leapday:"/02/29",onKeyUp:function(a,d,c){d=h(this);a.ctrlKey&&a.keyCode==c.keyCode.RIGHT&&(a=new Date,d.val(a.getFullYear().toString()+(a.getMonth()+1).toString()+a.getDate().toString()))},definitions:{2:{validator:function(a,d,c,f,b){var e=d.join("").substr(5,3);-1!=e.indexOf(b.placeholder[5])&&
(e="01"+b.separator);var g=b.regex.val2(b.separator).test(e+a);if(!(f||g||a.charAt(1)!=b.separator&&-1=="-./".indexOf(a.charAt(1)))&&(g=b.regex.val2(b.separator).test(e+"0"+a.charAt(0))))return d[c-1]="0",{pos:c,c:a.charAt(0)};if(g){if(d.join("").substr(4,4)+a!=b.leapday)return!0;a=parseInt(d.join("").substr(0,4),10);return 0===a%4?0===a%100?0===a%400?!0:!1:!0:!1}return g},cardinality:2,prevalidator:[{validator:function(a,d,c,f,b){var e=d.join("").substr(5,3);-1!=e.indexOf(b.placeholder[5])&&(e="01"+
b.separator);var g=b.regex.val2pre(b.separator).test(e+a);return f||g||!(g=b.regex.val2(b.separator).test(e+"0"+a))?g:(d[c]="0",c++,{pos:c})},cardinality:1}]}}},"dd.mm.yyyy":{mask:"1.2.y",placeholder:"dd.mm.yyyy",leapday:"29.02.",separator:".",alias:"dd/mm/yyyy"},"dd-mm-yyyy":{mask:"1-2-y",placeholder:"dd-mm-yyyy",leapday:"29-02-",separator:"-",alias:"dd/mm/yyyy"},"mm.dd.yyyy":{mask:"1.2.y",placeholder:"mm.dd.yyyy",leapday:"02.29.",separator:".",alias:"mm/dd/yyyy"},"mm-dd-yyyy":{mask:"1-2-y",placeholder:"mm-dd-yyyy",
leapday:"02-29-",separator:"-",alias:"mm/dd/yyyy"},"yyyy.mm.dd":{mask:"y.1.2",placeholder:"yyyy.mm.dd",leapday:".02.29",separator:".",alias:"yyyy/mm/dd"},"yyyy-mm-dd":{mask:"y-1-2",placeholder:"yyyy-mm-dd",leapday:"-02-29",separator:"-",alias:"yyyy/mm/dd"},datetime:{mask:"1/2/y h:s",placeholder:"dd/mm/yyyy hh:mm",alias:"dd/mm/yyyy",regex:{hrspre:/[012]/,hrs24:/2[0-9]|1[3-9]/,hrs:/[01][0-9]|2[0-3]/,ampm:/^[a|p|A|P][m|M]/},timeseparator:":",hourFormat:"24",definitions:{h:{validator:function(a,d,c,f,
b){var e=b.regex.hrs.test(a);return f||e||a.charAt(1)!=b.timeseparator&&-1=="-.:".indexOf(a.charAt(1))||!(e=b.regex.hrs.test("0"+a.charAt(0)))?e&&"24"!==b.hourFormat&&b.regex.hrs24.test(a)?(a=parseInt(a,10),d[c+5]=24==a?"a":"p",d[c+6]="m",a-=12,10>a?(d[c]=a.toString(),d[c-1]="0"):(d[c]=a.toString().charAt(1),d[c-1]=a.toString().charAt(0)),{pos:c,c:d[c]}):e:(d[c-1]="0",d[c]=a.charAt(0),c++,{pos:c})},cardinality:2,prevalidator:[{validator:function(a,d,c,f,b){var e=b.regex.hrspre.test(a);return f||e||
!(e=b.regex.hrs.test("0"+a))?e:(d[c]="0",c++,{pos:c})},cardinality:1}]},t:{validator:function(a,d,c,f,b){return b.regex.ampm.test(a+"m")},casing:"lower",cardinality:1}},insertMode:!1,autoUnmask:!1},datetime12:{mask:"1/2/y h:s t\\m",placeholder:"dd/mm/yyyy hh:mm xm",alias:"datetime",hourFormat:"12"},"hh:mm t":{mask:"h:s t\\m",placeholder:"hh:mm xm",alias:"datetime",hourFormat:"12"},"h:s t":{mask:"h:s t\\m",placeholder:"hh:mm xm",alias:"datetime",hourFormat:"12"},"hh:mm:ss":{mask:"h:s:s",autoUnmask:!1},
"hh:mm":{mask:"h:s",autoUnmask:!1},date:{alias:"dd/mm/yyyy"},"mm/yyyy":{mask:"1/y",placeholder:"mm/yyyy",leapday:"donotuse",separator:"/",alias:"mm/dd/yyyy"}})})(jQuery);
(function($) {

  var cocoon_element_counter = 0;

  var create_new_id = function() {
    return (new Date().getTime() + cocoon_element_counter++);
  }

  var newcontent_braced = function(id) {
    return '[' + id + ']$1';
  }

  var newcontent_underscord = function(id) {
    return '_' + id + '_$1';
  }

  var getInsertionNodeElem = function(insertionNode, insertionTraversal, $this){

    if (!insertionNode){
      return $this.parent();
    }

    if (typeof insertionNode == 'function'){
      if(insertionTraversal){
        console.warn('association-insertion-traversal is ignored, because association-insertion-node is given as a function.')
      }
      return insertionNode($this);
    }

    if(typeof insertionNode == 'string'){
      if (insertionTraversal){
        return $this[insertionTraversal](insertionNode);
      }else{
        return insertionNode == "this" ? $this : $(insertionNode);
      }
    }

  }

  $(document).on('click', '.add_fields', function(e) {
    e.preventDefault();
    var $this                 = $(this),
        assoc                 = $this.data('association'),
        assocs                = $this.data('associations'),
        content               = $this.data('association-insertion-template'),
        insertionMethod       = $this.data('association-insertion-method') || $this.data('association-insertion-position') || 'before',
        insertionNode         = $this.data('association-insertion-node'),
        insertionTraversal    = $this.data('association-insertion-traversal'),
        count                 = parseInt($this.data('count'), 10),
        regexp_braced         = new RegExp('\\[new_' + assoc + '\\](.*?\\s)', 'g'),
        regexp_underscord     = new RegExp('_new_' + assoc + '_(\\w*)', 'g'),
        new_id                = create_new_id(),
        new_content           = content.replace(regexp_braced, newcontent_braced(new_id)),
        new_contents          = [];


    if (new_content == content) {
      regexp_braced     = new RegExp('\\[new_' + assocs + '\\](.*?\\s)', 'g');
      regexp_underscord = new RegExp('_new_' + assocs + '_(\\w*)', 'g');
      new_content       = content.replace(regexp_braced, newcontent_braced(new_id));
    }

    new_content = new_content.replace(regexp_underscord, newcontent_underscord(new_id));
    new_contents = [new_content];

    count = (isNaN(count) ? 1 : Math.max(count, 1));
    count -= 1;

    while (count) {
      new_id      = create_new_id();
      new_content = content.replace(regexp_braced, newcontent_braced(new_id));
      new_content = new_content.replace(regexp_underscord, newcontent_underscord(new_id));
      new_contents.push(new_content);

      count -= 1;
    }

    var insertionNodeElem = getInsertionNodeElem(insertionNode, insertionTraversal, $this)

    if( !insertionNodeElem || (insertionNodeElem.length == 0) ){
      console.warn("Couldn't find the element to insert the template. Make sure your `data-association-insertion-*` on `link_to_add_association` is correct.")
    }

    $.each(new_contents, function(i, node) {
      var contentNode = $(node);

      var before_insert = jQuery.Event('cocoon:before-insert');
      insertionNodeElem.trigger(before_insert, [contentNode]);

      if (!before_insert.isDefaultPrevented()) {
        // allow any of the jquery dom manipulation methods (after, before, append, prepend, etc)
        // to be called on the node.  allows the insertion node to be the parent of the inserted
        // code and doesn't force it to be a sibling like after/before does. default: 'before'
        var addedContent = insertionNodeElem[insertionMethod](contentNode);

        insertionNodeElem.trigger('cocoon:after-insert', [contentNode]);
      }
    });
  });

  $(document).on('click', '.remove_fields.dynamic, .remove_fields.existing', function(e) {
    var $this = $(this),
        wrapper_class = $this.data('wrapper-class') || 'nested-fields',
        node_to_delete = $this.closest('.' + wrapper_class),
        trigger_node = node_to_delete.parent();

    e.preventDefault();

    var before_remove = jQuery.Event('cocoon:before-remove');
    trigger_node.trigger(before_remove, [node_to_delete]);

    if (!before_remove.isDefaultPrevented()) {
      var timeout = trigger_node.data('remove-timeout') || 0;

      setTimeout(function() {
        if ($this.hasClass('dynamic')) {
            node_to_delete.detach();
        } else {
            $this.prev("input[type=hidden]").val("1");
            node_to_delete.hide();
        }
        trigger_node.trigger('cocoon:after-remove', [node_to_delete]);
      }, timeout);
    }
  });


  $(document).on("ready page:load turbolinks:load", function() {
    $('.remove_fields.existing.destroyed').each(function(i, obj) {
      var $this = $(this),
          wrapper_class = $this.data('wrapper-class') || 'nested-fields';

      $this.closest('.' + wrapper_class).hide();
    });
  });

})(jQuery);


/*
Turbolinks 5.2.0
Copyright © 2018 Basecamp, LLC
 */

(function(){var t=this;(function(){(function(){this.Turbolinks={supported:function(){return null!=window.history.pushState&&null!=window.requestAnimationFrame&&null!=window.addEventListener}(),visit:function(t,r){return e.controller.visit(t,r)},clearCache:function(){return e.controller.clearCache()},setProgressBarDelay:function(t){return e.controller.setProgressBarDelay(t)}}}).call(this)}).call(t);var e=t.Turbolinks;(function(){(function(){var t,r,n,o=[].slice;e.copyObject=function(t){var e,r,n;r={};for(e in t)n=t[e],r[e]=n;return r},e.closest=function(e,r){return t.call(e,r)},t=function(){var t,e;return t=document.documentElement,null!=(e=t.closest)?e:function(t){var e;for(e=this;e;){if(e.nodeType===Node.ELEMENT_NODE&&r.call(e,t))return e;e=e.parentNode}}}(),e.defer=function(t){return setTimeout(t,1)},e.throttle=function(t){var e;return e=null,function(){var r;return r=1<=arguments.length?o.call(arguments,0):[],null!=e?e:e=requestAnimationFrame(function(n){return function(){return e=null,t.apply(n,r)}}(this))}},e.dispatch=function(t,e){var r,o,i,s,a,u;return a=null!=e?e:{},u=a.target,r=a.cancelable,o=a.data,i=document.createEvent("Events"),i.initEvent(t,!0,r===!0),i.data=null!=o?o:{},i.cancelable&&!n&&(s=i.preventDefault,i.preventDefault=function(){return this.defaultPrevented||Object.defineProperty(this,"defaultPrevented",{get:function(){return!0}}),s.call(this)}),(null!=u?u:document).dispatchEvent(i),i},n=function(){var t;return t=document.createEvent("Events"),t.initEvent("test",!0,!0),t.preventDefault(),t.defaultPrevented}(),e.match=function(t,e){return r.call(t,e)},r=function(){var t,e,r,n;return t=document.documentElement,null!=(e=null!=(r=null!=(n=t.matchesSelector)?n:t.webkitMatchesSelector)?r:t.msMatchesSelector)?e:t.mozMatchesSelector}(),e.uuid=function(){var t,e,r;for(r="",t=e=1;36>=e;t=++e)r+=9===t||14===t||19===t||24===t?"-":15===t?"4":20===t?(Math.floor(4*Math.random())+8).toString(16):Math.floor(15*Math.random()).toString(16);return r}}).call(this),function(){e.Location=function(){function t(t){var e,r;null==t&&(t=""),r=document.createElement("a"),r.href=t.toString(),this.absoluteURL=r.href,e=r.hash.length,2>e?this.requestURL=this.absoluteURL:(this.requestURL=this.absoluteURL.slice(0,-e),this.anchor=r.hash.slice(1))}var e,r,n,o;return t.wrap=function(t){return t instanceof this?t:new this(t)},t.prototype.getOrigin=function(){return this.absoluteURL.split("/",3).join("/")},t.prototype.getPath=function(){var t,e;return null!=(t=null!=(e=this.requestURL.match(/\/\/[^\/]*(\/[^?;]*)/))?e[1]:void 0)?t:"/"},t.prototype.getPathComponents=function(){return this.getPath().split("/").slice(1)},t.prototype.getLastPathComponent=function(){return this.getPathComponents().slice(-1)[0]},t.prototype.getExtension=function(){var t,e;return null!=(t=null!=(e=this.getLastPathComponent().match(/\.[^.]*$/))?e[0]:void 0)?t:""},t.prototype.isHTML=function(){return this.getExtension().match(/^(?:|\.(?:htm|html|xhtml))$/)},t.prototype.isPrefixedBy=function(t){var e;return e=r(t),this.isEqualTo(t)||o(this.absoluteURL,e)},t.prototype.isEqualTo=function(t){return this.absoluteURL===(null!=t?t.absoluteURL:void 0)},t.prototype.toCacheKey=function(){return this.requestURL},t.prototype.toJSON=function(){return this.absoluteURL},t.prototype.toString=function(){return this.absoluteURL},t.prototype.valueOf=function(){return this.absoluteURL},r=function(t){return e(t.getOrigin()+t.getPath())},e=function(t){return n(t,"/")?t:t+"/"},o=function(t,e){return t.slice(0,e.length)===e},n=function(t,e){return t.slice(-e.length)===e},t}()}.call(this),function(){var t=function(t,e){return function(){return t.apply(e,arguments)}};e.HttpRequest=function(){function r(r,n,o){this.delegate=r,this.requestCanceled=t(this.requestCanceled,this),this.requestTimedOut=t(this.requestTimedOut,this),this.requestFailed=t(this.requestFailed,this),this.requestLoaded=t(this.requestLoaded,this),this.requestProgressed=t(this.requestProgressed,this),this.url=e.Location.wrap(n).requestURL,this.referrer=e.Location.wrap(o).absoluteURL,this.createXHR()}return r.NETWORK_FAILURE=0,r.TIMEOUT_FAILURE=-1,r.timeout=60,r.prototype.send=function(){var t;return this.xhr&&!this.sent?(this.notifyApplicationBeforeRequestStart(),this.setProgress(0),this.xhr.send(),this.sent=!0,"function"==typeof(t=this.delegate).requestStarted?t.requestStarted():void 0):void 0},r.prototype.cancel=function(){return this.xhr&&this.sent?this.xhr.abort():void 0},r.prototype.requestProgressed=function(t){return t.lengthComputable?this.setProgress(t.loaded/t.total):void 0},r.prototype.requestLoaded=function(){return this.endRequest(function(t){return function(){var e;return 200<=(e=t.xhr.status)&&300>e?t.delegate.requestCompletedWithResponse(t.xhr.responseText,t.xhr.getResponseHeader("Turbolinks-Location")):(t.failed=!0,t.delegate.requestFailedWithStatusCode(t.xhr.status,t.xhr.responseText))}}(this))},r.prototype.requestFailed=function(){return this.endRequest(function(t){return function(){return t.failed=!0,t.delegate.requestFailedWithStatusCode(t.constructor.NETWORK_FAILURE)}}(this))},r.prototype.requestTimedOut=function(){return this.endRequest(function(t){return function(){return t.failed=!0,t.delegate.requestFailedWithStatusCode(t.constructor.TIMEOUT_FAILURE)}}(this))},r.prototype.requestCanceled=function(){return this.endRequest()},r.prototype.notifyApplicationBeforeRequestStart=function(){return e.dispatch("turbolinks:request-start",{data:{url:this.url,xhr:this.xhr}})},r.prototype.notifyApplicationAfterRequestEnd=function(){return e.dispatch("turbolinks:request-end",{data:{url:this.url,xhr:this.xhr}})},r.prototype.createXHR=function(){return this.xhr=new XMLHttpRequest,this.xhr.open("GET",this.url,!0),this.xhr.timeout=1e3*this.constructor.timeout,this.xhr.setRequestHeader("Accept","text/html, application/xhtml+xml"),this.xhr.setRequestHeader("Turbolinks-Referrer",this.referrer),this.xhr.onprogress=this.requestProgressed,this.xhr.onload=this.requestLoaded,this.xhr.onerror=this.requestFailed,this.xhr.ontimeout=this.requestTimedOut,this.xhr.onabort=this.requestCanceled},r.prototype.endRequest=function(t){return this.xhr?(this.notifyApplicationAfterRequestEnd(),null!=t&&t.call(this),this.destroy()):void 0},r.prototype.setProgress=function(t){var e;return this.progress=t,"function"==typeof(e=this.delegate).requestProgressed?e.requestProgressed(this.progress):void 0},r.prototype.destroy=function(){var t;return this.setProgress(1),"function"==typeof(t=this.delegate).requestFinished&&t.requestFinished(),this.delegate=null,this.xhr=null},r}()}.call(this),function(){var t=function(t,e){return function(){return t.apply(e,arguments)}};e.ProgressBar=function(){function e(){this.trickle=t(this.trickle,this),this.stylesheetElement=this.createStylesheetElement(),this.progressElement=this.createProgressElement()}var r;return r=300,e.defaultCSS=".turbolinks-progress-bar {\n  position: fixed;\n  display: block;\n  top: 0;\n  left: 0;\n  height: 3px;\n  background: #0076ff;\n  z-index: 9999;\n  transition: width "+r+"ms ease-out, opacity "+r/2+"ms "+r/2+"ms ease-in;\n  transform: translate3d(0, 0, 0);\n}",e.prototype.show=function(){return this.visible?void 0:(this.visible=!0,this.installStylesheetElement(),this.installProgressElement(),this.startTrickling())},e.prototype.hide=function(){return this.visible&&!this.hiding?(this.hiding=!0,this.fadeProgressElement(function(t){return function(){return t.uninstallProgressElement(),t.stopTrickling(),t.visible=!1,t.hiding=!1}}(this))):void 0},e.prototype.setValue=function(t){return this.value=t,this.refresh()},e.prototype.installStylesheetElement=function(){return document.head.insertBefore(this.stylesheetElement,document.head.firstChild)},e.prototype.installProgressElement=function(){return this.progressElement.style.width=0,this.progressElement.style.opacity=1,document.documentElement.insertBefore(this.progressElement,document.body),this.refresh()},e.prototype.fadeProgressElement=function(t){return this.progressElement.style.opacity=0,setTimeout(t,1.5*r)},e.prototype.uninstallProgressElement=function(){return this.progressElement.parentNode?document.documentElement.removeChild(this.progressElement):void 0},e.prototype.startTrickling=function(){return null!=this.trickleInterval?this.trickleInterval:this.trickleInterval=setInterval(this.trickle,r)},e.prototype.stopTrickling=function(){return clearInterval(this.trickleInterval),this.trickleInterval=null},e.prototype.trickle=function(){return this.setValue(this.value+Math.random()/100)},e.prototype.refresh=function(){return requestAnimationFrame(function(t){return function(){return t.progressElement.style.width=10+90*t.value+"%"}}(this))},e.prototype.createStylesheetElement=function(){var t;return t=document.createElement("style"),t.type="text/css",t.textContent=this.constructor.defaultCSS,t},e.prototype.createProgressElement=function(){var t;return t=document.createElement("div"),t.className="turbolinks-progress-bar",t},e}()}.call(this),function(){var t=function(t,e){return function(){return t.apply(e,arguments)}};e.BrowserAdapter=function(){function r(r){this.controller=r,this.showProgressBar=t(this.showProgressBar,this),this.progressBar=new e.ProgressBar}var n,o,i;return i=e.HttpRequest,n=i.NETWORK_FAILURE,o=i.TIMEOUT_FAILURE,r.prototype.visitProposedToLocationWithAction=function(t,e){return this.controller.startVisitToLocationWithAction(t,e)},r.prototype.visitStarted=function(t){return t.issueRequest(),t.changeHistory(),t.loadCachedSnapshot()},r.prototype.visitRequestStarted=function(t){return this.progressBar.setValue(0),t.hasCachedSnapshot()||"restore"!==t.action?this.showProgressBarAfterDelay():this.showProgressBar()},r.prototype.visitRequestProgressed=function(t){return this.progressBar.setValue(t.progress)},r.prototype.visitRequestCompleted=function(t){return t.loadResponse()},r.prototype.visitRequestFailedWithStatusCode=function(t,e){switch(e){case n:case o:return this.reload();default:return t.loadResponse()}},r.prototype.visitRequestFinished=function(t){return this.hideProgressBar()},r.prototype.visitCompleted=function(t){return t.followRedirect()},r.prototype.pageInvalidated=function(){return this.reload()},r.prototype.showProgressBarAfterDelay=function(){return this.progressBarTimeout=setTimeout(this.showProgressBar,this.controller.progressBarDelay)},r.prototype.showProgressBar=function(){return this.progressBar.show()},r.prototype.hideProgressBar=function(){return this.progressBar.hide(),clearTimeout(this.progressBarTimeout)},r.prototype.reload=function(){return window.location.reload()},r}()}.call(this),function(){var t=function(t,e){return function(){return t.apply(e,arguments)}};e.History=function(){function r(e){this.delegate=e,this.onPageLoad=t(this.onPageLoad,this),this.onPopState=t(this.onPopState,this)}return r.prototype.start=function(){return this.started?void 0:(addEventListener("popstate",this.onPopState,!1),addEventListener("load",this.onPageLoad,!1),this.started=!0)},r.prototype.stop=function(){return this.started?(removeEventListener("popstate",this.onPopState,!1),removeEventListener("load",this.onPageLoad,!1),this.started=!1):void 0},r.prototype.push=function(t,r){return t=e.Location.wrap(t),this.update("push",t,r)},r.prototype.replace=function(t,r){return t=e.Location.wrap(t),this.update("replace",t,r)},r.prototype.onPopState=function(t){var r,n,o,i;return this.shouldHandlePopState()&&(i=null!=(n=t.state)?n.turbolinks:void 0)?(r=e.Location.wrap(window.location),o=i.restorationIdentifier,this.delegate.historyPoppedToLocationWithRestorationIdentifier(r,o)):void 0},r.prototype.onPageLoad=function(t){return e.defer(function(t){return function(){return t.pageLoaded=!0}}(this))},r.prototype.shouldHandlePopState=function(){return this.pageIsLoaded()},r.prototype.pageIsLoaded=function(){return this.pageLoaded||"complete"===document.readyState},r.prototype.update=function(t,e,r){var n;return n={turbolinks:{restorationIdentifier:r}},history[t+"State"](n,null,e)},r}()}.call(this),function(){e.HeadDetails=function(){function t(t){var e,r,n,s,a,u;for(this.elements={},n=0,a=t.length;a>n;n++)u=t[n],u.nodeType===Node.ELEMENT_NODE&&(s=u.outerHTML,r=null!=(e=this.elements)[s]?e[s]:e[s]={type:i(u),tracked:o(u),elements:[]},r.elements.push(u))}var e,r,n,o,i;return t.fromHeadElement=function(t){var e;return new this(null!=(e=null!=t?t.childNodes:void 0)?e:[])},t.prototype.hasElementWithKey=function(t){return t in this.elements},t.prototype.getTrackedElementSignature=function(){var t,e;return function(){var r,n;r=this.elements,n=[];for(t in r)e=r[t].tracked,e&&n.push(t);return n}.call(this).join("")},t.prototype.getScriptElementsNotInDetails=function(t){return this.getElementsMatchingTypeNotInDetails("script",t)},t.prototype.getStylesheetElementsNotInDetails=function(t){return this.getElementsMatchingTypeNotInDetails("stylesheet",t)},t.prototype.getElementsMatchingTypeNotInDetails=function(t,e){var r,n,o,i,s,a;o=this.elements,s=[];for(n in o)i=o[n],a=i.type,r=i.elements,a!==t||e.hasElementWithKey(n)||s.push(r[0]);return s},t.prototype.getProvisionalElements=function(){var t,e,r,n,o,i,s;r=[],n=this.elements;for(e in n)o=n[e],s=o.type,i=o.tracked,t=o.elements,null!=s||i?t.length>1&&r.push.apply(r,t.slice(1)):r.push.apply(r,t);return r},t.prototype.getMetaValue=function(t){var e;return null!=(e=this.findMetaElementByName(t))?e.getAttribute("content"):void 0},t.prototype.findMetaElementByName=function(t){var r,n,o,i;r=void 0,i=this.elements;for(o in i)n=i[o].elements,e(n[0],t)&&(r=n[0]);return r},i=function(t){return r(t)?"script":n(t)?"stylesheet":void 0},o=function(t){return"reload"===t.getAttribute("data-turbolinks-track")},r=function(t){var e;return e=t.tagName.toLowerCase(),"script"===e},n=function(t){var e;return e=t.tagName.toLowerCase(),"style"===e||"link"===e&&"stylesheet"===t.getAttribute("rel")},e=function(t,e){var r;return r=t.tagName.toLowerCase(),"meta"===r&&t.getAttribute("name")===e},t}()}.call(this),function(){e.Snapshot=function(){function t(t,e){this.headDetails=t,this.bodyElement=e}return t.wrap=function(t){return t instanceof this?t:"string"==typeof t?this.fromHTMLString(t):this.fromHTMLElement(t)},t.fromHTMLString=function(t){var e;return e=document.createElement("html"),e.innerHTML=t,this.fromHTMLElement(e)},t.fromHTMLElement=function(t){var r,n,o,i;return o=t.querySelector("head"),r=null!=(i=t.querySelector("body"))?i:document.createElement("body"),n=e.HeadDetails.fromHeadElement(o),new this(n,r)},t.prototype.clone=function(){return new this.constructor(this.headDetails,this.bodyElement.cloneNode(!0))},t.prototype.getRootLocation=function(){var t,r;return r=null!=(t=this.getSetting("root"))?t:"/",new e.Location(r)},t.prototype.getCacheControlValue=function(){return this.getSetting("cache-control")},t.prototype.getElementForAnchor=function(t){try{return this.bodyElement.querySelector("[id='"+t+"'], a[name='"+t+"']")}catch(e){}},t.prototype.getPermanentElements=function(){return this.bodyElement.querySelectorAll("[id][data-turbolinks-permanent]")},t.prototype.getPermanentElementById=function(t){return this.bodyElement.querySelector("#"+t+"[data-turbolinks-permanent]")},t.prototype.getPermanentElementsPresentInSnapshot=function(t){var e,r,n,o,i;for(o=this.getPermanentElements(),i=[],r=0,n=o.length;n>r;r++)e=o[r],t.getPermanentElementById(e.id)&&i.push(e);return i},t.prototype.findFirstAutofocusableElement=function(){return this.bodyElement.querySelector("[autofocus]")},t.prototype.hasAnchor=function(t){return null!=this.getElementForAnchor(t)},t.prototype.isPreviewable=function(){return"no-preview"!==this.getCacheControlValue()},t.prototype.isCacheable=function(){return"no-cache"!==this.getCacheControlValue()},t.prototype.isVisitable=function(){return"reload"!==this.getSetting("visit-control")},t.prototype.getSetting=function(t){return this.headDetails.getMetaValue("turbolinks-"+t)},t}()}.call(this),function(){var t=[].slice;e.Renderer=function(){function e(){}var r;return e.render=function(){var e,r,n,o;return n=arguments[0],r=arguments[1],e=3<=arguments.length?t.call(arguments,2):[],o=function(t,e,r){r.prototype=t.prototype;var n=new r,o=t.apply(n,e);return Object(o)===o?o:n}(this,e,function(){}),o.delegate=n,o.render(r),o},e.prototype.renderView=function(t){return this.delegate.viewWillRender(this.newBody),t(),this.delegate.viewRendered(this.newBody)},e.prototype.invalidateView=function(){return this.delegate.viewInvalidated()},e.prototype.createScriptElement=function(t){var e;return"false"===t.getAttribute("data-turbolinks-eval")?t:(e=document.createElement("script"),e.textContent=t.textContent,e.async=!1,r(e,t),e)},r=function(t,e){var r,n,o,i,s,a,u;for(i=e.attributes,a=[],r=0,n=i.length;n>r;r++)s=i[r],o=s.name,u=s.value,a.push(t.setAttribute(o,u));return a},e}()}.call(this),function(){var t,r,n=function(t,e){function r(){this.constructor=t}for(var n in e)o.call(e,n)&&(t[n]=e[n]);return r.prototype=e.prototype,t.prototype=new r,t.__super__=e.prototype,t},o={}.hasOwnProperty;e.SnapshotRenderer=function(e){function o(t,e,r){this.currentSnapshot=t,this.newSnapshot=e,this.isPreview=r,this.currentHeadDetails=this.currentSnapshot.headDetails,this.newHeadDetails=this.newSnapshot.headDetails,this.currentBody=this.currentSnapshot.bodyElement,this.newBody=this.newSnapshot.bodyElement}return n(o,e),o.prototype.render=function(t){return this.shouldRender()?(this.mergeHead(),this.renderView(function(e){return function(){return e.replaceBody(),e.isPreview||e.focusFirstAutofocusableElement(),t()}}(this))):this.invalidateView()},o.prototype.mergeHead=function(){return this.copyNewHeadStylesheetElements(),this.copyNewHeadScriptElements(),this.removeCurrentHeadProvisionalElements(),this.copyNewHeadProvisionalElements()},o.prototype.replaceBody=function(){var t;return t=this.relocateCurrentBodyPermanentElements(),this.activateNewBodyScriptElements(),this.assignNewBody(),this.replacePlaceholderElementsWithClonedPermanentElements(t)},o.prototype.shouldRender=function(){return this.newSnapshot.isVisitable()&&this.trackedElementsAreIdentical()},o.prototype.trackedElementsAreIdentical=function(){return this.currentHeadDetails.getTrackedElementSignature()===this.newHeadDetails.getTrackedElementSignature()},o.prototype.copyNewHeadStylesheetElements=function(){var t,e,r,n,o;for(n=this.getNewHeadStylesheetElements(),o=[],e=0,r=n.length;r>e;e++)t=n[e],o.push(document.head.appendChild(t));return o},o.prototype.copyNewHeadScriptElements=function(){var t,e,r,n,o;for(n=this.getNewHeadScriptElements(),o=[],e=0,r=n.length;r>e;e++)t=n[e],o.push(document.head.appendChild(this.createScriptElement(t)));return o},o.prototype.removeCurrentHeadProvisionalElements=function(){var t,e,r,n,o;for(n=this.getCurrentHeadProvisionalElements(),o=[],e=0,r=n.length;r>e;e++)t=n[e],o.push(document.head.removeChild(t));return o},o.prototype.copyNewHeadProvisionalElements=function(){var t,e,r,n,o;for(n=this.getNewHeadProvisionalElements(),o=[],e=0,r=n.length;r>e;e++)t=n[e],o.push(document.head.appendChild(t));return o},o.prototype.relocateCurrentBodyPermanentElements=function(){var e,n,o,i,s,a,u;for(a=this.getCurrentBodyPermanentElements(),u=[],e=0,n=a.length;n>e;e++)i=a[e],s=t(i),o=this.newSnapshot.getPermanentElementById(i.id),r(i,s.element),r(o,i),u.push(s);return u},o.prototype.replacePlaceholderElementsWithClonedPermanentElements=function(t){var e,n,o,i,s,a,u;for(u=[],o=0,i=t.length;i>o;o++)a=t[o],n=a.element,s=a.permanentElement,e=s.cloneNode(!0),u.push(r(n,e));return u},o.prototype.activateNewBodyScriptElements=function(){var t,e,n,o,i,s;for(i=this.getNewBodyScriptElements(),s=[],e=0,o=i.length;o>e;e++)n=i[e],t=this.createScriptElement(n),s.push(r(n,t));return s},o.prototype.assignNewBody=function(){return document.body=this.newBody},o.prototype.focusFirstAutofocusableElement=function(){var t;return null!=(t=this.newSnapshot.findFirstAutofocusableElement())?t.focus():void 0},o.prototype.getNewHeadStylesheetElements=function(){return this.newHeadDetails.getStylesheetElementsNotInDetails(this.currentHeadDetails)},o.prototype.getNewHeadScriptElements=function(){return this.newHeadDetails.getScriptElementsNotInDetails(this.currentHeadDetails)},o.prototype.getCurrentHeadProvisionalElements=function(){return this.currentHeadDetails.getProvisionalElements()},o.prototype.getNewHeadProvisionalElements=function(){return this.newHeadDetails.getProvisionalElements()},o.prototype.getCurrentBodyPermanentElements=function(){return this.currentSnapshot.getPermanentElementsPresentInSnapshot(this.newSnapshot)},o.prototype.getNewBodyScriptElements=function(){return this.newBody.querySelectorAll("script")},o}(e.Renderer),t=function(t){var e;return e=document.createElement("meta"),e.setAttribute("name","turbolinks-permanent-placeholder"),e.setAttribute("content",t.id),{element:e,permanentElement:t}},r=function(t,e){var r;return(r=t.parentNode)?r.replaceChild(e,t):void 0}}.call(this),function(){var t=function(t,e){function n(){this.constructor=t}for(var o in e)r.call(e,o)&&(t[o]=e[o]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},r={}.hasOwnProperty;e.ErrorRenderer=function(e){function r(t){var e;e=document.createElement("html"),e.innerHTML=t,this.newHead=e.querySelector("head"),this.newBody=e.querySelector("body")}return t(r,e),r.prototype.render=function(t){return this.renderView(function(e){return function(){return e.replaceHeadAndBody(),e.activateBodyScriptElements(),t()}}(this))},r.prototype.replaceHeadAndBody=function(){var t,e;return e=document.head,t=document.body,e.parentNode.replaceChild(this.newHead,e),t.parentNode.replaceChild(this.newBody,t)},r.prototype.activateBodyScriptElements=function(){var t,e,r,n,o,i;for(n=this.getScriptElements(),i=[],e=0,r=n.length;r>e;e++)o=n[e],t=this.createScriptElement(o),i.push(o.parentNode.replaceChild(t,o));return i},r.prototype.getScriptElements=function(){return document.documentElement.querySelectorAll("script")},r}(e.Renderer)}.call(this),function(){e.View=function(){function t(t){this.delegate=t,this.htmlElement=document.documentElement}return t.prototype.getRootLocation=function(){return this.getSnapshot().getRootLocation()},t.prototype.getElementForAnchor=function(t){return this.getSnapshot().getElementForAnchor(t)},t.prototype.getSnapshot=function(){return e.Snapshot.fromHTMLElement(this.htmlElement)},t.prototype.render=function(t,e){var r,n,o;return o=t.snapshot,r=t.error,n=t.isPreview,this.markAsPreview(n),null!=o?this.renderSnapshot(o,n,e):this.renderError(r,e)},t.prototype.markAsPreview=function(t){return t?this.htmlElement.setAttribute("data-turbolinks-preview",""):this.htmlElement.removeAttribute("data-turbolinks-preview")},t.prototype.renderSnapshot=function(t,r,n){return e.SnapshotRenderer.render(this.delegate,n,this.getSnapshot(),e.Snapshot.wrap(t),r)},t.prototype.renderError=function(t,r){return e.ErrorRenderer.render(this.delegate,r,t)},t}()}.call(this),function(){var t=function(t,e){return function(){return t.apply(e,arguments)}};e.ScrollManager=function(){function r(r){this.delegate=r,this.onScroll=t(this.onScroll,this),this.onScroll=e.throttle(this.onScroll)}return r.prototype.start=function(){return this.started?void 0:(addEventListener("scroll",this.onScroll,!1),this.onScroll(),this.started=!0)},r.prototype.stop=function(){return this.started?(removeEventListener("scroll",this.onScroll,!1),this.started=!1):void 0},r.prototype.scrollToElement=function(t){return t.scrollIntoView()},r.prototype.scrollToPosition=function(t){var e,r;return e=t.x,r=t.y,window.scrollTo(e,r)},r.prototype.onScroll=function(t){return this.updatePosition({x:window.pageXOffset,y:window.pageYOffset})},r.prototype.updatePosition=function(t){var e;return this.position=t,null!=(e=this.delegate)?e.scrollPositionChanged(this.position):void 0},r}()}.call(this),function(){e.SnapshotCache=function(){function t(t){this.size=t,this.keys=[],this.snapshots={}}var r;return t.prototype.has=function(t){var e;return e=r(t),e in this.snapshots},t.prototype.get=function(t){var e;if(this.has(t))return e=this.read(t),this.touch(t),e},t.prototype.put=function(t,e){return this.write(t,e),this.touch(t),e},t.prototype.read=function(t){var e;return e=r(t),this.snapshots[e]},t.prototype.write=function(t,e){var n;return n=r(t),this.snapshots[n]=e},t.prototype.touch=function(t){var e,n;return n=r(t),e=this.keys.indexOf(n),e>-1&&this.keys.splice(e,1),this.keys.unshift(n),this.trim()},t.prototype.trim=function(){var t,e,r,n,o;for(n=this.keys.splice(this.size),o=[],t=0,r=n.length;r>t;t++)e=n[t],o.push(delete this.snapshots[e]);return o},r=function(t){return e.Location.wrap(t).toCacheKey()},t}()}.call(this),function(){var t=function(t,e){return function(){return t.apply(e,arguments)}};e.Visit=function(){function r(r,n,o){this.controller=r,this.action=o,this.performScroll=t(this.performScroll,this),this.identifier=e.uuid(),this.location=e.Location.wrap(n),this.adapter=this.controller.adapter,this.state="initialized",this.timingMetrics={}}var n;return r.prototype.start=function(){return"initialized"===this.state?(this.recordTimingMetric("visitStart"),this.state="started",this.adapter.visitStarted(this)):void 0},r.prototype.cancel=function(){var t;return"started"===this.state?(null!=(t=this.request)&&t.cancel(),this.cancelRender(),this.state="canceled"):void 0},r.prototype.complete=function(){var t;return"started"===this.state?(this.recordTimingMetric("visitEnd"),this.state="completed","function"==typeof(t=this.adapter).visitCompleted&&t.visitCompleted(this),this.controller.visitCompleted(this)):void 0},r.prototype.fail=function(){var t;return"started"===this.state?(this.state="failed","function"==typeof(t=this.adapter).visitFailed?t.visitFailed(this):void 0):void 0},r.prototype.changeHistory=function(){var t,e;return this.historyChanged?void 0:(t=this.location.isEqualTo(this.referrer)?"replace":this.action,e=n(t),this.controller[e](this.location,this.restorationIdentifier),this.historyChanged=!0)},r.prototype.issueRequest=function(){return this.shouldIssueRequest()&&null==this.request?(this.progress=0,this.request=new e.HttpRequest(this,this.location,this.referrer),this.request.send()):void 0},r.prototype.getCachedSnapshot=function(){var t;return!(t=this.controller.getCachedSnapshotForLocation(this.location))||null!=this.location.anchor&&!t.hasAnchor(this.location.anchor)||"restore"!==this.action&&!t.isPreviewable()?void 0:t},r.prototype.hasCachedSnapshot=function(){return null!=this.getCachedSnapshot()},r.prototype.loadCachedSnapshot=function(){var t,e;return(e=this.getCachedSnapshot())?(t=this.shouldIssueRequest(),this.render(function(){var r;return this.cacheSnapshot(),this.controller.render({snapshot:e,isPreview:t},this.performScroll),"function"==typeof(r=this.adapter).visitRendered&&r.visitRendered(this),t?void 0:this.complete()})):void 0},r.prototype.loadResponse=function(){return null!=this.response?this.render(function(){var t,e;return this.cacheSnapshot(),this.request.failed?(this.controller.render({error:this.response},this.performScroll),"function"==typeof(t=this.adapter).visitRendered&&t.visitRendered(this),this.fail()):(this.controller.render({snapshot:this.response},this.performScroll),"function"==typeof(e=this.adapter).visitRendered&&e.visitRendered(this),this.complete())}):void 0},r.prototype.followRedirect=function(){return this.redirectedToLocation&&!this.followedRedirect?(this.location=this.redirectedToLocation,this.controller.replaceHistoryWithLocationAndRestorationIdentifier(this.redirectedToLocation,this.restorationIdentifier),this.followedRedirect=!0):void 0},r.prototype.requestStarted=function(){var t;return this.recordTimingMetric("requestStart"),"function"==typeof(t=this.adapter).visitRequestStarted?t.visitRequestStarted(this):void 0},r.prototype.requestProgressed=function(t){var e;return this.progress=t,"function"==typeof(e=this.adapter).visitRequestProgressed?e.visitRequestProgressed(this):void 0},r.prototype.requestCompletedWithResponse=function(t,r){return this.response=t,null!=r&&(this.redirectedToLocation=e.Location.wrap(r)),this.adapter.visitRequestCompleted(this)},r.prototype.requestFailedWithStatusCode=function(t,e){return this.response=e,this.adapter.visitRequestFailedWithStatusCode(this,t)},r.prototype.requestFinished=function(){var t;return this.recordTimingMetric("requestEnd"),"function"==typeof(t=this.adapter).visitRequestFinished?t.visitRequestFinished(this):void 0},r.prototype.performScroll=function(){return this.scrolled?void 0:("restore"===this.action?this.scrollToRestoredPosition()||this.scrollToTop():this.scrollToAnchor()||this.scrollToTop(),this.scrolled=!0)},r.prototype.scrollToRestoredPosition=function(){var t,e;return t=null!=(e=this.restorationData)?e.scrollPosition:void 0,null!=t?(this.controller.scrollToPosition(t),!0):void 0},r.prototype.scrollToAnchor=function(){return null!=this.location.anchor?(this.controller.scrollToAnchor(this.location.anchor),!0):void 0},r.prototype.scrollToTop=function(){return this.controller.scrollToPosition({x:0,y:0})},r.prototype.recordTimingMetric=function(t){var e;return null!=(e=this.timingMetrics)[t]?e[t]:e[t]=(new Date).getTime()},r.prototype.getTimingMetrics=function(){return e.copyObject(this.timingMetrics)},n=function(t){switch(t){case"replace":return"replaceHistoryWithLocationAndRestorationIdentifier";case"advance":case"restore":return"pushHistoryWithLocationAndRestorationIdentifier"}},r.prototype.shouldIssueRequest=function(){return"restore"===this.action?!this.hasCachedSnapshot():!0},r.prototype.cacheSnapshot=function(){return this.snapshotCached?void 0:(this.controller.cacheSnapshot(),this.snapshotCached=!0)},r.prototype.render=function(t){return this.cancelRender(),this.frame=requestAnimationFrame(function(e){return function(){return e.frame=null,t.call(e)}}(this))},r.prototype.cancelRender=function(){return this.frame?cancelAnimationFrame(this.frame):void 0},r}()}.call(this),function(){var t=function(t,e){return function(){return t.apply(e,arguments)}};e.Controller=function(){function r(){this.clickBubbled=t(this.clickBubbled,this),this.clickCaptured=t(this.clickCaptured,this),this.pageLoaded=t(this.pageLoaded,this),this.history=new e.History(this),this.view=new e.View(this),this.scrollManager=new e.ScrollManager(this),this.restorationData={},this.clearCache(),this.setProgressBarDelay(500)}return r.prototype.start=function(){return e.supported&&!this.started?(addEventListener("click",this.clickCaptured,!0),addEventListener("DOMContentLoaded",this.pageLoaded,!1),this.scrollManager.start(),this.startHistory(),this.started=!0,this.enabled=!0):void 0},r.prototype.disable=function(){return this.enabled=!1},r.prototype.stop=function(){return this.started?(removeEventListener("click",this.clickCaptured,!0),removeEventListener("DOMContentLoaded",this.pageLoaded,!1),this.scrollManager.stop(),this.stopHistory(),this.started=!1):void 0},r.prototype.clearCache=function(){return this.cache=new e.SnapshotCache(10)},r.prototype.visit=function(t,r){var n,o;return null==r&&(r={}),t=e.Location.wrap(t),this.applicationAllowsVisitingLocation(t)?this.locationIsVisitable(t)?(n=null!=(o=r.action)?o:"advance",this.adapter.visitProposedToLocationWithAction(t,n)):window.location=t:void 0},r.prototype.startVisitToLocationWithAction=function(t,r,n){var o;return e.supported?(o=this.getRestorationDataForIdentifier(n),this.startVisit(t,r,{restorationData:o})):window.location=t},r.prototype.setProgressBarDelay=function(t){return this.progressBarDelay=t},r.prototype.startHistory=function(){return this.location=e.Location.wrap(window.location),this.restorationIdentifier=e.uuid(),this.history.start(),this.history.replace(this.location,this.restorationIdentifier)},r.prototype.stopHistory=function(){return this.history.stop()},r.prototype.pushHistoryWithLocationAndRestorationIdentifier=function(t,r){return this.restorationIdentifier=r,this.location=e.Location.wrap(t),this.history.push(this.location,this.restorationIdentifier)},r.prototype.replaceHistoryWithLocationAndRestorationIdentifier=function(t,r){return this.restorationIdentifier=r,this.location=e.Location.wrap(t),this.history.replace(this.location,this.restorationIdentifier)},r.prototype.historyPoppedToLocationWithRestorationIdentifier=function(t,r){var n;return this.restorationIdentifier=r,this.enabled?(n=this.getRestorationDataForIdentifier(this.restorationIdentifier),this.startVisit(t,"restore",{restorationIdentifier:this.restorationIdentifier,restorationData:n,historyChanged:!0}),this.location=e.Location.wrap(t)):this.adapter.pageInvalidated()},r.prototype.getCachedSnapshotForLocation=function(t){var e;return null!=(e=this.cache.get(t))?e.clone():void 0},r.prototype.shouldCacheSnapshot=function(){return this.view.getSnapshot().isCacheable();
},r.prototype.cacheSnapshot=function(){var t,r;return this.shouldCacheSnapshot()?(this.notifyApplicationBeforeCachingSnapshot(),r=this.view.getSnapshot(),t=this.lastRenderedLocation,e.defer(function(e){return function(){return e.cache.put(t,r.clone())}}(this))):void 0},r.prototype.scrollToAnchor=function(t){var e;return(e=this.view.getElementForAnchor(t))?this.scrollToElement(e):this.scrollToPosition({x:0,y:0})},r.prototype.scrollToElement=function(t){return this.scrollManager.scrollToElement(t)},r.prototype.scrollToPosition=function(t){return this.scrollManager.scrollToPosition(t)},r.prototype.scrollPositionChanged=function(t){var e;return e=this.getCurrentRestorationData(),e.scrollPosition=t},r.prototype.render=function(t,e){return this.view.render(t,e)},r.prototype.viewInvalidated=function(){return this.adapter.pageInvalidated()},r.prototype.viewWillRender=function(t){return this.notifyApplicationBeforeRender(t)},r.prototype.viewRendered=function(){return this.lastRenderedLocation=this.currentVisit.location,this.notifyApplicationAfterRender()},r.prototype.pageLoaded=function(){return this.lastRenderedLocation=this.location,this.notifyApplicationAfterPageLoad()},r.prototype.clickCaptured=function(){return removeEventListener("click",this.clickBubbled,!1),addEventListener("click",this.clickBubbled,!1)},r.prototype.clickBubbled=function(t){var e,r,n;return this.enabled&&this.clickEventIsSignificant(t)&&(r=this.getVisitableLinkForNode(t.target))&&(n=this.getVisitableLocationForLink(r))&&this.applicationAllowsFollowingLinkToLocation(r,n)?(t.preventDefault(),e=this.getActionForLink(r),this.visit(n,{action:e})):void 0},r.prototype.applicationAllowsFollowingLinkToLocation=function(t,e){var r;return r=this.notifyApplicationAfterClickingLinkToLocation(t,e),!r.defaultPrevented},r.prototype.applicationAllowsVisitingLocation=function(t){var e;return e=this.notifyApplicationBeforeVisitingLocation(t),!e.defaultPrevented},r.prototype.notifyApplicationAfterClickingLinkToLocation=function(t,r){return e.dispatch("turbolinks:click",{target:t,data:{url:r.absoluteURL},cancelable:!0})},r.prototype.notifyApplicationBeforeVisitingLocation=function(t){return e.dispatch("turbolinks:before-visit",{data:{url:t.absoluteURL},cancelable:!0})},r.prototype.notifyApplicationAfterVisitingLocation=function(t){return e.dispatch("turbolinks:visit",{data:{url:t.absoluteURL}})},r.prototype.notifyApplicationBeforeCachingSnapshot=function(){return e.dispatch("turbolinks:before-cache")},r.prototype.notifyApplicationBeforeRender=function(t){return e.dispatch("turbolinks:before-render",{data:{newBody:t}})},r.prototype.notifyApplicationAfterRender=function(){return e.dispatch("turbolinks:render")},r.prototype.notifyApplicationAfterPageLoad=function(t){return null==t&&(t={}),e.dispatch("turbolinks:load",{data:{url:this.location.absoluteURL,timing:t}})},r.prototype.startVisit=function(t,e,r){var n;return null!=(n=this.currentVisit)&&n.cancel(),this.currentVisit=this.createVisit(t,e,r),this.currentVisit.start(),this.notifyApplicationAfterVisitingLocation(t)},r.prototype.createVisit=function(t,r,n){var o,i,s,a,u;return i=null!=n?n:{},a=i.restorationIdentifier,s=i.restorationData,o=i.historyChanged,u=new e.Visit(this,t,r),u.restorationIdentifier=null!=a?a:e.uuid(),u.restorationData=e.copyObject(s),u.historyChanged=o,u.referrer=this.location,u},r.prototype.visitCompleted=function(t){return this.notifyApplicationAfterPageLoad(t.getTimingMetrics())},r.prototype.clickEventIsSignificant=function(t){return!(t.defaultPrevented||t.target.isContentEditable||t.which>1||t.altKey||t.ctrlKey||t.metaKey||t.shiftKey)},r.prototype.getVisitableLinkForNode=function(t){return this.nodeIsVisitable(t)?e.closest(t,"a[href]:not([target]):not([download])"):void 0},r.prototype.getVisitableLocationForLink=function(t){var r;return r=new e.Location(t.getAttribute("href")),this.locationIsVisitable(r)?r:void 0},r.prototype.getActionForLink=function(t){var e;return null!=(e=t.getAttribute("data-turbolinks-action"))?e:"advance"},r.prototype.nodeIsVisitable=function(t){var r;return(r=e.closest(t,"[data-turbolinks]"))?"false"!==r.getAttribute("data-turbolinks"):!0},r.prototype.locationIsVisitable=function(t){return t.isPrefixedBy(this.view.getRootLocation())&&t.isHTML()},r.prototype.getCurrentRestorationData=function(){return this.getRestorationDataForIdentifier(this.restorationIdentifier)},r.prototype.getRestorationDataForIdentifier=function(t){var e;return null!=(e=this.restorationData)[t]?e[t]:e[t]={}},r}()}.call(this),function(){!function(){var t,e;if((t=e=document.currentScript)&&!e.hasAttribute("data-turbolinks-suppress-warning"))for(;t=t.parentNode;)if(t===document.body)return console.warn("You are loading Turbolinks from a <script> element inside the <body> element. This is probably not what you meant to do!\n\nLoad your application\u2019s JavaScript bundle inside the <head> element instead. <script> elements in <body> are evaluated with each page change.\n\nFor more information, see: https://github.com/turbolinks/turbolinks#working-with-script-elements\n\n\u2014\u2014\nSuppress this warning by adding a `data-turbolinks-suppress-warning` attribute to: %s",e.outerHTML)}()}.call(this),function(){var t,r,n;e.start=function(){return r()?(null==e.controller&&(e.controller=t()),e.controller.start()):void 0},r=function(){return null==window.Turbolinks&&(window.Turbolinks=e),n()},t=function(){var t;return t=new e.Controller,t.adapter=new e.BrowserAdapter(t),t},n=function(){return window.Turbolinks===e},n()&&e.start()}.call(this)}).call(this),"object"==typeof module&&module.exports?module.exports=e:"function"==typeof define&&define.amd&&define(e)}).call(this);
$( document ).ready(function() {

  $('#user_select').change(function(){
    $.ajax({
      url: '/admin/stores_list',
      type: 'GET',
      data: { user_id: $(this).val() }
    });
  });

  $('#store_id').change(function(){
    console.log($(this).val());
    $.ajax({
      url: '/admin/products_list',
      type: 'GET',
      data: { store_id: $(this).val() }
    });
  });

  $("#checkTodos").change(function () {
    $("input:checkbox").prop('checked', $(this).prop("checked"));
  });

  $("#save_event").click(function(){
    var chkArray = [];
    var stkArray = [];
    $(".chk:checked").each(function(){
      chkArray.push($(this).val());
      stkArray.push($(this).closest('tr').find('#stock_event').val());
    });

    $("#product_ids").val(chkArray);
    $("#product_stk").val(stkArray);
  });
  
});
/*
  The MIT License (MIT)

  Copyright (c) 2016 Meetecho

  Permission is hereby granted, free of charge, to any person obtaining
  a copy of this software and associated documentation files (the "Software"),
  to deal in the Software without restriction, including without limitation
  the rights to use, copy, modify, merge, publish, distribute, sublicense,
  and/or sell copies of the Software, and to permit persons to whom the
  Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included
  in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
  OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
  OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
  ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
  OTHER DEALINGS IN THE SOFTWARE.
 */

// List of sessions
Janus.sessions = {};

// Screensharing Chrome Extension ID
Janus.extensionId = "hapfgfdkleiggjjpfpenajgdnfckjpaj";
Janus.isExtensionEnabled = function() {
  if(window.navigator.userAgent.match('Chrome')) {
    var chromever = parseInt(window.navigator.userAgent.match(/Chrome\/(.*) /)[1], 10);
    var maxver = 33;
    if(window.navigator.userAgent.match('Linux'))
      maxver = 35;  // "known" crash in chrome 34 and 35 on linux
    if(chromever >= 26 && chromever <= maxver) {
      // Older versions of Chrome don't support this extension-based approach, so lie
      return true;
    }
    return ($('#janus-extension-installed').length > 0);
  } else {
    // Firefox of others, no need for the extension (but this doesn't mean it will work)
    return true;
  }
};

Janus.noop = function() {};

// Initialization
Janus.init = function(options) {
  options = options || {};
  options.callback = (typeof options.callback == "function") ? options.callback : Janus.noop;
  if(Janus.initDone === true) {
    // Already initialized
    options.callback();
  } else {
    if(typeof console == "undefined" || typeof console.log == "undefined")
      console = { log: function() {} };
    // Console logging (all debugging disabled by default)
    Janus.trace = Janus.noop;
    Janus.debug = Janus.noop;
    Janus.vdebug = Janus.noop;
    Janus.log = Janus.noop;
    Janus.warn = Janus.noop;
    Janus.error = Janus.noop;
    if(options.debug === true || options.debug === "all") {
      // Enable all debugging levels
      Janus.trace = console.trace.bind(console);
      Janus.debug = console.debug.bind(console);
      Janus.vdebug = console.debug.bind(console);
      Janus.log = console.log.bind(console);
      Janus.warn = console.warn.bind(console);
      Janus.error = console.error.bind(console);
    } else if(Array.isArray(options.debug)) {
      for(var i in options.debug) {
        var d = options.debug[i];
        switch(d) {
          case "trace":
            Janus.trace = console.trace.bind(console);
            break;
          case "debug":
            Janus.debug = console.debug.bind(console);
            break;
          case "vdebug":
            Janus.vdebug = console.debug.bind(console);
            break;
          case "log":
            Janus.log = console.log.bind(console);
            break;
          case "warn":
            Janus.warn = console.warn.bind(console);
            break;
          case "error":
            Janus.error = console.error.bind(console);
            break;
          default:
            console.error("Unknown debugging option '" + d + "' (supported: 'trace', 'debug', 'vdebug', 'log', warn', 'error')");
            break;
        }
      }
    }
    Janus.log("Initializing library");
    // Helper method to enumerate devices
    Janus.listDevices = function(callback) {
      callback = (typeof callback == "function") ? callback : Janus.noop;
      if(navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then(function(stream) {
          navigator.mediaDevices.enumerateDevices().then(function(devices) {
            Janus.debug(devices);
            callback(devices);
            // Get rid of the now useless stream
            try {
              stream.stop();
            } catch(e) {}
            try {
              var tracks = stream.getTracks();
              for(var i in tracks) {
                var mst = tracks[i];
                if(mst !== null && mst !== undefined)
                  mst.stop();
              }
            } catch(e) {}
          });
        })
        .catch(function(err) {
          Janus.error(err);
          callback([]);
        });
      } else {
        Janus.warn("navigator.mediaDevices unavailable");
        callback([]);
      }
    }
    // Helper methods to attach/reattach a stream to a video element (previously part of adapter.js)
    Janus.attachMediaStream = function(element, stream) {
      if(adapter.browserDetails.browser === 'chrome') {
        var chromever = adapter.browserDetails.version;
        if(chromever >= 43) {
          element.srcObject = stream;
        } else if(typeof element.src !== 'undefined') {
          element.src = URL.createObjectURL(stream);
        } else {
          Janus.error("Error attaching stream to element");
        }
      } else if(adapter.browserDetails.browser === 'safari' || window.navigator.userAgent.match(/iPad/i) || window.navigator.userAgent.match(/iPhone/i)) {
        element.src = URL.createObjectURL(stream);
      } else {
        element.srcObject = stream;
      }
    };
    Janus.reattachMediaStream = function(to, from) {
      if(adapter.browserDetails.browser === 'chrome') {
        var chromever = adapter.browserDetails.version;
        if(chromever >= 43) {
          to.srcObject = from.srcObject;
        } else if(typeof to.src !== 'undefined') {
          to.src = from.src;
        }
      } else if(adapter.browserDetails.browser === 'safari' || window.navigator.userAgent.match(/iPad/i) || window.navigator.userAgent.match(/iPhone/i)) {
        to.src = from.src;
      } else {
        to.srcObject = from.srcObject;
      }
    };
    // Detect tab close: make sure we don't loose existing onbeforeunload handlers
    var oldOBF = window.onbeforeunload;
    window.onbeforeunload = function() {
      Janus.log("Closing window");
      for(var s in Janus.sessions) {
        if(Janus.sessions[s] !== null && Janus.sessions[s] !== undefined &&
            Janus.sessions[s].destroyOnUnload) {
          Janus.log("Destroying session " + s);
          Janus.sessions[s].destroy({asyncRequest: false});
        }
      }
      if(oldOBF && typeof oldOBF == "function")
        oldOBF();
    }
    Janus.initDone = true;
    options.callback();
  }
};

// Helper method to check whether WebRTC is supported by this browser
Janus.isWebrtcSupported = function() {
  return window.RTCPeerConnection !== undefined && window.RTCPeerConnection !== null &&
    navigator.getUserMedia !== undefined && navigator.getUserMedia !== null;
};

// Helper method to create random identifiers (e.g., transaction)
Janus.randomString = function(len) {
  var charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var randomString = '';
  for (var i = 0; i < len; i++) {
    var randomPoz = Math.floor(Math.random() * charSet.length);
    randomString += charSet.substring(randomPoz,randomPoz+1);
  }
  return randomString;
}


function Janus(gatewayCallbacks) {
  if(Janus.initDone === undefined) {
    gatewayCallbacks.error("Library not initialized");
    return {};
  }
  if(!Janus.isWebrtcSupported()) {
    gatewayCallbacks.error("WebRTC not supported by this browser");
    return {};
  }
  Janus.log("Library initialized: " + Janus.initDone);
  gatewayCallbacks = gatewayCallbacks || {};
  gatewayCallbacks.success = (typeof gatewayCallbacks.success == "function") ? gatewayCallbacks.success : jQuery.noop;
  gatewayCallbacks.error = (typeof gatewayCallbacks.error == "function") ? gatewayCallbacks.error : jQuery.noop;
  gatewayCallbacks.destroyed = (typeof gatewayCallbacks.destroyed == "function") ? gatewayCallbacks.destroyed : jQuery.noop;
  if(gatewayCallbacks.server === null || gatewayCallbacks.server === undefined) {
    gatewayCallbacks.error("Invalid gateway url");
    return {};
  }
  var websockets = false;
  var ws = null;
  var wsHandlers = {};
  var wsKeepaliveTimeoutId = null;

  var servers = null, serversIndex = 0;
  var server = gatewayCallbacks.server;
  if($.isArray(server)) {
    Janus.log("Multiple servers provided (" + server.length + "), will use the first that works");
    server = null;
    servers = gatewayCallbacks.server;
    Janus.debug(servers);
  } else {
    if(server.indexOf("ws") === 0) {
      websockets = true;
      Janus.log("Using WebSockets to contact Janus: " + server);
    } else {
      websockets = false;
      Janus.log("Using REST API to contact Janus: " + server);
    }
  }
  var iceServers = gatewayCallbacks.iceServers;
  if(iceServers === undefined || iceServers === null)
    iceServers = [{urls: "stun:stun.l.google.com:19302"}];
  var iceTransportPolicy = gatewayCallbacks.iceTransportPolicy;
  // Whether IPv6 candidates should be gathered
  var ipv6Support = gatewayCallbacks.ipv6;
  if(ipv6Support === undefined || ipv6Support === null)
    ipv6Support = false;
  // Whether we should enable the withCredentials flag for XHR requests
  var withCredentials = false;
  if(gatewayCallbacks.withCredentials !== undefined && gatewayCallbacks.withCredentials !== null)
    withCredentials = gatewayCallbacks.withCredentials === true;
  // Optional max events
  var maxev = null;
  if(gatewayCallbacks.max_poll_events !== undefined && gatewayCallbacks.max_poll_events !== null)
    maxev = gatewayCallbacks.max_poll_events;
  if(maxev < 1)
    maxev = 1;
  // Token to use (only if the token based authentication mechanism is enabled)
  var token = null;
  if(gatewayCallbacks.token !== undefined && gatewayCallbacks.token !== null)
    token = gatewayCallbacks.token;
  // API secret to use (only if the shared API secret is enabled)
  var apisecret = null;
  if(gatewayCallbacks.apisecret !== undefined && gatewayCallbacks.apisecret !== null)
    apisecret = gatewayCallbacks.apisecret;
  // Whether we should destroy this session when onbeforeunload is called
  this.destroyOnUnload = true;
  if(gatewayCallbacks.destroyOnUnload !== undefined && gatewayCallbacks.destroyOnUnload !== null)
    this.destroyOnUnload = (gatewayCallbacks.destroyOnUnload === true);

  var connected = false;
  var sessionId = null;
  var pluginHandles = {};
  var that = this;
  var retries = 0;
  var transactions = {};
  createSession(gatewayCallbacks);

  // Public methods
  this.getServer = function() { return server; };
  this.isConnected = function() { return connected; };
  this.getSessionId = function() { return sessionId; };
  this.destroy = function(callbacks) { destroySession(callbacks); };
  this.attach = function(callbacks) { createHandle(callbacks); };

  function eventHandler() {
    if(sessionId == null)
      return;
    Janus.debug('Long poll...');
    if(!connected) {
      Janus.warn("Is the gateway down? (connected=false)");
      return;
    }
    var longpoll = server + "/" + sessionId + "?rid=" + new Date().getTime();
    if(maxev !== undefined && maxev !== null)
      longpoll = longpoll + "&maxev=" + maxev;
    if(token !== null && token !== undefined)
      longpoll = longpoll + "&token=" + token;
    if(apisecret !== null && apisecret !== undefined)
      longpoll = longpoll + "&apisecret=" + apisecret;
    $.ajax({
      type: 'GET',
      url: longpoll,
      xhrFields: {
        withCredentials: withCredentials
      },
      cache: false,
      timeout: 60000, // FIXME
      success: handleEvent,
      error: function(XMLHttpRequest, textStatus, errorThrown) {
        Janus.error(textStatus + ": " + errorThrown);
        retries++;
        if(retries > 3) {
          // Did we just lose the gateway? :-(
          connected = false;
          gatewayCallbacks.error("Lost connection to the gateway (is it down?)");
          return;
        }
        eventHandler();
      },
      dataType: "json"
    });
  }

  // Private event handler: this will trigger plugin callbacks, if set
  function handleEvent(json) {
    retries = 0;
    if(!websockets && sessionId !== undefined && sessionId !== null)
      setTimeout(eventHandler, 200);
    if(!websockets && $.isArray(json)) {
      // We got an array: it means we passed a maxev > 1, iterate on all objects
      for(var i=0; i<json.length; i++) {
        handleEvent(json[i]);
      }
      return;
    }
    if(json["janus"] === "keepalive") {
      // Nothing happened
      Janus.vdebug("Got a keepalive on session " + sessionId);
      return;
    } else if(json["janus"] === "ack") {
      // Just an ack, we can probably ignore
      Janus.debug("Got an ack on session " + sessionId);
      Janus.debug(json);
      var transaction = json["transaction"];
      if(transaction !== null && transaction !== undefined) {
        var reportSuccess = transactions[transaction];
        if(reportSuccess !== null && reportSuccess !== undefined) {
          reportSuccess(json);
        }
        delete transactions[transaction];
      }
      return;
    } else if(json["janus"] === "success") {
      // Success!
      Janus.debug("Got a success on session " + sessionId);
      Janus.debug(json);
      var transaction = json["transaction"];
      if(transaction !== null && transaction !== undefined) {
        var reportSuccess = transactions[transaction];
        if(reportSuccess !== null && reportSuccess !== undefined) {
          reportSuccess(json);
        }
        delete transactions[transaction];
      }
      return;
    } else if(json["janus"] === "webrtcup") {
      // The PeerConnection with the gateway is up! Notify this
      Janus.debug("Got a webrtcup event on session " + sessionId);
      Janus.debug(json);
      var sender = json["sender"];
      if(sender === undefined || sender === null) {
        Janus.warn("Missing sender...");
        return;
      }
      var pluginHandle = pluginHandles[sender];
      if(pluginHandle === undefined || pluginHandle === null) {
        Janus.debug("This handle is not attached to this session");
        return;
      }
      pluginHandle.webrtcState(true);
      return;
    } else if(json["janus"] === "hangup") {
      // A plugin asked the core to hangup a PeerConnection on one of our handles
      Janus.debug("Got a hangup event on session " + sessionId);
      Janus.debug(json);
      var sender = json["sender"];
      if(sender === undefined || sender === null) {
        Janus.warn("Missing sender...");
        return;
      }
      var pluginHandle = pluginHandles[sender];
      if(pluginHandle === undefined || pluginHandle === null) {
        Janus.debug("This handle is not attached to this session");
        return;
      }
      pluginHandle.webrtcState(false, json["reason"]);
      pluginHandle.hangup();
    } else if(json["janus"] === "detached") {
      // A plugin asked the core to detach one of our handles
      Janus.debug("Got a detached event on session " + sessionId);
      Janus.debug(json);
      var sender = json["sender"];
      if(sender === undefined || sender === null) {
        Janus.warn("Missing sender...");
        return;
      }
      var pluginHandle = pluginHandles[sender];
      if(pluginHandle === undefined || pluginHandle === null) {
        // Don't warn here because destroyHandle causes this situation.
        return;
      }
      pluginHandle.detached = true;
      pluginHandle.ondetached();
      pluginHandle.detach();
    } else if(json["janus"] === "media") {
      // Media started/stopped flowing
      Janus.debug("Got a media event on session " + sessionId);
      Janus.debug(json);
      var sender = json["sender"];
      if(sender === undefined || sender === null) {
        Janus.warn("Missing sender...");
        return;
      }
      var pluginHandle = pluginHandles[sender];
      if(pluginHandle === undefined || pluginHandle === null) {
        Janus.debug("This handle is not attached to this session");
        return;
      }
      pluginHandle.mediaState(json["type"], json["receiving"]);
    } else if(json["janus"] === "slowlink") {
      Janus.debug("Got a slowlink event on session " + sessionId);
      Janus.debug(json);
      // Trouble uplink or downlink
      var sender = json["sender"];
      if(sender === undefined || sender === null) {
        Janus.warn("Missing sender...");
        return;
      }
      var pluginHandle = pluginHandles[sender];
      if(pluginHandle === undefined || pluginHandle === null) {
        Janus.debug("This handle is not attached to this session");
        return;
      }
      pluginHandle.slowLink(json["uplink"], json["nacks"]);
    } else if(json["janus"] === "error") {
      // Oops, something wrong happened
      Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason); // FIXME
      Janus.debug(json);
      var transaction = json["transaction"];
      if(transaction !== null && transaction !== undefined) {
        var reportSuccess = transactions[transaction];
        if(reportSuccess !== null && reportSuccess !== undefined) {
          reportSuccess(json);
        }
        delete transactions[transaction];
      }
      return;
    } else if(json["janus"] === "event") {
      Janus.debug("Got a plugin event on session " + sessionId);
      Janus.debug(json);
      var sender = json["sender"];
      if(sender === undefined || sender === null) {
        Janus.warn("Missing sender...");
        return;
      }
      var plugindata = json["plugindata"];
      if(plugindata === undefined || plugindata === null) {
        Janus.warn("Missing plugindata...");
        return;
      }
      Janus.debug("  -- Event is coming from " + sender + " (" + plugindata["plugin"] + ")");
      var data = plugindata["data"];
      Janus.debug(data);
      var pluginHandle = pluginHandles[sender];
      if(pluginHandle === undefined || pluginHandle === null) {
        Janus.warn("This handle is not attached to this session");
        return;
      }
      var jsep = json["jsep"];
      if(jsep !== undefined && jsep !== null) {
        Janus.debug("Handling SDP as well...");
        Janus.debug(jsep);
      }
      var callback = pluginHandle.onmessage;
      if(callback !== null && callback !== undefined) {
        Janus.debug("Notifying application...");
        // Send to callback specified when attaching plugin handle
        callback(data, jsep);
      } else {
        // Send to generic callback (?)
        Janus.debug("No provided notification callback");
      }
    } else {
      Janus.warn("Unkown message/event  '" + json["janus"] + "' on session " + sessionId);
      Janus.debug(json);
    }
  }

  // Private helper to send keep-alive messages on WebSockets
  function keepAlive() {
    if(server === null || !websockets || !connected)
      return;
    wsKeepaliveTimeoutId = setTimeout(keepAlive, 30000);
    var request = { "janus": "keepalive", "session_id": sessionId, "transaction": Janus.randomString(12) };
    if(token !== null && token !== undefined)
      request["token"] = token;
    if(apisecret !== null && apisecret !== undefined)
      request["apisecret"] = apisecret;
    ws.send(JSON.stringify(request));
  }

  // Private method to create a session
  function createSession(callbacks) {
    var transaction = Janus.randomString(12);
    var request = { "janus": "create", "transaction": transaction };
    if(token !== null && token !== undefined)
      request["token"] = token;
    if(apisecret !== null && apisecret !== undefined)
      request["apisecret"] = apisecret;
    if(server === null && $.isArray(servers)) {
      // We still need to find a working server from the list we were given
      server = servers[serversIndex];
      if(server.indexOf("ws") === 0) {
        websockets = true;
        Janus.log("Server #" + (serversIndex+1) + ": trying WebSockets to contact Janus (" + server + ")");
      } else {
        websockets = false;
        Janus.log("Server #" + (serversIndex+1) + ": trying REST API to contact Janus (" + server + ")");
      }
    }
    if(websockets) {
      ws = new WebSocket(server, 'janus-protocol');
      wsHandlers = {
        'error': function() {
          Janus.error("Error connecting to the Janus WebSockets server... " + server);
          if ($.isArray(servers)) {
            serversIndex++;
            if (serversIndex == servers.length) {
              // We tried all the servers the user gave us and they all failed
              callbacks.error("Error connecting to any of the provided Janus servers: Is the gateway down?");
              return;
            }
            // Let's try the next server
            server = null;
            setTimeout(function() {
              createSession(callbacks);
            }, 200);
            return;
          }
          callbacks.error("Error connecting to the Janus WebSockets server: Is the gateway down?");
        },

        'open': function() {
          // We need to be notified about the success
          transactions[transaction] = function(json) {
            Janus.debug(json);
            if (json["janus"] !== "success") {
              Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason); // FIXME
              callbacks.error(json["error"].reason);
              return;
            }
            wsKeepaliveTimeoutId = setTimeout(keepAlive, 30000);
            connected = true;
            sessionId = json.data["id"];
            Janus.log("Created session: " + sessionId);
            Janus.sessions[sessionId] = that;
            callbacks.success();
          };
          ws.send(JSON.stringify(request));
        },

        'message': function(event) {
          handleEvent(JSON.parse(event.data));
        },

        'close': function() {
          if (server === null || !connected) {
            return;
          }
          connected = false;
          // FIXME What if this is called when the page is closed?
          gatewayCallbacks.error("Lost connection to the gateway (is it down?)");
        }
      };

      for(var eventName in wsHandlers) {
        ws.addEventListener(eventName, wsHandlers[eventName]);
      }

      return;
    }
    $.ajax({
      type: 'POST',
      url: server,
      xhrFields: {
        withCredentials: withCredentials
      },
      cache: false,
      contentType: "application/json",
      data: JSON.stringify(request),
      success: function(json) {
        Janus.debug(json);
        if(json["janus"] !== "success") {
          Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason); // FIXME
          callbacks.error(json["error"].reason);
          return;
        }
        connected = true;
        sessionId = json.data["id"];
        Janus.log("Created session: " + sessionId);
        Janus.sessions[sessionId] = that;
        eventHandler();
        callbacks.success();
      },
      error: function(XMLHttpRequest, textStatus, errorThrown) {
        Janus.error(textStatus + ": " + errorThrown); // FIXME
        if($.isArray(servers)) {
          serversIndex++;
          if(serversIndex == servers.length) {
            // We tried all the servers the user gave us and they all failed
            callbacks.error("Error connecting to any of the provided Janus servers: Is the gateway down?");
            return;
          }
          // Let's try the next server
          server = null;
          setTimeout(function() { createSession(callbacks); }, 200);
          return;
        }
        if(errorThrown === "")
          callbacks.error(textStatus + ": Is the gateway down?");
        else
          callbacks.error(textStatus + ": " + errorThrown);
      },
      dataType: "json"
    });
  }

  // Private method to destroy a session
  function destroySession(callbacks) {
    callbacks = callbacks || {};
    // FIXME This method triggers a success even when we fail
    callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : jQuery.noop;
    var asyncRequest = true;
    if(callbacks.asyncRequest !== undefined && callbacks.asyncRequest !== null)
      asyncRequest = (callbacks.asyncRequest === true);
    Janus.log("Destroying session " + sessionId + " (async=" + asyncRequest + ")");
    if(!connected) {
      Janus.warn("Is the gateway down? (connected=false)");
      callbacks.success();
      return;
    }
    if(sessionId === undefined || sessionId === null) {
      Janus.warn("No session to destroy");
      callbacks.success();
      gatewayCallbacks.destroyed();
      return;
    }
    delete Janus.sessions[sessionId];
    // No need to destroy all handles first, Janus will do that itself
    var request = { "janus": "destroy", "transaction": Janus.randomString(12) };
    if(token !== null && token !== undefined)
      request["token"] = token;
    if(apisecret !== null && apisecret !== undefined)
      request["apisecret"] = apisecret;
    if(websockets) {
      request["session_id"] = sessionId;

      var unbindWebSocket = function() {
        for(var eventName in wsHandlers) {
          ws.removeEventListener(eventName, wsHandlers[eventName]);
        }
        ws.removeEventListener('message', onUnbindMessage);
        ws.removeEventListener('error', onUnbindError);
        if(wsKeepaliveTimeoutId) {
          clearTimeout(wsKeepaliveTimeoutId);
        }
      };

      var onUnbindMessage = function(event){
        var data = JSON.parse(event.data);
        if(data.session_id == request.session_id && data.transaction == request.transaction) {
          unbindWebSocket();
          callbacks.success();
          gatewayCallbacks.destroyed();
        }
      };
      var onUnbindError = function(event) {
        unbindWebSocket();
        callbacks.error("Failed to destroy the gateway: Is the gateway down?");
        gatewayCallbacks.destroyed();
      };

      ws.addEventListener('message', onUnbindMessage);
      ws.addEventListener('error', onUnbindError);

      ws.send(JSON.stringify(request));
      return;
    }
    $.ajax({
      type: 'POST',
      url: server + "/" + sessionId,
      async: asyncRequest,  // Sometimes we need false here, or destroying in onbeforeunload won't work
      xhrFields: {
        withCredentials: withCredentials
      },
      cache: false,
      contentType: "application/json",
      data: JSON.stringify(request),
      success: function(json) {
        Janus.log("Destroyed session:");
        Janus.debug(json);
        sessionId = null;
        connected = false;
        if(json["janus"] !== "success") {
          Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason); // FIXME
        }
        callbacks.success();
        gatewayCallbacks.destroyed();
      },
      error: function(XMLHttpRequest, textStatus, errorThrown) {
        Janus.error(textStatus + ": " + errorThrown); // FIXME
        // Reset everything anyway
        sessionId = null;
        connected = false;
        callbacks.success();
        gatewayCallbacks.destroyed();
      },
      dataType: "json"
    });
  }

  // Private method to create a plugin handle
  function createHandle(callbacks) {
    callbacks = callbacks || {};
    callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : jQuery.noop;
    callbacks.error = (typeof callbacks.error == "function") ? callbacks.error : jQuery.noop;
    callbacks.consentDialog = (typeof callbacks.consentDialog == "function") ? callbacks.consentDialog : jQuery.noop;
    callbacks.iceState = (typeof callbacks.iceState == "function") ? callbacks.iceState : jQuery.noop;
    callbacks.mediaState = (typeof callbacks.mediaState == "function") ? callbacks.mediaState : jQuery.noop;
    callbacks.webrtcState = (typeof callbacks.webrtcState == "function") ? callbacks.webrtcState : jQuery.noop;
    callbacks.slowLink = (typeof callbacks.slowLink == "function") ? callbacks.slowLink : jQuery.noop;
    callbacks.onmessage = (typeof callbacks.onmessage == "function") ? callbacks.onmessage : jQuery.noop;
    callbacks.onlocalstream = (typeof callbacks.onlocalstream == "function") ? callbacks.onlocalstream : jQuery.noop;
    callbacks.onremotestream = (typeof callbacks.onremotestream == "function") ? callbacks.onremotestream : jQuery.noop;
    callbacks.ondata = (typeof callbacks.ondata == "function") ? callbacks.ondata : jQuery.noop;
    callbacks.ondataopen = (typeof callbacks.ondataopen == "function") ? callbacks.ondataopen : jQuery.noop;
    callbacks.oncleanup = (typeof callbacks.oncleanup == "function") ? callbacks.oncleanup : jQuery.noop;
    callbacks.ondetached = (typeof callbacks.ondetached == "function") ? callbacks.ondetached : jQuery.noop;
    if(!connected) {
      Janus.warn("Is the gateway down? (connected=false)");
      callbacks.error("Is the gateway down? (connected=false)");
      return;
    }
    var plugin = callbacks.plugin;
    if(plugin === undefined || plugin === null) {
      Janus.error("Invalid plugin");
      callbacks.error("Invalid plugin");
      return;
    }
    var opaqueId = callbacks.opaqueId;
    var transaction = Janus.randomString(12);
    var request = { "janus": "attach", "plugin": plugin, "opaque_id": opaqueId, "transaction": transaction };
    if(token !== null && token !== undefined)
      request["token"] = token;
    if(apisecret !== null && apisecret !== undefined)
      request["apisecret"] = apisecret;
    if(websockets) {
      transactions[transaction] = function(json) {
        Janus.debug(json);
        if(json["janus"] !== "success") {
          Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason); // FIXME
          callbacks.error("Ooops: " + json["error"].code + " " + json["error"].reason);
          return;
        }
        var handleId = json.data["id"];
        Janus.log("Created handle: " + handleId);
        var pluginHandle =
          {
            session : that,
            plugin : plugin,
            id : handleId,
            detached : false,
            webrtcStuff : {
              started : false,
              myStream : null,
              streamExternal : false,
              remoteStream : null,
              mySdp : null,
              pc : null,
              dataChannel : null,
              dtmfSender : null,
              trickle : true,
              iceDone : false,
              sdpSent : false,
              volume : {
                value : null,
                timer : null
              },
              bitrate : {
                value : null,
                bsnow : null,
                bsbefore : null,
                tsnow : null,
                tsbefore : null,
                timer : null
              }
            },
            getId : function() { return handleId; },
            getPlugin : function() { return plugin; },
            getVolume : function() { return getVolume(handleId); },
            isAudioMuted : function() { return isMuted(handleId, false); },
            muteAudio : function() { return mute(handleId, false, true); },
            unmuteAudio : function() { return mute(handleId, false, false); },
            isVideoMuted : function() { return isMuted(handleId, true); },
            muteVideo : function() { return mute(handleId, true, true); },
            unmuteVideo : function() { return mute(handleId, true, false); },
            getBitrate : function() { return getBitrate(handleId); },
            send : function(callbacks) { sendMessage(handleId, callbacks); },
            data : function(callbacks) { sendData(handleId, callbacks); },
            dtmf : function(callbacks) { sendDtmf(handleId, callbacks); },
            consentDialog : callbacks.consentDialog,
            iceState : callbacks.iceState,
            mediaState : callbacks.mediaState,
            webrtcState : callbacks.webrtcState,
            slowLink : callbacks.slowLink,
            onmessage : callbacks.onmessage,
            createOffer : function(callbacks) { prepareWebrtc(handleId, callbacks); },
            createAnswer : function(callbacks) { prepareWebrtc(handleId, callbacks); },
            handleRemoteJsep : function(callbacks) { prepareWebrtcPeer(handleId, callbacks); },
            onlocalstream : callbacks.onlocalstream,
            onremotestream : callbacks.onremotestream,
            ondata : callbacks.ondata,
            ondataopen : callbacks.ondataopen,
            oncleanup : callbacks.oncleanup,
            ondetached : callbacks.ondetached,
            hangup : function(sendRequest) { cleanupWebrtc(handleId, sendRequest === true); },
            detach : function(callbacks) { destroyHandle(handleId, callbacks); }
          }
        pluginHandles[handleId] = pluginHandle;
        callbacks.success(pluginHandle);
      };
      request["session_id"] = sessionId;
      ws.send(JSON.stringify(request));
      return;
    }
    $.ajax({
      type: 'POST',
      url: server + "/" + sessionId,
      xhrFields: {
        withCredentials: withCredentials
      },
      cache: false,
      contentType: "application/json",
      data: JSON.stringify(request),
      success: function(json) {
        Janus.debug(json);
        if(json["janus"] !== "success") {
          Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason); // FIXME
          callbacks.error("Ooops: " + json["error"].code + " " + json["error"].reason);
          return;
        }
        var handleId = json.data["id"];
        Janus.log("Created handle: " + handleId);
        var pluginHandle =
          {
            session : that,
            plugin : plugin,
            id : handleId,
            detached : false,
            webrtcStuff : {
              started : false,
              myStream : null,
              streamExternal : false,
              remoteStream : null,
              mySdp : null,
              pc : null,
              dataChannel : null,
              dtmfSender : null,
              trickle : true,
              iceDone : false,
              sdpSent : false,
              volume : {
                value : null,
                timer : null
              },
              bitrate : {
                value : null,
                bsnow : null,
                bsbefore : null,
                tsnow : null,
                tsbefore : null,
                timer : null
              }
            },
            getId : function() { return handleId; },
            getPlugin : function() { return plugin; },
            getVolume : function() { return getVolume(handleId); },
            isAudioMuted : function() { return isMuted(handleId, false); },
            muteAudio : function() { return mute(handleId, false, true); },
            unmuteAudio : function() { return mute(handleId, false, false); },
            isVideoMuted : function() { return isMuted(handleId, true); },
            muteVideo : function() { return mute(handleId, true, true); },
            unmuteVideo : function() { return mute(handleId, true, false); },
            getBitrate : function() { return getBitrate(handleId); },
            send : function(callbacks) { sendMessage(handleId, callbacks); },
            data : function(callbacks) { sendData(handleId, callbacks); },
            dtmf : function(callbacks) { sendDtmf(handleId, callbacks); },
            consentDialog : callbacks.consentDialog,
            iceState : callbacks.iceState,
            mediaState : callbacks.mediaState,
            webrtcState : callbacks.webrtcState,
            slowLink : callbacks.slowLink,
            onmessage : callbacks.onmessage,
            createOffer : function(callbacks) { prepareWebrtc(handleId, callbacks); },
            createAnswer : function(callbacks) { prepareWebrtc(handleId, callbacks); },
            handleRemoteJsep : function(callbacks) { prepareWebrtcPeer(handleId, callbacks); },
            onlocalstream : callbacks.onlocalstream,
            onremotestream : callbacks.onremotestream,
            ondata : callbacks.ondata,
            ondataopen : callbacks.ondataopen,
            oncleanup : callbacks.oncleanup,
            ondetached : callbacks.ondetached,
            hangup : function(sendRequest) { cleanupWebrtc(handleId, sendRequest === true); },
            detach : function(callbacks) { destroyHandle(handleId, callbacks); }
          }
        pluginHandles[handleId] = pluginHandle;
        callbacks.success(pluginHandle);
      },
      error: function(XMLHttpRequest, textStatus, errorThrown) {
        Janus.error(textStatus + ": " + errorThrown); // FIXME
      },
      dataType: "json"
    });
  }

  // Private method to send a message
  function sendMessage(handleId, callbacks) {
    callbacks = callbacks || {};
    callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : jQuery.noop;
    callbacks.error = (typeof callbacks.error == "function") ? callbacks.error : jQuery.noop;
    if(!connected) {
      Janus.warn("Is the gateway down? (connected=false)");
      callbacks.error("Is the gateway down? (connected=false)");
      return;
    }
    var message = callbacks.message;
    var jsep = callbacks.jsep;
    var transaction = Janus.randomString(12);
    var request = { "janus": "message", "body": message, "transaction": transaction };
    if(token !== null && token !== undefined)
      request["token"] = token;
    if(apisecret !== null && apisecret !== undefined)
      request["apisecret"] = apisecret;
    if(jsep !== null && jsep !== undefined)
      request.jsep = jsep;
    Janus.debug("Sending message to plugin (handle=" + handleId + "):");
    Janus.debug(request);
    if(websockets) {
      request["session_id"] = sessionId;
      request["handle_id"] = handleId;
      transactions[transaction] = function(json) {
        Janus.debug("Message sent!");
        Janus.debug(json);
        if(json["janus"] === "success") {
          // We got a success, must have been a synchronous transaction
          var plugindata = json["plugindata"];
          if(plugindata === undefined || plugindata === null) {
            Janus.warn("Request succeeded, but missing plugindata...");
            callbacks.success();
            return;
          }
          Janus.log("Synchronous transaction successful (" + plugindata["plugin"] + ")");
          var data = plugindata["data"];
          Janus.debug(data);
          callbacks.success(data);
          return;
        } else if(json["janus"] !== "ack") {
          // Not a success and not an ack, must be an error
          if(json["error"] !== undefined && json["error"] !== null) {
            Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason); // FIXME
            callbacks.error(json["error"].code + " " + json["error"].reason);
          } else {
            Janus.error("Unknown error"); // FIXME
            callbacks.error("Unknown error");
          }
          return;
        }
        // If we got here, the plugin decided to handle the request asynchronously
        callbacks.success();
      };
      ws.send(JSON.stringify(request));
      return;
    }
    $.ajax({
      type: 'POST',
      url: server + "/" + sessionId + "/" + handleId,
      xhrFields: {
        withCredentials: withCredentials
      },
      cache: false,
      contentType: "application/json",
      data: JSON.stringify(request),
      success: function(json) {
        Janus.debug("Message sent!");
        Janus.debug(json);
        if(json["janus"] === "success") {
          // We got a success, must have been a synchronous transaction
          var plugindata = json["plugindata"];
          if(plugindata === undefined || plugindata === null) {
            Janus.warn("Request succeeded, but missing plugindata...");
            callbacks.success();
            return;
          }
          Janus.log("Synchronous transaction successful (" + plugindata["plugin"] + ")");
          var data = plugindata["data"];
          Janus.debug(data);
          callbacks.success(data);
          return;
        } else if(json["janus"] !== "ack") {
          // Not a success and not an ack, must be an error
          if(json["error"] !== undefined && json["error"] !== null) {
            Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason); // FIXME
            callbacks.error(json["error"].code + " " + json["error"].reason);
          } else {
            Janus.error("Unknown error"); // FIXME
            callbacks.error("Unknown error");
          }
          return;
        }
        // If we got here, the plugin decided to handle the request asynchronously
        callbacks.success();
      },
      error: function(XMLHttpRequest, textStatus, errorThrown) {
        Janus.error(textStatus + ": " + errorThrown); // FIXME
        callbacks.error(textStatus + ": " + errorThrown);
      },
      dataType: "json"
    });
  }

  // Private method to send a trickle candidate
  function sendTrickleCandidate(handleId, candidate) {
    if(!connected) {
      Janus.warn("Is the gateway down? (connected=false)");
      return;
    }
    var request = { "janus": "trickle", "candidate": candidate, "transaction": Janus.randomString(12) };
    if(token !== null && token !== undefined)
      request["token"] = token;
    if(apisecret !== null && apisecret !== undefined)
      request["apisecret"] = apisecret;
    Janus.vdebug("Sending trickle candidate (handle=" + handleId + "):");
    Janus.vdebug(request);
    if(websockets) {
      request["session_id"] = sessionId;
      request["handle_id"] = handleId;
      ws.send(JSON.stringify(request));
      return;
    }
    $.ajax({
      type: 'POST',
      url: server + "/" + sessionId + "/" + handleId,
      xhrFields: {
        withCredentials: withCredentials
      },
      cache: false,
      contentType: "application/json",
      data: JSON.stringify(request),
      success: function(json) {
        Janus.vdebug("Candidate sent!");
        Janus.vdebug(json);
        if(json["janus"] !== "ack") {
          Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason); // FIXME
          return;
        }
      },
      error: function(XMLHttpRequest, textStatus, errorThrown) {
        Janus.error(textStatus + ": " + errorThrown); // FIXME
      },
      dataType: "json"
    });
  }

  // Private method to send a data channel message
  function sendData(handleId, callbacks) {
    callbacks = callbacks || {};
    callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : jQuery.noop;
    callbacks.error = (typeof callbacks.error == "function") ? callbacks.error : jQuery.noop;
    var pluginHandle = pluginHandles[handleId];
    if(pluginHandle === null || pluginHandle === undefined ||
        pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
      Janus.warn("Invalid handle");
      callbacks.error("Invalid handle");
      return;
    }
    var config = pluginHandle.webrtcStuff;
    var text = callbacks.text;
    if(text === null || text === undefined) {
      Janus.warn("Invalid text");
      callbacks.error("Invalid text");
      return;
    }
    Janus.log("Sending string on data channel: " + text);
    config.dataChannel.send(text);
    callbacks.success();
  }

  // Private method to send a DTMF tone
  function sendDtmf(handleId, callbacks) {
    callbacks = callbacks || {};
    callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : jQuery.noop;
    callbacks.error = (typeof callbacks.error == "function") ? callbacks.error : jQuery.noop;
    var pluginHandle = pluginHandles[handleId];
    if(pluginHandle === null || pluginHandle === undefined ||
        pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
      Janus.warn("Invalid handle");
      callbacks.error("Invalid handle");
      return;
    }
    var config = pluginHandle.webrtcStuff;
    if(config.dtmfSender === null || config.dtmfSender === undefined) {
      // Create the DTMF sender, if possible
      if(config.myStream !== undefined && config.myStream !== null) {
        var tracks = config.myStream.getAudioTracks();
        if(tracks !== null && tracks !== undefined && tracks.length > 0) {
          var local_audio_track = tracks[0];
          config.dtmfSender = config.pc.createDTMFSender(local_audio_track);
          Janus.log("Created DTMF Sender");
          config.dtmfSender.ontonechange = function(tone) { Janus.debug("Sent DTMF tone: " + tone.tone); };
        }
      }
      if(config.dtmfSender === null || config.dtmfSender === undefined) {
        Janus.warn("Invalid DTMF configuration");
        callbacks.error("Invalid DTMF configuration");
        return;
      }
    }
    var dtmf = callbacks.dtmf;
    if(dtmf === null || dtmf === undefined) {
      Janus.warn("Invalid DTMF parameters");
      callbacks.error("Invalid DTMF parameters");
      return;
    }
    var tones = dtmf.tones;
    if(tones === null || tones === undefined) {
      Janus.warn("Invalid DTMF string");
      callbacks.error("Invalid DTMF string");
      return;
    }
    var duration = dtmf.duration;
    if(duration === null || duration === undefined)
      duration = 500; // We choose 500ms as the default duration for a tone
    var gap = dtmf.gap;
    if(gap === null || gap === undefined)
      gap = 50; // We choose 50ms as the default gap between tones
    Janus.debug("Sending DTMF string " + tones + " (duration " + duration + "ms, gap " + gap + "ms)");
    config.dtmfSender.insertDTMF(tones, duration, gap);
  }

  // Private method to destroy a plugin handle
  function destroyHandle(handleId, callbacks) {
    callbacks = callbacks || {};
    callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : jQuery.noop;
    callbacks.error = (typeof callbacks.error == "function") ? callbacks.error : jQuery.noop;
    Janus.warn(callbacks);
    var asyncRequest = true;
    if(callbacks.asyncRequest !== undefined && callbacks.asyncRequest !== null)
      asyncRequest = (callbacks.asyncRequest === true);
    Janus.log("Destroying handle " + handleId + " (async=" + asyncRequest + ")");
    cleanupWebrtc(handleId);
    if (pluginHandles[handleId].detached) {
      // Plugin was already detached by Janus, calling detach again will return a handle not found error, so just exit here
      delete pluginHandles[handleId];
      callbacks.success();
      return;
    }
    if(!connected) {
      Janus.warn("Is the gateway down? (connected=false)");
      callbacks.error("Is the gateway down? (connected=false)");
      return;
    }
    var request = { "janus": "detach", "transaction": Janus.randomString(12) };
    if(token !== null && token !== undefined)
      request["token"] = token;
    if(apisecret !== null && apisecret !== undefined)
      request["apisecret"] = apisecret;
    if(websockets) {
      request["session_id"] = sessionId;
      request["handle_id"] = handleId;
      ws.send(JSON.stringify(request));
      delete pluginHandles[handleId];
      callbacks.success();
      return;
    }
    $.ajax({
      type: 'POST',
      url: server + "/" + sessionId + "/" + handleId,
      async: asyncRequest,  // Sometimes we need false here, or destroying in onbeforeunload won't work
      xhrFields: {
        withCredentials: withCredentials
      },
      cache: false,
      contentType: "application/json",
      data: JSON.stringify(request),
      success: function(json) {
        Janus.log("Destroyed handle:");
        Janus.debug(json);
        if(json["janus"] !== "success") {
          Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason); // FIXME
        }
        delete pluginHandles[handleId];
        callbacks.success();
      },
      error: function(XMLHttpRequest, textStatus, errorThrown) {
        Janus.error(textStatus + ": " + errorThrown); // FIXME
        // We cleanup anyway
        delete pluginHandles[handleId];
        callbacks.success();
      },
      dataType: "json"
    });
  }

  // WebRTC stuff
  function streamsDone(handleId, jsep, media, callbacks, stream) {
    var pluginHandle = pluginHandles[handleId];
    if(pluginHandle === null || pluginHandle === undefined ||
        pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
      Janus.warn("Invalid handle");
      callbacks.error("Invalid handle");
      return;
    }
    var config = pluginHandle.webrtcStuff;
    Janus.debug("streamsDone:", stream);
    config.myStream = stream;
    var pc_config = {"iceServers": iceServers, "iceTransportPolicy": iceTransportPolicy};
    //~ var pc_constraints = {'mandatory': {'MozDontOfferDataChannel':true}};
    var pc_constraints = {
      "optional": [{"DtlsSrtpKeyAgreement": true}]
    };
    if(ipv6Support === true) {
      // FIXME This is only supported in Chrome right now
      // For support in Firefox track this: https://bugzilla.mozilla.org/show_bug.cgi?id=797262
      pc_constraints.optional.push({"googIPv6":true});
    }
    if(adapter.browserDetails.browser === "edge") {
      // This is Edge, enable BUNDLE explicitly
      pc_config.bundlePolicy = "max-bundle";
    }
    Janus.log("Creating PeerConnection");
    Janus.debug(pc_constraints);
    config.pc = new RTCPeerConnection(pc_config, pc_constraints);
    Janus.debug(config.pc);
    if(config.pc.getStats) {  // FIXME
      config.volume.value = 0;
      config.bitrate.value = "0 kbits/sec";
    }
    Janus.log("Preparing local SDP and gathering candidates (trickle=" + config.trickle + ")");
    config.pc.oniceconnectionstatechange = function(e) {
      if(config.pc)
        pluginHandle.iceState(config.pc.iceConnectionState);
    };
    config.pc.onicecandidate = function(event) {
      if (event.candidate == null ||
          (adapter.browserDetails.browser === 'edge' && event.candidate.candidate.indexOf('endOfCandidates') > 0)) {
        Janus.log("End of candidates.");
        config.iceDone = true;
        if(config.trickle === true) {
          // Notify end of candidates
          sendTrickleCandidate(handleId, {"completed": true});
        } else {
          // No trickle, time to send the complete SDP (including all candidates)
          sendSDP(handleId, callbacks);
        }
      } else {
        // JSON.stringify doesn't work on some WebRTC objects anymore
        // See https://code.google.com/p/chromium/issues/detail?id=467366
        var candidate = {
          "candidate": event.candidate.candidate,
          "sdpMid": event.candidate.sdpMid,
          "sdpMLineIndex": event.candidate.sdpMLineIndex
        };
        if(config.trickle === true) {
          // Send candidate
          sendTrickleCandidate(handleId, candidate);
        }
      }
    };
    if(stream !== null && stream !== undefined) {
      Janus.log('Adding local stream');
      config.pc.addStream(stream);
      pluginHandle.onlocalstream(stream);
    }
    config.pc.onaddstream = function(remoteStream) {
      Janus.log("Handling Remote Stream");
      Janus.debug(remoteStream);
      config.remoteStream = remoteStream;
      pluginHandle.onremotestream(remoteStream.stream);
    };
    // Any data channel to create?
    if(isDataEnabled(media)) {
      Janus.log("Creating data channel");
      var onDataChannelMessage = function(event) {
        Janus.log('Received message on data channel: ' + event.data);
        pluginHandle.ondata(event.data);  // FIXME
      }
      var onDataChannelStateChange = function() {
        var dcState = config.dataChannel !== null ? config.dataChannel.readyState : "null";
        Janus.log('State change on data channel: ' + dcState);
        if(dcState === 'open') {
          pluginHandle.ondataopen();  // FIXME
        }
      }
      var onDataChannelError = function(error) {
        Janus.error('Got error on data channel:', error);
        // TODO
      }
      // Until we implement the proxying of open requests within the Janus core, we open a channel ourselves whatever the case
      config.dataChannel = config.pc.createDataChannel("JanusDataChannel", {ordered:false});  // FIXME Add options (ordered, maxRetransmits, etc.)
      config.dataChannel.onmessage = onDataChannelMessage;
      config.dataChannel.onopen = onDataChannelStateChange;
      config.dataChannel.onclose = onDataChannelStateChange;
      config.dataChannel.onerror = onDataChannelError;
    }
    // Create offer/answer now
    if(jsep === null || jsep === undefined) {
      createOffer(handleId, media, callbacks);
    } else {
      if(adapter.browserDetails.browser === "edge") {
        // This is Edge, add an a=end-of-candidates at the end
        jsep.sdp += "a=end-of-candidates\r\n";
      }
      config.pc.setRemoteDescription(
          new RTCSessionDescription(jsep),
          function() {
            Janus.log("Remote description accepted!");
            createAnswer(handleId, media, callbacks);
          }, callbacks.error);
    }
  }

  function prepareWebrtc(handleId, callbacks) {
    callbacks = callbacks || {};
    callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : jQuery.noop;
    callbacks.error = (typeof callbacks.error == "function") ? callbacks.error : webrtcError;
    var jsep = callbacks.jsep;
    var media = callbacks.media;
    var pluginHandle = pluginHandles[handleId];
    if(pluginHandle === null || pluginHandle === undefined ||
        pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
      Janus.warn("Invalid handle");
      callbacks.error("Invalid handle");
      return;
    }
    var config = pluginHandle.webrtcStuff;
    // Are we updating a session?
    if(config.pc !== undefined && config.pc !== null) {
      Janus.log("Updating existing media session");
      // Create offer/answer now
      if(jsep === null || jsep === undefined) {
        createOffer(handleId, media, callbacks);
      } else {
        if(adapter.browserDetails.browser === "edge") {
          // This is Edge, add an a=end-of-candidates at the end
          jsep.sdp += "a=end-of-candidates\r\n";
        }
        config.pc.setRemoteDescription(
            new RTCSessionDescription(jsep),
            function() {
              Janus.log("Remote description accepted!");
              createAnswer(handleId, media, callbacks);
            }, callbacks.error);
      }
      return;
    }
    // Was a MediaStream object passed, or do we need to take care of that?
    if(callbacks.stream !== null && callbacks.stream !== undefined) {
      var stream = callbacks.stream;
      Janus.log("MediaStream provided by the application");
      Janus.debug(stream);
      // Skip the getUserMedia part
      config.streamExternal = true;
      streamsDone(handleId, jsep, media, callbacks, stream);
      return;
    }
    config.trickle = isTrickleEnabled(callbacks.trickle);
    if(isAudioSendEnabled(media) || isVideoSendEnabled(media)) {
      var constraints = { mandatory: {}, optional: []};
      pluginHandle.consentDialog(true);
      var audioSupport = isAudioSendEnabled(media);
      if(audioSupport === true && media != undefined && media != null) {
        if(typeof media.audio === 'object') {
          audioSupport = media.audio;
        }
      }
      var videoSupport = isVideoSendEnabled(media);
      if(videoSupport === true && media != undefined && media != null) {
        if(media.video && media.video != 'screen' && media.video != 'window') {
          var width = 0;
          var height = 0, maxHeight = 0;
          if(media.video === 'lowres') {
            // Small resolution, 4:3
            height = 240;
            maxHeight = 240;
            width = 320;
          } else if(media.video === 'lowres-16:9') {
            // Small resolution, 16:9
            height = 180;
            maxHeight = 180;
            width = 320;
          } else if(media.video === 'hires' || media.video === 'hires-16:9' ) {
            // High resolution is only 16:9
            height = 720;
            maxHeight = 720;
            width = 1280;
            if(navigator.mozGetUserMedia) {
              var firefoxVer = parseInt(window.navigator.userAgent.match(/Firefox\/(.*)/)[1], 10);
              if(firefoxVer < 38) {
                // Unless this is and old Firefox, which doesn't support it
                Janus.warn(media.video + " unsupported, falling back to stdres (old Firefox)");
                height = 480;
                maxHeight = 480;
                width  = 640;
              }
            }
          } else if(media.video === 'stdres') {
            // Normal resolution, 4:3
            height = 480;
            maxHeight = 480;
            width  = 640;
          } else if(media.video === 'stdres-16:9') {
            // Normal resolution, 16:9
            height = 360;
            maxHeight = 360;
            width = 640;
          } else {
            Janus.log("Default video setting (" + media.video + ") is stdres 4:3");
            height = 480;
            maxHeight = 480;
            width = 640;
          }
          Janus.log("Adding media constraint " + media.video);
          if(navigator.mozGetUserMedia) {
            var firefoxVer = parseInt(window.navigator.userAgent.match(/Firefox\/(.*)/)[1], 10);
            if(firefoxVer < 38) {
              videoSupport = {
                'require': ['height', 'width'],
                'height': {'max': maxHeight, 'min': height},
                'width':  {'max': width,  'min': width}
              };
            } else {
              // http://stackoverflow.com/questions/28282385/webrtc-firefox-constraints/28911694#28911694
              // https://github.com/meetecho/janus-gateway/pull/246
              videoSupport = {
                'height': {'ideal': height},
                'width':  {'ideal': width}
              };
            }
          } else {
            videoSupport = {
                'mandatory': {
                    'maxHeight': maxHeight,
                    'minHeight': height,
                    'maxWidth':  width,
                    'minWidth':  width
                },
                'optional': []
            };
          }
          if(typeof media.video === 'object') {
            videoSupport = media.video;
          }
          Janus.debug(videoSupport);
        } else if(media.video === 'screen' || media.video === 'window') {
          if (!media.screenshareFrameRate) {
            media.screenshareFrameRate = 3;
          }
          // Not a webcam, but screen capture
          if(window.location.protocol !== 'https:') {
            // Screen sharing mandates HTTPS
            Janus.warn("Screen sharing only works on HTTPS, try the https:// version of this page");
            pluginHandle.consentDialog(false);
            callbacks.error("Screen sharing only works on HTTPS, try the https:// version of this page");
            return;
          }
          // We're going to try and use the extension for Chrome 34+, the old approach
          // for older versions of Chrome, or the experimental support in Firefox 33+
          var cache = {};
          function callbackUserMedia (error, stream) {
            pluginHandle.consentDialog(false);
            if(error) {
              callbacks.error({code: error.code, name: error.name, message: error.message});
            } else {
              streamsDone(handleId, jsep, media, callbacks, stream);
            }
          };
          function getScreenMedia(constraints, gsmCallback) {
            Janus.log("Adding media constraint (screen capture)");
            Janus.debug(constraints);
            navigator.mediaDevices.getUserMedia(constraints)
              .then(function(stream) { gsmCallback(null, stream); })
              .catch(function(error) { pluginHandle.consentDialog(false); gsmCallback(error); });
          };
          if(adapter.browserDetails.browser === 'chrome') {
            var chromever = adapter.browserDetails.version;
            var maxver = 33;
            if(window.navigator.userAgent.match('Linux'))
              maxver = 35;  // "known" crash in chrome 34 and 35 on linux
            if(chromever >= 26 && chromever <= maxver) {
              // Chrome 26->33 requires some awkward chrome://flags manipulation
              constraints = {
                video: {
                  mandatory: {
                    googLeakyBucket: true,
                    maxWidth: window.screen.width,
                    maxHeight: window.screen.height,
                    minFrameRate: media.screenshareFrameRate,
                    maxFrameRate: media.screenshareFrameRate,
                    chromeMediaSource: 'screen'
                  }
                },
                audio: isAudioSendEnabled(media)
              };
              getScreenMedia(constraints, callbackUserMedia);
            } else {
              // Chrome 34+ requires an extension
              var pending = window.setTimeout(
                function () {
                  error = new Error('NavigatorUserMediaError');
                  error.name = 'The required Chrome extension is not installed: click <a href="#">here</a> to install it. (NOTE: this will need you to refresh the page)';
                  pluginHandle.consentDialog(false);
                  return callbacks.error(error);
                }, 1000);
              cache[pending] = [callbackUserMedia, null];
              window.postMessage({ type: 'janusGetScreen', id: pending }, '*');
            }
          } else if (window.navigator.userAgent.match('Firefox')) {
            var ffver = parseInt(window.navigator.userAgent.match(/Firefox\/(.*)/)[1], 10);
            if(ffver >= 33) {
              // Firefox 33+ has experimental support for screen sharing
              constraints = {
                video: {
                  mozMediaSource: media.video,
                  mediaSource: media.video
                },
                audio: isAudioSendEnabled(media)
              };
              getScreenMedia(constraints, function (err, stream) {
                callbackUserMedia(err, stream);
                // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1045810
                if (!err) {
                  var lastTime = stream.currentTime;
                  var polly = window.setInterval(function () {
                    if(!stream)
                      window.clearInterval(polly);
                    if(stream.currentTime == lastTime) {
                      window.clearInterval(polly);
                      if(stream.onended) {
                        stream.onended();
                      }
                    }
                    lastTime = stream.currentTime;
                  }, 500);
                }
              });
            } else {
              var error = new Error('NavigatorUserMediaError');
              error.name = 'Your version of Firefox does not support screen sharing, please install Firefox 33 (or more recent versions)';
              pluginHandle.consentDialog(false);
              callbacks.error(error);
              return;
            }
          }

          // Wait for events from the Chrome Extension
          window.addEventListener('message', function (event) {
            if(event.origin != window.location.origin)
              return;
            if(event.data.type == 'janusGotScreen' && cache[event.data.id]) {
              var data = cache[event.data.id];
              var callback = data[0];
              delete cache[event.data.id];

              if (event.data.sourceId === '') {
                // user canceled
                var error = new Error('NavigatorUserMediaError');
                error.name = 'You cancelled the request for permission, giving up...';
                pluginHandle.consentDialog(false);
                callbacks.error(error);
              } else {
                constraints = {
                  audio: isAudioSendEnabled(media),
                  video: {
                    mandatory: {
                      chromeMediaSource: 'desktop',
                      maxWidth: window.screen.width,
                      maxHeight: window.screen.height,
                      minFrameRate: media.screenshareFrameRate,
                      maxFrameRate: media.screenshareFrameRate,
                    },
                    optional: [
                      {googLeakyBucket: true},
                      {googTemporalLayeredScreencast: true}
                    ]
                  }
                };
                constraints.video.mandatory.chromeMediaSourceId = event.data.sourceId;
                getScreenMedia(constraints, callback);
              }
            } else if (event.data.type == 'janusGetScreenPending') {
              window.clearTimeout(event.data.id);
            }
          });
          return;
        }
      }
      // If we got here, we're not screensharing
      if(media === null || media === undefined || media.video !== 'screen') {
        // Check whether all media sources are actually available or not
        navigator.mediaDevices.enumerateDevices().then(function(devices) {
          var audioExist = devices.some(function(device) {
            return device.kind === 'audioinput';
          }),
          videoExist = devices.some(function(device) {
            return device.kind === 'videoinput';
          });

          // Check whether a missing device is really a problem
          var audioSend = isAudioSendEnabled(media);
          var videoSend = isVideoSendEnabled(media);
          var needAudioDevice = isAudioSendRequired(media);
          var needVideoDevice = isVideoSendRequired(media);
          if(audioSend || videoSend || needAudioDevice || needVideoDevice) {
            // We need to send either audio or video
            var haveAudioDevice = audioSend ? audioExist : false;
            var haveVideoDevice = videoSend ? videoExist : false;
            if(!haveAudioDevice && !haveVideoDevice) {
              // FIXME Should we really give up, or just assume recvonly for both?
              pluginHandle.consentDialog(false);
              callbacks.error('No capture device found');
              return false;
            } else if(!haveAudioDevice && needAudioDevice) {
              pluginHandle.consentDialog(false);
              callbacks.error('Audio capture is required, but no capture device found');
              return false;
            } else if(!haveVideoDevice && needVideoDevice) {
              pluginHandle.consentDialog(false);
              callbacks.error('Video capture is required, but no capture device found');
              return false;
            }
          }

          navigator.mediaDevices.getUserMedia({
            audio: audioExist ? audioSupport : false,
            video: videoExist ? videoSupport : false
          })
          .then(function(stream) { pluginHandle.consentDialog(false); streamsDone(handleId, jsep, media, callbacks, stream); })
          .catch(function(error) { pluginHandle.consentDialog(false); callbacks.error({code: error.code, name: error.name, message: error.message}); });
        })
        .catch(function(error) {
          pluginHandle.consentDialog(false);
          callbacks.error('enumerateDevices error', error);
        });
      }
    } else {
      // No need to do a getUserMedia, create offer/answer right away
      streamsDone(handleId, jsep, media, callbacks);
    }
  }

  function prepareWebrtcPeer(handleId, callbacks) {
    callbacks = callbacks || {};
    callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : jQuery.noop;
    callbacks.error = (typeof callbacks.error == "function") ? callbacks.error : webrtcError;
    var jsep = callbacks.jsep;
    var pluginHandle = pluginHandles[handleId];
    if(pluginHandle === null || pluginHandle === undefined ||
        pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
      Janus.warn("Invalid handle");
      callbacks.error("Invalid handle");
      return;
    }
    var config = pluginHandle.webrtcStuff;
    if(jsep !== undefined && jsep !== null) {
      if(config.pc === null) {
        Janus.warn("Wait, no PeerConnection?? if this is an answer, use createAnswer and not handleRemoteJsep");
        callbacks.error("No PeerConnection: if this is an answer, use createAnswer and not handleRemoteJsep");
        return;
      }
      if(adapter.browserDetails.browser === "edge") {
        // This is Edge, add an a=end-of-candidates at the end
        jsep.sdp += "a=end-of-candidates\r\n";
      }
      config.pc.setRemoteDescription(
          new RTCSessionDescription(jsep),
          function() {
            Janus.log("Remote description accepted!");
            callbacks.success();
          }, callbacks.error);
    } else {
      callbacks.error("Invalid JSEP");
    }
  }

  function createOffer(handleId, media, callbacks) {
    callbacks = callbacks || {};
    callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : jQuery.noop;
    callbacks.error = (typeof callbacks.error == "function") ? callbacks.error : jQuery.noop;
    var pluginHandle = pluginHandles[handleId];
    if(pluginHandle === null || pluginHandle === undefined ||
        pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
      Janus.warn("Invalid handle");
      callbacks.error("Invalid handle");
      return;
    }
    var config = pluginHandle.webrtcStuff;
    Janus.log("Creating offer (iceDone=" + config.iceDone + ")");
    // https://code.google.com/p/webrtc/issues/detail?id=3508
    var mediaConstraints = null;
    if(adapter.browserDetails.browser == "firefox" || adapter.browserDetails.browser == "edge") {
      mediaConstraints = {
        'offerToReceiveAudio':isAudioRecvEnabled(media),
        'offerToReceiveVideo':isVideoRecvEnabled(media)
      };
    } else {
      mediaConstraints = {
        'mandatory': {
          'OfferToReceiveAudio':isAudioRecvEnabled(media),
          'OfferToReceiveVideo':isVideoRecvEnabled(media)
        }
      };
    }
    Janus.debug(mediaConstraints);
    config.pc.createOffer(
      function(offer) {
        Janus.debug(offer);
        if(config.mySdp === null || config.mySdp === undefined) {
          Janus.log("Setting local description");
          config.mySdp = offer.sdp;
          config.pc.setLocalDescription(offer);
        }
        if(!config.iceDone && !config.trickle) {
          // Don't do anything until we have all candidates
          Janus.log("Waiting for all candidates...");
          return;
        }
        if(config.sdpSent) {
          Janus.log("Offer already sent, not sending it again");
          return;
        }
        Janus.log("Offer ready");
        Janus.debug(callbacks);
        config.sdpSent = true;
        // JSON.stringify doesn't work on some WebRTC objects anymore
        // See https://code.google.com/p/chromium/issues/detail?id=467366
        var jsep = {
          "type": offer.type,
          "sdp": offer.sdp
        };
        callbacks.success(jsep);
      }, callbacks.error, mediaConstraints);
  }

  function createAnswer(handleId, media, callbacks) {
    callbacks = callbacks || {};
    callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : jQuery.noop;
    callbacks.error = (typeof callbacks.error == "function") ? callbacks.error : jQuery.noop;
    var pluginHandle = pluginHandles[handleId];
    if(pluginHandle === null || pluginHandle === undefined ||
        pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
      Janus.warn("Invalid handle");
      callbacks.error("Invalid handle");
      return;
    }
    var config = pluginHandle.webrtcStuff;
    Janus.log("Creating answer (iceDone=" + config.iceDone + ")");
    var mediaConstraints = null;
    if(adapter.browserDetails.browser == "firefox" || adapter.browserDetails.browser == "edge") {
      mediaConstraints = {
        'offerToReceiveAudio':isAudioRecvEnabled(media),
        'offerToReceiveVideo':isVideoRecvEnabled(media)
      };
    } else {
      mediaConstraints = {
        'mandatory': {
          'OfferToReceiveAudio':isAudioRecvEnabled(media),
          'OfferToReceiveVideo':isVideoRecvEnabled(media)
        }
      };
    }
    Janus.debug(mediaConstraints);
    config.pc.createAnswer(
      function(answer) {
        Janus.debug(answer);
        if(config.mySdp === null || config.mySdp === undefined) {
          Janus.log("Setting local description");
          config.mySdp = answer.sdp;
          config.pc.setLocalDescription(answer);
        }
        if(!config.iceDone && !config.trickle) {
          // Don't do anything until we have all candidates
          Janus.log("Waiting for all candidates...");
          return;
        }
        if(config.sdpSent) {  // FIXME badly
          Janus.log("Answer already sent, not sending it again");
          return;
        }
        config.sdpSent = true;
        // JSON.stringify doesn't work on some WebRTC objects anymore
        // See https://code.google.com/p/chromium/issues/detail?id=467366
        var jsep = {
          "type": answer.type,
          "sdp": answer.sdp
        };
        callbacks.success(jsep);
      }, callbacks.error, mediaConstraints);
  }

  function sendSDP(handleId, callbacks) {
    callbacks = callbacks || {};
    callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : jQuery.noop;
    callbacks.error = (typeof callbacks.error == "function") ? callbacks.error : jQuery.noop;
    var pluginHandle = pluginHandles[handleId];
    if(pluginHandle === null || pluginHandle === undefined ||
        pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
      Janus.warn("Invalid handle, not sending anything");
      return;
    }
    var config = pluginHandle.webrtcStuff;
    Janus.log("Sending offer/answer SDP...");
    if(config.mySdp === null || config.mySdp === undefined) {
      Janus.warn("Local SDP instance is invalid, not sending anything...");
      return;
    }
    config.mySdp = {
      "type": config.pc.localDescription.type,
      "sdp": config.pc.localDescription.sdp
    };
    if(config.sdpSent) {
      Janus.log("Offer/Answer SDP already sent, not sending it again");
      return;
    }
    if(config.trickle === false)
      config.mySdp["trickle"] = false;
    Janus.debug(callbacks);
    config.sdpSent = true;
    callbacks.success(config.mySdp);
  }

  function getVolume(handleId) {
    var pluginHandle = pluginHandles[handleId];
    if(pluginHandle === null || pluginHandle === undefined ||
        pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
      Janus.warn("Invalid handle");
      return 0;
    }
    var config = pluginHandle.webrtcStuff;
    // Start getting the volume, if getStats is supported
    if(config.pc.getStats && adapter.browserDetails.browser == "chrome") {  // FIXME
      if(config.remoteStream === null || config.remoteStream === undefined) {
        Janus.warn("Remote stream unavailable");
        return 0;
      }
      // http://webrtc.googlecode.com/svn/trunk/samples/js/demos/html/constraints-and-stats.html
      if(config.volume.timer === null || config.volume.timer === undefined) {
        Janus.log("Starting volume monitor");
        config.volume.timer = setInterval(function() {
          config.pc.getStats(function(stats) {
            var results = stats.result();
            for(var i=0; i<results.length; i++) {
              var res = results[i];
              if(res.type == 'ssrc' && res.stat('audioOutputLevel')) {
                config.volume.value = res.stat('audioOutputLevel');
              }
            }
          });
        }, 200);
        return 0; // We don't have a volume to return yet
      }
      return config.volume.value;
    } else {
      Janus.log("Getting the remote volume unsupported by browser");
      return 0;
    }
  }

  function isMuted(handleId, video) {
    var pluginHandle = pluginHandles[handleId];
    if(pluginHandle === null || pluginHandle === undefined ||
        pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
      Janus.warn("Invalid handle");
      return true;
    }
    var config = pluginHandle.webrtcStuff;
    if(config.pc === null || config.pc === undefined) {
      Janus.warn("Invalid PeerConnection");
      return true;
    }
    if(config.myStream === undefined || config.myStream === null) {
      Janus.warn("Invalid local MediaStream");
      return true;
    }
    if(video) {
      // Check video track
      if(config.myStream.getVideoTracks() === null
          || config.myStream.getVideoTracks() === undefined
          || config.myStream.getVideoTracks().length === 0) {
        Janus.warn("No video track");
        return true;
      }
      return !config.myStream.getVideoTracks()[0].enabled;
    } else {
      // Check audio track
      if(config.myStream.getAudioTracks() === null
          || config.myStream.getAudioTracks() === undefined
          || config.myStream.getAudioTracks().length === 0) {
        Janus.warn("No audio track");
        return true;
      }
      return !config.myStream.getAudioTracks()[0].enabled;
    }
  }

  function mute(handleId, video, mute) {
    var pluginHandle = pluginHandles[handleId];
    if(pluginHandle === null || pluginHandle === undefined ||
        pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
      Janus.warn("Invalid handle");
      return false;
    }
    var config = pluginHandle.webrtcStuff;
    if(config.pc === null || config.pc === undefined) {
      Janus.warn("Invalid PeerConnection");
      return false;
    }
    if(config.myStream === undefined || config.myStream === null) {
      Janus.warn("Invalid local MediaStream");
      return false;
    }
    if(video) {
      // Mute/unmute video track
      if(config.myStream.getVideoTracks() === null
          || config.myStream.getVideoTracks() === undefined
          || config.myStream.getVideoTracks().length === 0) {
        Janus.warn("No video track");
        return false;
      }
      config.myStream.getVideoTracks()[0].enabled = mute ? false : true;
      return true;
    } else {
      // Mute/unmute audio track
      if(config.myStream.getAudioTracks() === null
          || config.myStream.getAudioTracks() === undefined
          || config.myStream.getAudioTracks().length === 0) {
        Janus.warn("No audio track");
        return false;
      }
      config.myStream.getAudioTracks()[0].enabled = mute ? false : true;
      return true;
    }
  }

  function getBitrate(handleId) {
    var pluginHandle = pluginHandles[handleId];
    if(pluginHandle === null || pluginHandle === undefined ||
        pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
      Janus.warn("Invalid handle");
      return "Invalid handle";
    }
    var config = pluginHandle.webrtcStuff;
    if(config.pc === null || config.pc === undefined)
      return "Invalid PeerConnection";
    // Start getting the bitrate, if getStats is supported
    if(config.pc.getStats && adapter.browserDetails.browser == "chrome") {
      // Do it the Chrome way
      if(config.remoteStream === null || config.remoteStream === undefined) {
        Janus.warn("Remote stream unavailable");
        return "Remote stream unavailable";
      }
      // http://webrtc.googlecode.com/svn/trunk/samples/js/demos/html/constraints-and-stats.html
      if(config.bitrate.timer === null || config.bitrate.timer === undefined) {
        Janus.log("Starting bitrate timer (Chrome)");
        config.bitrate.timer = setInterval(function() {
          config.pc.getStats(function(stats) {
            var results = stats.result();
            for(var i=0; i<results.length; i++) {
              var res = results[i];
              if(res.type == 'ssrc' && res.stat('googFrameHeightReceived')) {
                config.bitrate.bsnow = res.stat('bytesReceived');
                config.bitrate.tsnow = res.timestamp;
                if(config.bitrate.bsbefore === null || config.bitrate.tsbefore === null) {
                  // Skip this round
                  config.bitrate.bsbefore = config.bitrate.bsnow;
                  config.bitrate.tsbefore = config.bitrate.tsnow;
                } else {
                  // Calculate bitrate
                  var bitRate = Math.round((config.bitrate.bsnow - config.bitrate.bsbefore) * 8 / (config.bitrate.tsnow - config.bitrate.tsbefore));
                  config.bitrate.value = bitRate + ' kbits/sec';
                  //~ Janus.log("Estimated bitrate is " + config.bitrate.value);
                  config.bitrate.bsbefore = config.bitrate.bsnow;
                  config.bitrate.tsbefore = config.bitrate.tsnow;
                }
              }
            }
          });
        }, 1000);
        return "0 kbits/sec"; // We don't have a bitrate value yet
      }
      return config.bitrate.value;
    } else if(config.pc.getStats && adapter.browserDetails.browser == "firefox") {
      // Do it the Firefox way
      if(config.remoteStream === null || config.remoteStream === undefined
          || config.remoteStream.stream === null || config.remoteStream.stream === undefined) {
        Janus.warn("Remote stream unavailable");
        return "Remote stream unavailable";
      }
      var videoTracks = config.remoteStream.stream.getVideoTracks();
      if(videoTracks === null || videoTracks === undefined || videoTracks.length < 1) {
        Janus.warn("No video track");
        return "No video track";
      }
      // https://github.com/muaz-khan/getStats/blob/master/getStats.js
      if(config.bitrate.timer === null || config.bitrate.timer === undefined) {
        Janus.log("Starting bitrate timer (Firefox)");
        config.bitrate.timer = setInterval(function() {
          // We need a helper callback
          var cb = function(res) {
            if(res === null || res === undefined ||
                res.inbound_rtp_video_1 == null || res.inbound_rtp_video_1 == null) {
              config.bitrate.value = "Missing inbound_rtp_video_1";
              return;
            }
            config.bitrate.bsnow = res.inbound_rtp_video_1.bytesReceived;
            config.bitrate.tsnow = res.inbound_rtp_video_1.timestamp;
            if(config.bitrate.bsbefore === null || config.bitrate.tsbefore === null) {
              // Skip this round
              config.bitrate.bsbefore = config.bitrate.bsnow;
              config.bitrate.tsbefore = config.bitrate.tsnow;
            } else {
              // Calculate bitrate
              var bitRate = Math.round((config.bitrate.bsnow - config.bitrate.bsbefore) * 8 / (config.bitrate.tsnow - config.bitrate.tsbefore));
              config.bitrate.value = bitRate + ' kbits/sec';
              config.bitrate.bsbefore = config.bitrate.bsnow;
              config.bitrate.tsbefore = config.bitrate.tsnow;
            }
          };
          // Actually get the stats
          config.pc.getStats(videoTracks[0], function(stats) {
            cb(stats);
          }, cb);
        }, 1000);
        return "0 kbits/sec"; // We don't have a bitrate value yet
      }
      return config.bitrate.value;
    } else {
      Janus.warn("Getting the video bitrate unsupported by browser");
      return "Feature unsupported by browser";
    }
  }

  function webrtcError(error) {
    Janus.error("WebRTC error:", error);
  }

  function cleanupWebrtc(handleId, hangupRequest) {
    Janus.log("Cleaning WebRTC stuff");
    var pluginHandle = pluginHandles[handleId];
    if(pluginHandle === null || pluginHandle === undefined) {
      // Nothing to clean
      return;
    }
    var config = pluginHandle.webrtcStuff;
    if(config !== null && config !== undefined) {
      if(hangupRequest === true) {
        // Send a hangup request (we don't really care about the response)
        var request = { "janus": "hangup", "transaction": Janus.randomString(12) };
        if(token !== null && token !== undefined)
          request["token"] = token;
        if(apisecret !== null && apisecret !== undefined)
          request["apisecret"] = apisecret;
        Janus.debug("Sending hangup request (handle=" + handleId + "):");
        Janus.debug(request);
        if(websockets) {
          request["session_id"] = sessionId;
          request["handle_id"] = handleId;
          ws.send(JSON.stringify(request));
        } else {
          $.ajax({
            type: 'POST',
            url: server + "/" + sessionId + "/" + handleId,
            xhrFields: {
              withCredentials: withCredentials
            },
            cache: false,
            contentType: "application/json",
            data: JSON.stringify(request),
            dataType: "json"
          });
        }
      }
      // Cleanup stack
      config.remoteStream = null;
      if(config.volume.timer)
        clearInterval(config.volume.timer);
      config.volume.value = null;
      if(config.bitrate.timer)
        clearInterval(config.bitrate.timer);
      config.bitrate.timer = null;
      config.bitrate.bsnow = null;
      config.bitrate.bsbefore = null;
      config.bitrate.tsnow = null;
      config.bitrate.tsbefore = null;
      config.bitrate.value = null;
      try {
        // Try a MediaStream.stop() first
        if(!config.streamExternal && config.myStream !== null && config.myStream !== undefined) {
          Janus.log("Stopping local stream");
          config.myStream.stop();
        }
      } catch(e) {
        // Do nothing if this fails
      }
      try {
        // Try a MediaStreamTrack.stop() for each track as well
        if(!config.streamExternal && config.myStream !== null && config.myStream !== undefined) {
          Janus.log("Stopping local stream tracks");
          var tracks = config.myStream.getTracks();
          for(var i in tracks) {
            var mst = tracks[i];
            Janus.log(mst);
            if(mst !== null && mst !== undefined)
              mst.stop();
          }
        }
      } catch(e) {
        // Do nothing if this fails
      }
      config.streamExternal = false;
      config.myStream = null;
      // Close PeerConnection
      try {
        config.pc.close();
      } catch(e) {
        // Do nothing
      }
      config.pc = null;
      config.mySdp = null;
      config.iceDone = false;
      config.sdpSent = false;
      config.dataChannel = null;
      config.dtmfSender = null;
    }
    pluginHandle.oncleanup();
  }

  // Helper methods to parse a media object
  function isAudioSendEnabled(media) {
    Janus.debug("isAudioSendEnabled:", media);
    if(media === undefined || media === null)
      return true;  // Default
    if(media.audio === false)
      return false; // Generic audio has precedence
    if(media.audioSend === undefined || media.audioSend === null)
      return true;  // Default
    return (media.audioSend === true);
  }

  function isAudioSendRequired(media) {
    Janus.debug("isAudioSendRequired:", media);
    if(media === undefined || media === null)
      return false; // Default
    if(media.audio === false || media.audioSend === false)
      return false; // If we're not asking to capture audio, it's not required
    if(media.failIfNoAudio === undefined || media.failIfNoAudio === null)
      return false; // Default
    return (media.failIfNoAudio === true);
  }

  function isAudioRecvEnabled(media) {
    Janus.debug("isAudioRecvEnabled:", media);
    if(media === undefined || media === null)
      return true;  // Default
    if(media.audio === false)
      return false; // Generic audio has precedence
    if(media.audioRecv === undefined || media.audioRecv === null)
      return true;  // Default
    return (media.audioRecv === true);
  }

  function isVideoSendEnabled(media) {
    Janus.debug("isVideoSendEnabled:", media);
    if(media === undefined || media === null)
      return true;  // Default
    if(media.video === false)
      return false; // Generic video has precedence
    if(media.videoSend === undefined || media.videoSend === null)
      return true;  // Default
    return (media.videoSend === true);
  }

  function isVideoSendRequired(media) {
    Janus.debug("isVideoSendRequired:", media);
    if(media === undefined || media === null)
      return false; // Default
    if(media.video === false || media.videoSend === false)
      return false; // If we're not asking to capture video, it's not required
    if(media.failIfNoVideo === undefined || media.failIfNoVideo === null)
      return false; // Default
    return (media.failIfNoVideo === true);
  }

  function isVideoRecvEnabled(media) {
    Janus.debug("isVideoRecvEnabled:", media);
    if(media === undefined || media === null)
      return true;  // Default
    if(media.video === false)
      return false; // Generic video has precedence
    if(media.videoRecv === undefined || media.videoRecv === null)
      return true;  // Default
    return (media.videoRecv === true);
  }

  function isDataEnabled(media) {
    Janus.debug("isDataEnabled:", media);
    if(adapter.browserDetails.browser == "edge") {
      Janus.warn("Edge doesn't support data channels yet");
      return false;
    }
    if(media === undefined || media === null)
      return false; // Default
    return (media.data === true);
  }

  function isTrickleEnabled(trickle) {
    Janus.debug("isTrickleEnabled:", trickle);
    if(trickle === undefined || trickle === null)
      return true;  // Default is true
    return (trickle === true);
  }
};
// var server = "wss://janusgw.testcompany.com:443";
var server = "https://janus.conf.meetecho.com/janus" 
var apisecret = "janusrocks";
// var iceServers: [{urls: "turn:turntest.testcompany.com:80?transport=tcp", username: "turnuser", credential: "turnpw"}],
var iceTransportPolicy = "relay";

var janus = null;
var videosfu = null;
var opaqueId = "videoroomtest-"+Janus.randomString(12);

var started = false;

var myusername = null;
var myid = null;
var mystream = null;
// We use this other ID just to map our subscriptions to us
var mypvtid = null;

var feeds = [];
var bitrateTimer = [];


$(document).ready(function(){
  // Initialize the library (all console debuggers enabled)
  Janus.init({debug: "all", callback: function() {
    console.log("xxx-Janus initialized!");
    
    // Use a button to start the demo
    $('#start').click(function() {
      console.log("xxx-Start button clicked.");
      // if(started)
      //  return;
      started = true;
      $(this).attr('disabled', true).unbind('click');
      
      // Make sure the browser supports WebRTC
      if(!Janus.isWebrtcSupported()) {
        alert("No WebRTC support... ");
        return;
      }

      // Create session
      janus = new Janus({

        server: server,
        iceServers: [{urls: "turn:turntest.testcompany.com:80?transport=tcp", username: "turnuser", credential: "turnpw"}],
        // iceTransportPolicy: iceTransportPolicy,
        // apisecret: apisecret,
        success: function() {
          console.log("xxx-Success: newSession: " + janus.getSessionId() + " created on " + janus.getServer());
          
          // Attach to videoRoom SFU plugin
          janus.attach({
            plugin: "janus.plugin.videoroom",
            // opaqueId: opaqueId,
            success: function(pluginHandle) {
              console.log("xxx-Success: Publisher attachedTo plugin: " + pluginHandle.getPlugin() + " with handleId: " + pluginHandle.getId());
              videosfu = pluginHandle;
              Janus.log("Plugin attached! (" + videosfu.getPlugin() + ", id=" + videosfu.getId() + ")");
              Janus.log("  -- This is a publisher/manager");
              // Prepare the username registration
              $('#register').click(registerUsername);
              $('#username').focus();
              $('#start').removeAttr('disabled').html("Stop/Leave").click(function() {
                $(this).attr('disabled', true);
                janus.destroy();
              });
            },
            error: function(error) {
              Janus.error("  -- Error attaching plugin...", error);
              alert("Error attaching plugin... " + error);
            },
            consentDialog: function(on) {
              Janus.debug("Consent dialog should be " + (on ? "on" : "off") + " now");
              if(on) {
                // Darken screen and show hint
              } else {
                // Restore screen
              }
            },
            iceState: function(state) {
              console.log("xxx-inTo iceState cbFunc");
              console.log("xxx-iceState is now: " + state);
            },
            webrtcState: function(on) {
              console.log("xxx-inTo webrtcState cbFunc");
              Janus.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
              // $("#videolocal").parent().parent().unblock();
            },
            mediaState: function(medium, on) {
              console.log("xxx-inTo mediaState cbFunc");
              Janus.log("Janus " + (on ? "started" : "stopped") + " receiving our " + medium);              
            },
            onmessage: function(msg, jsep) {
              console.log("xxx-onmessage cbFunc");
              // We got a message/event (msg) from the plugin
              // If jsep is not null, this involves a WebRTC negotiation

              // Janus.debug(" ::: Got a message (publisher) :::");
              Janus.log(" ::: Got a message (publisher) :::");
              Janus.log("msg: " + JSON.stringify(msg));
              //Janus.log("jsep: " + JSON.stringify(jsep));
              var event = msg["videoroom"];
              Janus.log("Event is: " + event);
              if(event != undefined && event != null) {
                if(event === "joined") {
                  console.log("xxx-eventIs: joined");
                  // Publisher/manager created, negotiate WebRTC and attach to existing feeds, if any
                  myid = msg["id"];
                  mypvtid = msg["private_id"];
                  Janus.log("Successfully joined room " + msg["room"] + " with ID " + myid);
                  publishOwnFeed(true);

                  // Any new feed to attach to?
                  if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
                    var list = msg["publishers"];
                    Janus.log("Got a list of available publishers/feeds:");
                    Janus.log("publishers: "+ JSON.stringify(list));
                    for(var f in list) {
                      var id = list[f]["id"]; // publisherId
                      var display = list[f]["display"]; // displayName
                      Janus.log("  >> [" + id + "] " + display); 
                      newRemoteFeed(id, display)
                    }
                  }
                } else if(event === "destroyed") {
                  console.log("xxx-eventIs: destroyed");
                  // The room has been destroyed
                  Janus.warn("The room has been destroyed!");
                  alert("The room has been destroyed", function() {
                    window.location.reload();
                  });
                } else if(event === "event") {
                  console.log("xxxx-eventIs: event");
                  // Any new feed to attach to?
                  if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
                    var list = msg["publishers"];
                    Janus.log("Got a list of available publishers/feeds:");
                    Janus.log("publishers: "+ JSON.stringify(list));
                    for(var f in list) {
                      var id = list[f]["id"]; // publisherId
                      var display = list[f]["display"]; // displayName
                      Janus.log("  >> [" + id + "] " + display); 
                      newRemoteFeed(id, display)
                    }
                  } else if(msg["unpublished"] !== undefined && msg["unpublished"] !== null) {
                    // One of the publishers has unpublished?
                    var unpublished = msg["unpublished"]; // typeOf unpublished is id
                    Janus.log("Publisher left: " + unpublished);
                  } else if(msg["leaving"] !== undefined && msg["leaving"] !== null) {
                    // One of the publishers has gone away?
                    var leaving = msg["leaving"]; // typeOf leaving is id
                    Janus.log("Publisher left: " + leaving);
                    var remoteFeed = null;
                      for(var i=1; i<6; i++) {
                        if(feeds[i] != null && feeds[i] != undefined && feeds[i].rfid == leaving) {
                          remoteFeed = feeds[i];
                          break;
                        }
                      }
                    if(remoteFeed != null) {
                      Janus.log("Feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") has left the room, detaching");
                      $('#remote'+remoteFeed.rfindex).empty().hide();
                      $('#videoremote'+remoteFeed.rfindex).empty();
                      feeds[remoteFeed.rfindex] = null;
                      remoteFeed.detach();
                    }
                  } else if(msg["error"] !== undefined && msg["error"] !== null) {
                    alert(msg["error"]);
                  }
                }
              }
              if(jsep !== undefined && jsep !== null) {  
                Janus.log("Handling SDP as well...");
                //Janus.log("jsep: " + JSON.stringify(jsep));
                videosfu.handleRemoteJsep({jsep: jsep});
              }
            },
            onlocalstream: function(stream) {
              // We have a local stream (getUserMedia worked!) to display
              console.log("xxx-onlocalstream cbFunc");
              Janus.log(" ::: Got a local stream :::");
              mystream = stream;
              //Janus.log(JSON.stringify(stream));
              $('#publisher').removeClass('hide').html(myusername).show();
              // Janus.attachMediaStream($('#myvideo').get(0), stream);
              videolocal.srcObject = mystream;
            },
            onremotestream: function(stream) {
              console.log("xxx-onremotestream cbFunc");
              // We have a remote stream (working PeerConnection!) to display
            },
            oncleanup: function() {
              console.log("xxx-oncleanup cbFunc");
              // PeerConnection with the plugin closed, clean the UI
              // The plugin handle is still valid so we can create a new one
              Janus.log(" ::: Got a cleanup notification: we are unpublished now :::");
            }
          });
        },
        error: function(error) {
          Janus.error(error);
          alert(error, function() {
            window.location.reload();
          });
        },
        destroyed: function() {
          mystream = null;
          videolocal.srcObject = mystream;
          window.location.reload();
        }
      });

      $('#start').removeAttr('disabled').html("Stop").click(function() {
        console.log("xxx-Stop button clicked.");
        $(this).attr('disabled', true);
        janus.destroy();
      });     
    });
  }});  
});


/////////////////

function checkEnter(field, event) {
  var theCode = event.keyCode ? event.keyCode : event.which ? event.which : event.charCode;
  if(theCode == 13) {
    registerUsername();
    return false;
  } else {
    return true;
  }
}

function registerUsername() {
  if($('#username').length === 0) {
    // Create fields to register
    $('#register').click(registerUsername);
    $('#username').focus();
  } else {
    // Try a registration
    $('#username').attr('disabled', true);
    $('#register').attr('disabled', true).unbind('click');
    var username = $('#username').val();
    if(username === "") {
      $('#you')
        .removeClass().addClass('label label-warning')
        .html("Insert your display name (e.g., pippo)");
      $('#username').removeAttr('disabled');
      $('#register').removeAttr('disabled').click(registerUsername);
      return;
    }
    // if(/[^a-zA-Z0-9]/.test(username)) {
    //  $('#you')
    //    .removeClass().addClass('label label-warning')
    //    .html('Input is not alphanumeric');
    //  $('#username').removeAttr('disabled').val("");
    //  $('#register').removeAttr('disabled').click(registerUsername);
    //  return;
    // }
    var register = { "request": "join", "room": 1234, "ptype": "publisher", "display": username };
    myusername = username;
    videosfu.send({"message": register});
    console.log("xxx-register/join request+info sent to videoSFU");
  }
}

function publishOwnFeed(useAudio) {
  // Publish our stream
  $('#publish').attr('disabled', true).unbind('click');
  console.log("xxx-inTo publishOwnFeed func");
  videosfu.createOffer(
    {
      // Add data:true here if you want to publish datachannels as well
      media: { audioRecv: false, videoRecv: false, audioSend: useAudio, videoSend: true },  // Publishers are sendonly
      success: function(jsep) {
        console.log("xxx-Success: createOffer cbFunc");
        Janus.log("Got publisher SDP!");
        //Janus.log("jsep: " + JSON.stringify(jsep));
        var publish = { "request": "configure", "audio": useAudio, "video": true };
        videosfu.send({"message": publish, "jsep": jsep});
      },
      error: function(error) {
        console.log("xxx-Failed: createOffer cbFunc");
        Janus.error("WebRTC error:", error);
        if (useAudio) {
           publishOwnFeed(false);
        } else {
          alert("WebRTC error... " + JSON.stringify(error));
          $('#publish').removeAttr('disabled').click(function() { publishOwnFeed(true); });
        }
      }
    }
  );  
}

function newRemoteFeed(id, display) {
  console.log("xxx-inTo newRemoteFeed func");
  // A new feed has been published, create a new plugin handle and attach to it as a listener
  var remoteFeed = null;
  janus.attach(
    {
      plugin: "janus.plugin.videoroom",
      // opaqueId: opaqueId,
      success: function(pluginHandle) {
        console.log("xxx-newRemoteFeed-Success: Subscriber attachedTo plugin: " + pluginHandle.getPlugin() + " with handleId: " + pluginHandle.getId());
        remoteFeed = pluginHandle;
        Janus.log("Plugin attached! (" + remoteFeed.getPlugin() + ", id=" + remoteFeed.getId() + ")");
        Janus.log("  -- This is a subscriber");
        // We wait for the plugin to send us an offer
        // publisher => var register = { "request": "join", "room": 1234, "ptype": "publisher", "display": username };
        // var listen = { "request": "join", "room": 1234, "ptype": "listener", "feed": id, "private_id": mypvtid };
        var listen = { "request": "join", "room": 1234, "ptype": "listener", "feed": id };
        remoteFeed.send({"message": listen});
      },
      error: function(error) {
        Janus.error("  -- Error attaching plugin...", error);
        alert("Error attaching plugin... " + error);
      },
      onmessage: function(msg, jsep) {
        console.log("xxx-newRemoteFeed onmessage cbFunc");
        Janus.log(" ::: Got a message (listener) :::");
        Janus.log("msg: " + JSON.stringify(msg));
        //Janus.log("jsep: " + JSON.stringify(jsep));
        var event = msg["videoroom"];
        Janus.log("Event is: " + event);
        if(event != undefined && event != null) {
          if(event === "attached") {
            // Subscriber created and attached
            for(var i=1;i<6;i++) {
              if(feeds[i] === undefined || feeds[i] === null) {
                feeds[i] = remoteFeed;
                remoteFeed.rfindex = i;
                break;
              }
            }
            remoteFeed.rfid = msg["id"];
            remoteFeed.rfdisplay = msg["display"];
            // if(remoteFeed.spinner === undefined || remoteFeed.spinner === null) {
            //  var target = document.getElementById('videoremote'+remoteFeed.rfindex);
            //  remoteFeed.spinner = new Spinner({top:100}).spin(target);
            // } else {
            //  remoteFeed.spinner.spin();
            // }
            var target = document.getElementById('videoremote'+remoteFeed.rfindex);
            Janus.log("Successfully attached to feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") in room " + msg["room"]);
            $('#remote'+remoteFeed.rfindex).removeClass('hide').html(remoteFeed.rfdisplay).show();
          } else if(msg["error"] !== undefined && msg["error"] !== null) {
            alert(msg["error"]);
          } else {
            // for debug purpose: what happened? catch something
          }
        }
        if(jsep !== undefined && jsep !== null) {
          //Janus.debug("Handling SDP as well...");
          Janus.log("xxx-newRemoteFeed func - Handling SDP as well...");
          //Janus.log("jsep: " + JSON.stringify(jsep));
          // Answer and attach
          remoteFeed.createAnswer({           
            jsep: jsep,
            media: { audioSend: false, videoSend: false },  // We want recvonly audio/video
            success: function(jsep) {
              console.log("xxx-newRemoreFeed Success: createAnswer cbFunc");
              Janus.log("Got SDP!");
              //Janus.log("jsep: " + JSON.stringify(jsep));
              var body = { "request": "start", "room": 1234 };
              remoteFeed.send({"message": body, "jsep": jsep});
            },
            error: function(error) {
              Janus.error("WebRTC error:", error);
              alert("WebRTC error... " + JSON.stringify(error));
            }
          });             
        }
      },
      iceState: function(state) {
        console.log("xxx-newRemoteFeed inTo iceState cbFunc");
        console.log("xxx-newRemoteFeed iceState is now: " + state);
      },
      webrtcState: function(on) {
        console.log("xxx-newRemoteFeed inTo webrtcState cbFunc");
        Janus.log("xxx-newRemoteFeed Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
      },
      mediaState: function(medium, on) {
        console.log("xxx-newRemoteFeed inTo mediaState cbFunc");
        Janus.log("xxx-newRemoteFeed Janus " + (on ? "started" : "stopped") + " receiving our " + medium);              
      },
      onlocalstream: function(stream) {
        // The subscriber stream is recvonly, we don't expect anything here
      },
      onremotestream: function(stream) {
        console.log("xxx-newRemoteFeed onremotestream cbFunc");
        console.log("xxx-We have a stream come from remoteFeed!");
        //Janus.debug("Remote feed #" + remoteFeed.rfindex);
        Janus.log("Remote feed #" + remoteFeed.rfindex);
        mystream = stream;
        $('#remote'+remoteFeed.rfindex).removeClass('hide').html(remoteFeed.rfdisplay).show();
        //videoremote1.srcObject = mystream;
        //console.log($('#videoremote'+remoteFeed.rfindex));
        $('#videoremote'+remoteFeed.rfindex)[0].srcObject = mystream;
      },
      oncleanup: function() {
        console.log("xxx-newRemoteFeed oncleanup cbFunc");
        Janus.log(" ::: Got a cleanup notification (remote feed " + id + ") :::");
        //videoremote1.srcObject = null;
        $('#videoremote'+remoteFeed.rfindex)[0].srcObject = null;
      }
    }
  );
}
;











