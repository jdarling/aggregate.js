(function () {
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
/*
  case('string'):
            return '\\"'+value+'\\"';
*/
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

  // AMD / RequireJS
  if(typeof(define) !== 'undefined' && define.amd){
    define([], function(){
      return Aggregate;
    });
  // Node.js
  }else if(typeof(module) !== 'undefined' && module.exports){
    module.exports = Aggregate;
  // included directly via <script> tag
  }else{
    this.Aggregate = Aggregate;
  }
}());
