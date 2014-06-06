module.exports.AggregateStreamed = require('./lib/aggregateStreaming');
module.exports.Aggregate = require('./lib/aggregate');

if(typeof(window)!=='undefined'){
  window.AggregateStreamed = require('./lib/aggregateStreaming');
  window.Aggregate = require('./lib/aggregate');
}
