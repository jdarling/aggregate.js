var Aggregate = require('../').AggregateStreamed;

var sep = function(){
  console.log((new Array(10)).join('-='));
};

var source = 
  '// Line Comments are supported\r\n'+
  '/* Block Comments are also supported*/\r\n'+
  '\r\n'+
  '// Turn all normal numbers into objects with a val property that contains the number\r\n'+
  'select("$ => {val: $}")\r\n'+
  '\r\n'+
  '// Output the transformed values\r\n'+
  'log("selected")\r\n'+
  '\r\n'+
  '// Get only unique .val records\r\n'+
  'distinct("$.val")\r\n'+
  'log("distinct")\r\n'+
  '\r\n'+
  '// Execute a map/reduce operation to classify everything as even or odd\r\n'+
  'select("$ => {key: $.val % 2?\'odd\':\'even\', value: [$.val]}")\r\n'+
  'log("grouped")\r\n'+
  '\r\n'+
  '// Add str as a new property\r\n'+
  'select("{key: $.key, value: $.value, str: \\"Some String\\"}")\r\n'+
  'log("selected")\r\n'+
  '\r\n'+
  '// Convert back from objects to numeric array of numbers\r\n'+
  'select("$ => $.value")\r\n'+
  'log("selected")\r\n'+
  '\r\n'+
  '// Only use even numbers\r\n'+
  'pick("!($ % 2)")\r\n'+
  'log("Final")'
  ;

console.log('Compiling: ');
sep();
console.log(source);
sep();

var program = Aggregate.compile(source);
console.log('Compiled');
sep();

console.log('Building');
var agg = program({}, {logger: console.log});
console.log('Built');
sep();

console.log('Running');
setTimeout(function(){
  agg.data([1, 2]);
}, 10);