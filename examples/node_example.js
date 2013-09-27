var Aggregate = require('../aggregate');

var records = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
var a = new Aggregate(records).log('Initial');
//a.options.disableLogger = true;
var result = a.select("$ => {val: $}")
  .log("selected")
  .sort("a, b => b.val - a.val")
  .log("sorted")
  .distinct("$.val")
  .log("distinct")
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
  .log("Final")
;