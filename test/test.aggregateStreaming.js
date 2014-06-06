var Aggregate = require('../').AggregateStreamed;

var agg = new Aggregate({
  logger: console.log
});

var pipe = agg
  .log('init')
  .distinct('$.a.toString()+$.b.toString()')
  ;
//*
pipe
  .distinct('$.a')
  .select('$.a')
  .newOutlet(function(data, done){
    console.log('distinct.a: ', data);
    this.push(data);
    done();
  })
  ;
pipe
  .distinct('$.b')
  .select('$.b')
  .pipe(function(data, done){
    console.log('distinct.b: ', data);
    this.push(data);
    done();
  })
  ;
//*/
pipe
  .log('distinct')
  ;

pipe
  .pick('$.a')
  .pick('$.b')
  .log('truthy: ')
  ;

pipe
  .pick('!($.a) || (!$.b)')
  .log('falsy: ')
  ;

pipe
  .pick('!($.a && $.b)')
  .log('xor: ')
  ;

pipe
  .select('$ => {c: $.a || $.b, d: $.b || $.a, e: $.a + $.b}')
  .log('select: ')
  ;

agg.data({a: 0, b: 0});
//*
agg.data({a: 0, b: 1});
agg.data({a: 1, b: 0});
agg.data({a: 1, b: 1});
agg.data({a: 3, b: 0});
agg.data({a: 3, b: 1});
agg.data({a: 2, b: 0});
agg.data({a: 2, b: 1});
//*/
