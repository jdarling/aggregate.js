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
