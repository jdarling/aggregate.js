(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.once = noop;
process.off = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],4:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require("C:\\Users\\Jeremy\\AppData\\Roaming\\npm\\node_modules\\browserify\\node_modules\\insert-module-globals\\node_modules\\process\\browser.js"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":3,"C:\\Users\\Jeremy\\AppData\\Roaming\\npm\\node_modules\\browserify\\node_modules\\insert-module-globals\\node_modules\\process\\browser.js":2,"inherits":1}],5:[function(require,module,exports){
module.exports.AggregateStreamed = require('./lib/aggregateStreaming');
module.exports.Aggregate = require('./lib/aggregate');

if(typeof(window)!=='undefined'){
  window.AggregateStreamed = require('./lib/aggregateStreaming');
  window.Aggregate = require('./lib/aggregate');
}

},{"./lib/aggregate":6,"./lib/aggregateStreaming":7}],6:[function(require,module,exports){
var Aggregate = function(sourceRecords, options){
  /*
    Rough Notes:
      * pick($) - if truthy value returned then keep the item
      * distinct($) - for each item compare the returned key, if there are duplicates then keep the first
      * select($) - for each item do something and replace the current item with the result a becomes b
      * unwind(field, [selector]) - for each item for the given field as an array produce a unique record
      * mid(start, finish) - get the elements from start to finish similar to slice
      * sort(a, b) - sort the array based on -1, 0, 1
      * mapReduce(mapper, reducer) - typical map reduce thing
          - mapper should return {key: '', value: <whatever>}
      * count() - Return the number of elements in the working set
      * toArray() - Return an array from the working set

  */

  /*

    Example:
      var records = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      var a = new Aggregate(records);
      //a.options.disableLogger = true;
      var result = a.select("$ => {val: $}")
        .sort("a, b => b.val - a.val")
        .distinct("$.val")
        .mapReduce(
          "{key: $.val % 2?'odd':'even', value: [$.val]}",
          "key, curr, next => curr.concat(next)"
        )
        .log("mapReduced")
        .select("{key: $.key, values: $.value}")
        .log("selected")
        .unwind("values")
        .log("unwound")
        .select("{key: $.key, value: $.values}")
        .select("$ => $.value")
        .log("selected")
        .mid("Math.max(0, (this.length / 2) - 2)", "Math.min(this.length-1, (this.length / 2) + 2)")
        .log("mid")
        .pick("!($ % 2)")
        .log("final")
      ;

  */
  var self = this, records = sourceRecords;
  self.options = options || {};
  self._each = function(callback){
    var i, l = records.length, record;
    for(i=0; i<l; i++){
      record = records[i];
      callback.call(self, record, i, records);
    }
  };

  self._records = function(){
    return records;
  };
  //pipeline, variables
};

Aggregate.prototype.lambda = Aggregate.lambda = (function(){
  var stringType = typeof('');
  var undefinedType = (function(undefined){
    return typeof(undefined);
  })();
  var numberType = typeof(1);
  var Lambda = function(expression){
    var self = this, type = typeof(expression);
    // The idea for this was taken from linq.js (http://linqjs.codeplex.com/)
    // Then it was re-written to fit this project's concept
    // Very interesting project if it wasn't for the poor naming conventions followed for methods
    var identity = function(self){
      return self;
    };
    if(expression === null) return identity;
    if(type === undefinedType) return identity;
    if(type === stringType){
      if(expression === ""){
        return identity;
      }else if(expression.indexOf("=>") == -1){
        var l = new Function(Lambda.selfSymbol, "return " + expression);
        return function(){
          return l.apply(self._records(), arguments);
        };
      }else{
        var expr = expression.match(/^[(\s]*([^()]*?)[)\s]*=>(.*)/);
        var l = new Function(expr[1], "return " + expr[2]);
        return function(){
          return l.apply(self._records(), arguments);
        };
      }
    }
    return expression;
  };
  Lambda.selfSymbol = '$';
  return Lambda;
})();

Aggregate.prototype.toArray = function(){
  return this._records();
};

Aggregate.prototype.count = function(){
  return this._records().length;
};

Aggregate.prototype.newFrom = function(values){
  var instance = new Aggregate(values, this.options);
  instance.lambda.selfSymbol = this.lambda.selfSymbol;
  return instance;
};

Aggregate.prototype.extend = function() {
  // copy reference to target object
  var self = this, target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options, name, src, copy;

  // Handle a deep copy situation
  if (typeof target === 'boolean') {
    deep = target;
    target = arguments[1] || {};
    // skip the boolean and the target
    i = 2;
  }

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== 'object' && !typeof target === 'function')
    target = {};

  var isPlainObject = function(obj) {
    // Must be an Object.
    // Because of IE, we also have to check the presence of the constructor property.
    // Make sure that DOM nodes and window objects don't pass through, as well
    //if (!obj || toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval)
    if (!obj || (''+obj) !== '[object Object]' || obj.nodeType || obj.setInterval)
      return false;

    var has_own_constructor = hasOwnProperty.call(obj, 'constructor');
    var has_is_property_of_method = obj.constructor&&hasOwnProperty.call(obj.constructor.prototype, 'isPrototypeOf');
    // Not own constructor property must be Object
    if (obj.constructor && !has_own_constructor && !has_is_property_of_method)
      return false;

    // Own properties are enumerated firstly, so to speed up,
    // if last one is own, then all properties are own.

    var last_key;
    for (key in obj)
      last_key = key;

    return typeof last_key === 'undefined' || hasOwnProperty.call(obj, last_key);
  };

  for (; i < length; i++) {
    // Only deal with non-null/undefined values
    if ((options = arguments[i]) !== null) {
      // Extend the base object
      for (name in options) {
        src = target[name];
        copy = options[name];

        // Prevent never-ending loop
        if (target === copy)
            continue;

        // Recurse if we're merging object literal values or arrays
        if (deep && copy && (isPlainObject(copy) || Array.isArray(copy))) {
          var clone = src && (isPlainObject(src) || Array.isArray(src)) ? src : Array.isArray(copy) ? [] : {};

          // Never move original objects, clone them
          target[name] = self.extend(deep, clone, copy);

        // Don't bring in undefined values
        } else if (typeof copy !== 'undefined')
          target[name] = copy;
      }
    }
  }

  // Return the modified object
  return target;
};

Aggregate.prototype.pick = function(func){
  var newRecords = [], f = this.lambda(func);
  this._each(function(record){
    if(f(record)){
      newRecords.push(record);
    }
  });
  return this.newFrom(newRecords);
};

Aggregate.prototype.select = function(func){
  var newRecords = [], f = this.lambda(func);
  this._each(function(record){
    newRecords.push(f(record));
  });
  return this.newFrom(newRecords);
};

Aggregate.prototype.sort = function(func){
  var newRecords = this._records().slice(), f = this.lambda(func);
  newRecords.sort(f);
  return this.newFrom(newRecords);
};

Aggregate.prototype.mid = function(fOrValStart, fOrValEnd){
  var f1 = this.lambda(fOrValStart), f2 = this.lambda(fOrValEnd), start, end;
  start = typeof(f1)==='function'?f1():f1;
  end = typeof(f2)==='function'?f2():f2;
  return this.newFrom(this._records().slice(start, end));
};

Aggregate.prototype.distinct = function(func){
  var newRecords = [], indexes = [], f = this.lambda(func);
  this._each(function(record){
    var key = f(record);
    if(indexes.indexOf(key)===-1){
      indexes.push(key);
      newRecords.push(record);
    }
  });
  return this.newFrom(newRecords);
};

Aggregate.prototype.mapReduce = function(mapperFunc, reducerFunc){
  var mapper = this.lambda(mapperFunc), reducer = this.lambda(reducerFunc);
  var grouped = {}, key, result = [], values, i, l, val;
  this._each(function(record){
    var r = mapper(record);
    if(r){
      (grouped[r.key] = grouped[r.key] || []).push(r.value);
    }
  });
  for(key in grouped){
    values = grouped[key];
    val = values[0]; // get the initial value
    l = values.length;
    for(i=1; i<l; i++){
      val = reducer(key, val, values[i]);
    }
    result.push({key: key, value: val});
  }
  return this.newFrom(result);
};

Aggregate.prototype.log = (function(undefined){
  var functionType = typeof(function(){});
  var checkDoLogger = function(self, rawArgs){
    var m = self.options.logger;
    if(typeof(m)===functionType){
      var args = Array.prototype.slice.call(rawArgs);
      args.push(self._records());
      m.apply(self, args);
      return true;
    }
    return false;
  };
  if(typeof(console)!==typeof(undefined)){
    return function(){
      if(!this.options.disableLogger){
        if(!checkDoLogger(this, arguments)){
          var args = Array.prototype.slice.call(arguments);
          args.push(this._records());
        }
        return this;
      }
    };
  }else{
    return function(){
      return this;
    };
  }
})();

Aggregate.prototype.unwind = function(field, selectorFunc){
  var self = this, newRecords = [], selectorFunc = self.lambda(selectorFunc || this.lambda.selfSymbol+"."+field), newRecord;
  this._each(function(record){
    var arr = selectorFunc(record)||[], i, l=arr.length;
    for(i=0; i<l; i++){
      newRecord = self.extend(true, {}, record);
      newRecord[field] = arr[i];
      newRecords.push(newRecord);
    }
  });
  return self.newFrom(newRecords);
};

var buildAST = function(source){
  var buildAST = function(src){
    var i = 0, l=src.length;
    var next = function(){
      i++;
      skipWhite();
    };
    var curr = function(){
      return src[i];
    };
    var is = function(what){
      var c = curr();
      return c && c.match(what);
    };
    var skipWhite = function(){
      while(is(/\s/)){
        i++;
      }
      if(src[i]==='/'){
        switch(src[i+1]){
            case('/'):
              i+=2;
              var reIsEoln = /[\r\n]/;
              while((i<l)&&(!src[i].match(reIsEoln))){
                i++;
              }
              skipWhite();
              break;
            case('*'):
              i+=2;
              while((i<l)&&(src[i] !== '*' && src[i+1] !== '/')){
                i++;
              }
              i+=2;
              skipWhite();
              break;
        }
      }
    };
    var matchSymbol = function(){
      if(is(/[a-z]/i)){
        var j = i;
        while(is(/[a-z0-9_]/i)){
          i++;
        }
        return src.substring(j, i);
      }else{
        throw new Error('Unexpected Token "'+curr()+'" at position '+i);
      }
    };
    var expect = function(sym){
      var j, l=sym.length;
      skipWhite();
      for(j=0; j<l; j++){
        if(src[i+j]!==sym[j]){
          throw new Error('Expected "'+sym+'" but found "'+src.substr(i, j+1)+'" instead at position '+i);
        }
      }
      i+=j;
      skipWhite();
    };
    var isEOF = function(){
      return i===l;
    };
    var matchString = function(){
      var j = i, v;
      var strType = is(/["']/);
      if(strType){
        strType = strType[0];
        next();
        while(!is(strType)&&!isEOF()){
          if(is(/\\/)){
            i++;
          }
          i++;
        }
        v = src.substring(j, i+1);
        next();
        return JSON.parse(v);
      }else{
          return false;
      }
    };
    var matchNumber = function(){
      var j = i, v;
      while(is(/[0-9\.]/)){
        i++;
      }
      v = src.substring(j, i);
      return +v;
    };
    var matchVar = function(){
      if(is(/[0-9]/)){
        return matchNumber();
      }else{
        return matchString();
      }
    };
    var matchArgumentList = function(){
      var args = [], v;
      expect('(');
      v = matchVar();
      while(v!==false){
        args.push(v);
        if(is(/\,/)){
          next();
          v = matchVar();
          if(!v){
            throw new Error('Argument expected at position '+i);
          }
        }else{
          v = false;
        }
      };
      expect(')');
      if(is(';')){
        next();
      }
      return args;
    };
    var matchCommand = function(){
      var command, args;
      command = matchSymbol().split(' ').shift();
      args = matchArgumentList();
      return {
        command: command,
        args: args
      };
    };
    skipWhite();
    var ast = [], command;
    while(!isEOF()){
      ast.push(matchCommand());
    }
    return ast;
  };
  return buildAST(source);
};

Aggregate.compilePipeline = function(source){
  return (function(ast){
    var getVal = function(sym, variables){
      var path = sym.split('.'), part, value = variables;
      while(path.length && (value !== void 0)){
        part = path.shift();
        value = value[part];
      }
      if(path.length && !value){
        throw new Error('Requested variable could not be found: '+sym);
      }
      switch(typeof(value)){
        case('object'):
          return JSON.stringify(value);
        default:
          return value;
      }
    };
    var processArgs = function(src, variables){
      var args = (src||[]).slice(), i, l=args.length;
      for(i=0; i<l; i++){
        if(typeof(args[i])==='string'){
          args[i] = args[i].replace(/{{(.*?)}}/g, function(full, sym){
            var val = getVal(sym.split(/\s/).shift(), variables);
            return val;
          });
        }
      }
      return args;
    };
    return function(records, variables, options){
      var agg = new Aggregate(records, options);
      var step, i, l = ast.length;
      for(i=0; i<l; i++){
        step = ast[i];
        agg = agg[step.command].apply(agg, processArgs(step.args, variables));
      }
      return agg;
    };
  })(buildAST(source));
};

Aggregate.executePipeline = function(source, records, variables, options){
  var program = this.compilePipeline(source);
  return program(records, variables, options);
};

module.exports = Aggregate;

},{}],7:[function(require,module,exports){
(function (process){
"use strict";

//var Transform = require('./transform');
var util = require('util');
var async = require('async');
var ERRORS = require('./errors');

var Aggregate = function(options){
  var self = this;
  self.options = options || {};
  self._outlets = [];
  self._queue = [];
  self._data = [];
  self.transform = self.options.transform || function(data, done){
    self.push(data);
    done();
  };
};

Aggregate.prototype.newOutlet = function(transformFunction){
  var self = this;
  var options = self.extend(true, {}, self.options);
  options.transform = transformFunction;
  options.selfSymbol = self.lambda.selfSymbol;
  var instance = new Aggregate(options);
  self.pipe(instance);
  return instance;
};

Aggregate.prototype.process = function(){
  var self = this;
  var processUpdates = function(){
    var data = self._data.slice(0, self._data.length);
    self._scheduled = false;
    async.each(data, function(rec, next){
      self.transform(rec, next);
    }, function(){
      process.nextTick(function(){
        // flush results to outlets
        var i, l = self._outlets.length;
        var j, k = self._queue.length, update
        if(!l){
          return;
        }
        for(j=0; j<k; j++){
          update = self._queue.shift();
          for(i=0; i<l; i++){
            self._outlets[i].data(update);
          }
        }
      });
    });
  };
  if(self._scheduled){
    return;
  }
  self._scheduled = true;
  process.nextTick(function(){
    processUpdates(self);
  });
};

Aggregate.prototype.push = function(data){
  var self = this;
  self._queue.push(data);
};

Aggregate.prototype.data = function(data, forceNotArray){
  var self = this;
  var isArray = data instanceof Array;
  if(isArray && (!!forceNotArray)){
    isArray = false;
  }
  if(isArray){
  console.log('push multi');
    self._data.push.apply(self._data, data);
  }else{
    self._data.push(data);
  }
  self.process();
};

var checkDoLogger = (function(){
  var functionType = typeof(function(){});
  return function(self, m, args){
    if(typeof(m)===functionType){
      if(console&&(console.log===m)){
        console.log.apply(console, args);
      }else{
        m.apply(self, args);
      }
      return true;
    }
    return false;
  };
})();

Aggregate.prototype.pipe = function(to){
  var self = this;
  if(self._outlets.indexOf(to)===-1){
    if(typeof(to)==='function'){
      self.newOutlet(to);
    }else{
      self._outlets.push(to);
    }
  }
};

Aggregate.prototype.lambda = Aggregate.lambda = (function(){
  var stringType = typeof('');
  var undefinedType = (function(undefined){
    return typeof(undefined);
  })();
  var Lambda = function(expression){
    var self = this, type = typeof(expression);
    // The idea for this was taken from linq.js (http://linqjs.codeplex.com/)
    // Then it was re-written to fit this project's concept
    // Very interesting project if it wasn't for the poor naming conventions followed for methods
    var identity = function(self){
      return self;
    };
    if(expression === null) return identity;
    if(type === undefinedType) return identity;
    if(type === stringType){
      var l;
      if(expression === ""){
        return identity;
      }else if(expression.indexOf("=>") === -1){
        l = new Function(Lambda.selfSymbol, "return " + expression);
        return function(){
          return l.apply(self, arguments);
        };
      }else{
        var expr = expression.match(/^[(\s]*([^()]*?)[)\s]*=>(.*)/);
        l = new Function(expr[1], "return " + expr[2]);
        return function(){
          return l.apply(self, arguments);
        };
      }
    }
    return expression;
  };
  Lambda.selfSymbol = '$';
  return Lambda;
})();

Aggregate.prototype.extend = function() {
  // copy reference to target object
  var self = this, target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options, name, src, copy;

  // Handle a deep copy situation
  if (typeof target === 'boolean') {
    deep = target;
    target = arguments[1] || {};
    // skip the boolean and the target
    i = 2;
  }

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== 'object' && !typeof target === 'function')
    target = {};

  var isPlainObject = function(obj) {
    // Must be an Object.
    // Because of IE, we also have to check the presence of the constructor property.
    // Make sure that DOM nodes and window objects don't pass through, as well
    //if (!obj || toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval)
    if (!obj || (''+obj) !== '[object Object]' || obj.nodeType || obj.setInterval)
      return false;

    var has_own_constructor = hasOwnProperty.call(obj, 'constructor');
    var has_is_property_of_method = obj.constructor&&hasOwnProperty.call(obj.constructor.prototype, 'isPrototypeOf');
    // Not own constructor property must be Object
    if (obj.constructor && !has_own_constructor && !has_is_property_of_method)
      return false;

    // Own properties are enumerated firstly, so to speed up,
    // if last one is own, then all properties are own.

    var last_key, key;
    for (key in obj){
      last_key = key;
    }

    return typeof last_key === 'undefined' || hasOwnProperty.call(obj, last_key);
  };

  for (; i < length; i++) {
    // Only deal with non-null/undefined values
    if ((options = arguments[i]) !== null) {
      // Extend the base object
      for (name in options) {
        src = target[name];
        copy = options[name];

        // Prevent never-ending loop
        if (target === copy)
            continue;

        // Recurse if we're merging object literal values or arrays
        if (deep && copy && (isPlainObject(copy) || Array.isArray(copy))) {
          var clone = src && (isPlainObject(src) || Array.isArray(src)) ? src : Array.isArray(copy) ? [] : {};

          // Never move original objects, clone them
          target[name] = self.extend(deep, clone, copy);

        // Don't bring in undefined values
        } else if (typeof copy !== 'undefined')
          target[name] = copy;
      }
    }
  }

  // Return the modified object
  return target;
};

var buildAST = function(source){
  var buildAST = function(src){
    var i = 0, l=src.length;
    var next = function(){
      i++;
      skipWhite();
    };
    var curr = function(){
      return src[i];
    };
    var is = function(what){
      var c = curr();
      return c && c.match(what);
    };
    var skipWhite = function(){
      while(is(/\s/)){
        i++;
      }
      if(src[i]==='/'){
        switch(src[i+1]){
            case('/'):
              i+=2;
              var reIsEoln = /[\r\n]/;
              while((i<l)&&(!src[i].match(reIsEoln))){
                i++;
              }
              skipWhite();
              break;
            case('*'):
              i+=2;
              while((i<l)&&(src[i] !== '*' && src[i+1] !== '/')){
                i++;
              }
              i+=2;
              skipWhite();
              break;
        }
      }
    };
    var matchSymbol = function(){
      if(is(/[a-z]/i)){
        var j = i;
        while(is(/[a-z0-9_]/i)){
          i++;
        }
        return src.substring(j, i);
      }else{
        //throw new Error('Unexpected Token "'+curr()+'" at position '+i);
        throw new ERRORS.UnexpectedToken(curr(), i, src);
      }
    };
    var expect = function(sym){
      var j, l=sym.length;
      skipWhite();
      for(j=0; j<l; j++){
        if(src[i+j]!==sym[j]){
          //throw new Error('Expected "'+sym+'" but found "'+src.substr(i, j+1)+'" instead at position '+i);
          throw new ERRORS.Expected(sym, i+j, src);
        }
      }
      i+=j;
      skipWhite();
    };
    var isEOF = function(){
      return i===l;
    };
    var matchString = function(){
      var j = i, v;
      var strType = is(/["']/);
      if(strType){
        strType = strType[0];
        next();
        while(!is(strType)&&!isEOF()){
          if(is(/\\/)){
            i++;
          }
          i++;
        }
        v = src.substring(j, i+1);
        next();
        return JSON.parse(v);
      }else{
          return false;
      }
    };
    var matchNumber = function(){
      var j = i, v;
      while(is(/[0-9\.]/)){
        i++;
      }
      v = src.substring(j, i);
      return +v;
    };
    var matchVar = function(){
      if(is(/[0-9]/)){
        return matchNumber();
      }else{
        return matchString();
      }
    };
    var matchArgumentList = function(){
      var args = [], v;
      expect('(');
      v = matchVar();
      while(v!==false){
        args.push(v);
        if(is(/\,/)){
          next();
          v = matchVar();
          if(!v){
            //throw new Error('Argument expected at position '+i);
            throw new ERRORS.ArgumentExpected(i, src);
          }
        }else{
          v = false;
        }
      }
      expect(')');
      if(is(';')){
        next();
      }
      return args;
    };
    var matchCommand = function(){
      var command, args;
      command = matchSymbol().split(' ').shift();
      args = matchArgumentList();
      return {
        command: command,
        args: args
      };
    };
    skipWhite();
    var ast = [];
    while(!isEOF()){
      ast.push(matchCommand());
    }
    return ast;
  };
  return buildAST(source);
};

Aggregate.compile = function(source, options){
  return (function(ast){
    var getVal = function(sym, variables){
      var path = sym.split('.'), part, value = variables;
      while(path.length && (value !== void 0)){
        part = path.shift();
        value = value[part];
      }
      if(path.length && !value){
        //throw new Error('Requested variable could not be found: '+sym);
        throw new ERRORS.VariableNotFound('Requested variable could not be found: '+sym);
      }
      switch(typeof(value)){
        case('object'):
          return JSON.stringify(value);
        default:
          return value;
      }
    };
    var processArgs = function(src, variables){
      var args = (src||[]).slice(), i, l=args.length;
      for(i=0; i<l; i++){
        if(typeof(args[i])==='string'){
          args[i] = args[i].replace(/{{(.*?)}}/g, function(full, sym){
            var val = getVal(sym.split(/\s/).shift(), variables);
            return val;
          });
        }
      }
      return args;
    };
    return function(variables, options){
      var agg = new Aggregate(options), astep = agg;
      var step, i, l = ast.length;
      variables=variables||{};
      for(i=0; i<l; i++){
        step = ast[i];
        astep = astep[step.command].apply(astep, processArgs(step.args, variables));
      }
      return agg;
    };
  })(buildAST(source));
};

// Data handlers

Aggregate.prototype.log = function(prefix){
  var self = this;
  var agg = self.newOutlet((function(baseArgs){
    return function log(data, done){
      var self = this;
      var options = self.options;
      if(!options.disableLogger){
        var m = options.logger;
        var args = baseArgs.concat([data]);
        checkDoLogger(self, m, args);
      }
      this.push(data);
      done();
    };
  })(prefix?[prefix]:prefix));
  return agg;
};

Aggregate.prototype.distinct = function(func){
  var self = this;
  var agg = self.newOutlet((function(f, seen, func){
    return function distinct(data, done){
      var key = f(data);
      if(seen.indexOf(key)===-1){
        seen.push(key);
        this.push(data);
      }
      done();
    };
  })(this.lambda(func), [], func));
  return agg;
};

Aggregate.prototype.pick = function(func){
  var self = this;
  var f = self.lambda(func);
  var agg = self.newOutlet(function pick(data, done){
      if(f(data)){
        this.push(data);
      }
      done();
    });
  return agg;
};

Aggregate.prototype.select = function(func){
  var self = this;
  var f = self.lambda(func);
  var agg = self.newOutlet(function pick(data, done){
      this.push(f(data));
      done();
    });
  return agg;
};

module.exports = Aggregate;

}).call(this,require("C:\\Users\\Jeremy\\AppData\\Roaming\\npm\\node_modules\\browserify\\node_modules\\insert-module-globals\\node_modules\\process\\browser.js"))
},{"./errors":8,"C:\\Users\\Jeremy\\AppData\\Roaming\\npm\\node_modules\\browserify\\node_modules\\insert-module-globals\\node_modules\\process\\browser.js":2,"async":9,"util":4}],8:[function(require,module,exports){
/*
UnexpectedToken(token, position, src)
Expected(token, position, src)
ArgumentExpected(position, src)
VariableNotFound(variableName)
*/

var UnexpectedToken = module.exports.UnexpectedToken = function UnexpectedToken(token, position, src) {
    this.name = "UnexpectedToken";
    this.message = 'Unexpected Token "'+token+'" at position '+position;
}
UnexpectedToken.prototype = Error.prototype;

var Expected = module.exports.Expected = function Expected(token, position, src) {
    this.name = "Expected";
    this.message = 'Expected "'+token+'" but found "'+src.substr(position-1, position)+'" instead at position '+position;
}
Expected.prototype = Error.prototype;

var ArgumentExpected = module.exports.ArgumentExpected = function ArgumentExpected(position, src) {
    this.name = "ArgumentExpected";
    this.message = 'Argument expected at position '+position;
}
ArgumentExpected.prototype = Error.prototype;

var VariableNotFound = module.exports.VariableNotFound = function VariableNotFound(variableName) {
    this.name = "VariableNotFound";
    this.message = 'Requested variable could not be found: '+variableName;
}
VariableNotFound.prototype = Error.prototype;

},{}],9:[function(require,module,exports){
(function (process){
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
/*jshint onevar: false, indent:4 */
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(done) );
        });
        function done(err) {
          if (err) {
              callback(err);
              callback = function () {};
          }
          else {
              completed += 1;
              if (completed >= arr.length) {
                  callback();
              }
          }
        }
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        if (!callback) {
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err) {
                    callback(err);
                });
            });
        } else {
            var results = [];
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err, v) {
                    results[x.index] = v;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        var remainingTasks = keys.length
        if (!remainingTasks) {
            return callback();
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            remainingTasks--
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (!remainingTasks) {
                var theCallback = callback;
                // prevent final callback from calling itself if it errors
                callback = function () {};

                theCallback(null, results);
            }
        });

        _each(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var attempts = [];
        // Use defaults if times not passed
        if (typeof times === 'function') {
            callback = task;
            task = times;
            times = DEFAULT_TIMES;
        }
        // Make sure times is a number
        times = parseInt(times, 10) || DEFAULT_TIMES;
        var wrappedTask = function(wrappedCallback, wrappedResults) {
            var retryAttempt = function(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            };
            while (times) {
                attempts.push(retryAttempt(task, !(times-=1)));
            }
            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || callback)(data.err, data.result);
            });
        }
        // If a callback is passed, run this as a controll flow
        return callback ? wrappedTask() : wrappedTask
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (!_isArray(tasks)) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            started: false,
            paused: false,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            kill: function () {
              q.drain = null;
              q.tasks = [];
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                if (q.paused === true) { return; }
                q.paused = true;
                q.process();
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                q.process();
            }
        };
        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            drained: true,
            push: function (data, callback) {
                if (!_isArray(data)) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    cargo.drained = false;
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain && !cargo.drained) cargo.drain();
                    cargo.drained = true;
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0, tasks.length);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    async.compose = function (/* functions... */) {
      return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require("C:\\Users\\Jeremy\\AppData\\Roaming\\npm\\node_modules\\browserify\\node_modules\\insert-module-globals\\node_modules\\process\\browser.js"))
},{"C:\\Users\\Jeremy\\AppData\\Roaming\\npm\\node_modules\\browserify\\node_modules\\insert-module-globals\\node_modules\\process\\browser.js":2}]},{},[5])