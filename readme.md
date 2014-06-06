Aggregate.js - prototype 2
==========================

This documentation is not up to date to the latest changes.

Aggregate.js is a small and simple framework for aggregating, reducing, transforming JavaScript Array's.  It works in Node.js or in the Browser equally well.

Installation
-----------

With bower:
```
bower install aggregatejs
```

With npm:
```
npm install aggregatejs
```

Inspiration
-----------

As part of a project I needed a dynamic reporting system that could take raw data in, massage it, and output standard views (Charts, Graphs, Tables, etc...) from the data.

This meant that for each type of data that was coming into the system I had to write a translator for each particular view type.  That, or I had to make each viewer very complex to support all the different (and constantly changing) data types.

The one thing that was consistent was that the data coming in was always an array of objects or values.

I started looking at existing libraries that could achieve my desired result (Linq.js, lodash, sift.js, etc...) but quickly came to the conclusion that these libraries all had one thing in common; They were all for JavaScript only and had confusing API's to anyone not familar with JavaScript.  In order for my project to be useable I needed something that anyone could learn quickly, write easily, and was safe for user input (evaling JavaScript wasn't going to happen).

Linq.js has a very interesting ability to utilize Lambda Expressions from strings passed into its methods.  This intrigued me, and I started looking at what I really needed to do with such a pipeline style system.

Basically I just needed to be able to iterate over the source, transform it, and spit out a fitting format.  I also needed the API to be VERY simple!  No alias's to confuse users with multiple ways to do something, no unnecessary methods, and a simple syntax.

I went out and started looking at data aggregation systems currently in use within database systems (SQL, XPath, MongoDB's Aggregation System, etc...) and came up with my simplified list of actions that needed to be performed and then wrote Aggregate.js from there.

Prototype 1 - ???
-----------------

The current code base still uses some very slow methods for things like iterating over the source records in some browsers.  This should be considered a prototype as it does everything it should, but could be improved speed wise with some optimizations.

Improvements
------------

There are quite a bit of improvements that can be put into place when it come to the Pipelined version of the code.  Really once a step has started producing results those results can be piped directly into the next stage to begin working on them.  This would reduce the overall overhead when running a large dataset through a pipeline.  This is something I hope to get to eventually if I have time.  If nothing else it will be a good learning experience.

Options
=======

* disableLogger - Turns off the log function
* logger - A custom logger function

Methods
=======

It is worth noting that *ALL* methods are setup to be immutable.  That is they do not modify the data within the current instance of Aggregate (so you can always go back), instead they return a new Aggregate instance with a new working set.

**Note: Eventually I need to add examples to each and all of these.  Until I do, please check out the examples as they show usage examples for each.

Aggregate(records, options)
---------------------------

Aggregate.lambda
----------------

_records()
----------

Returns: Array of Records

This is a helper method to allow read access to the current working recordset.  This is used by all of the other mutate methods, and if you introduce new mutate methods you will probably use this as well.  It should be thought of as protected.  You should never use this to iterate over the working set of records, instead use the protected _each method with a proper callback.  This way when data pipelining is in place each can assure you are compatible.

_each(callback)
---------------

This is a helper method to perform the given callback on all records within the working set.  This is used by all of the other mutate methods, and if you introduce new mutate methods you will probably use this as well.  It should be thought of as protected.

log(value, value...)
--------------------

Log something to the custom Aggregate.options.logger method or console.log if available.

toArray()
---------

Returns: Array of Records

This method is used to return the current working set as a JavaScript Array.

count()
-------

Returns: Number

This method returns the count of records in the current working set.

newFrom(records)
----------------

Returns: Aggregate()

Creates a new instance of Aggregate and passes in all of the current options associated with the calling instance.  It also sets the lambda selfSymbol directive.

extend(deep, target, from, from...)
-----------------------------------

Returns: target

This helper method is used to create deep copies of Objects or Arrays.

pick(func)
----------

Returns: Aggregate()

Use the passed in function or Lambda Expression against the current working set.  For any record that returns a truthy value keep that record, for any record that returns a falsy value remove the record.  Returns a new Aggregate instance for the new working set.

select(func)
------------

Returns: Aggregate()

Used to transform all records within a working set.  Think of this as a "Select" statement in SQL or a "$project" statement in MongoDB's Aggregation Pipelines.

sort(func)
----------

Returns: Aggregate()

Used to sort the working set into a particular order.  Returning -1 means that A<B, > 0 means that A>B, and 0 means A===B.

mid(startValOrFunc, endValOrFunc)
---------------------------------

Returns: Aggregate()

Used to pull a subset of the current working set.  You can use absolute values (1, 2), JavaScript callbacks, or Lambda Expressions to set the start and end values.  This returns FROM START TO FINISH (inclusive).  IE: mid(2, 4) will return items 2 through 4.

distinct(func)
--------------

Returns: Aggregate()

Used to cull out duplicate records from a working set.  For each record in the working set func is called.  Func should return an identity for the record.  If the identity is not already known then the record is kept in the new instance.  If the identity is known, then the record is ignored.

mapReduce(mapper, reducer)
--------------------------

Returns: Aggregate()

This is a basic implementation of Map/Reduce, where for each record in the working set the mapper is executed and should return a normalized response (must be {key: Identity, value: whatever}).  The normalized responses are then aggregated up based on the key's and passed in groups to the reducer.  The reducer then takes these responses and performs a final operation against them.

This is easier shown than explained as the reducer in Aggregate only works with a single record at a time, yet still can reduce over the entire normalized working set.

In this example the following working set is passed in:
```
[{"val":10},{"val":9},{"val":8},{"val":7},{"val":6},{"val":5},{"val":4},{"val":3},{"val":2},{"val":1},{"val":0}]
```

To the following mapReduce statement:
```
mapReduce(
  "{key: $.val % 2?'odd':'even', value: [$.val]}",
  "key, curr, next => curr.concat(next)"
)
```

Resulting in a grouping of the records as either "odd" or "even":
```
[{"key":"even","values":[10,8,6,4,2,0]},{"key":"odd","values":[9,7,5,3,1]}]
```

unwind(field, [func])
------------

For all records in the working set, let func act as a selector to find an Array of items.  For the Array of items, extract out the values and store them into "field".  This basically takes a single record with an array of values and turns it into distinct records for each value.

Func is completely optional, but can be used to select out deeply nested children.

Starting with the ouput of the Map/Reduce example:
```
[{"key":"even","values":[10,8,6,4,2,0]},{"key":"odd","values":[9,7,5,3,1]}]
```

We can pipe it through unwind to turn the array of values into a list of numbers each knowing if they are odd or even:
```
unwind("values")
```

Results in:
```
[{"key":"even","values":10},{"key":"even","values":8},{"key":"even","values":6},{"key":"even","values":4},{"key":"even","values":2},{"key":"even","values":0},{"key":"odd","values":9},{"key":"odd","values":7},{"key":"odd","values":5},{"key":"odd","values":3},{"key":"odd","values":1}]
```

compilePipeline(source)
-----------------------

Take a Pipeline Script (see [examples/pipeline.html](https://github.com/jdarling/aggregate.js/blob/master/examples/pipeline.html)) and compile it for use later.  Returns a Function that takes three parameters; records, optional variables object, and an optional options object.

See [examples/pipeline.html](https://rawgithub.com/jdarling/aggregate.js/master/examples/pipeline.html) for more details.

executePipeline(source, records, variables, options)
----------------------------------------------------

Helper method to call compilePipeline and then execute the resulting program immediately.

See [examples/pipeline.html](https://rawgithub.com/jdarling/aggregate.js/master/examples/pipeline.html) for more details.

Pipeline Scripts
================

Pipeline Scripts are DSL's (Domain Specific Language) that are used to create Pipeline Programs that can later be executed.  The scripts can contain variables (using {{varname}}) within them that will be filled in when the program is run from the variables argument when the Pipeline Program is executed.  This way if you want to have some type of data entry or options form that is used when to provide values to your pipelines you don't have to rebuild them each time.

An example might be something as simple as:
```
pick("$.date > new Date({{startDate}})
```

Then you compile the script with:
```
var pipeline = Aggregate.compilePipeline(myScript)
```

And execute it with:
```
var today = new Date(); // Get the current date
today.setHours(0, 0, 0, 0); // Set it to midnight
pipeline(myArray, {date: today})
```

This would return the items from myArray with a date greater than today at midnight.

A note on variables, variable names are the first contiguous set of characters and numbers that do not contain a space.  Anything after the first space is ignored.  This way you can use them for things like building custom filters from the variable declarations.  See [examples/dynamicOptions.html](https://rawgithub.com/jdarling/aggregate.js/master/examples/dynamicOptions.html) for an example.

When you run a Pipeline Program it returns the last state of the program when it completed.  If the state is an Aggregate instance you will get back that instance, if the state is an Array you will get the Array, if it is a Number (say from Count) then you get the count.

Pipelines can also perform basic interactions with an Array once converted.  These actions must fit into the DSL of Pipeline Scripts.  An example is below:

```
var script =
    "pick(\"$>4 && $<9\")"+ // Get items with values between 5 and 8
    "log()"+ // Log it for fun
    "toArray()"+ // Conver the pipeline to a JavaScript Array
    "slice(1,3)" // Call the standard JavaScript slice method
    ;
var program = Aggregate.compilePipeline(script);
var result = program([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
console.log(result);
```

The output would be:
```
[6,7]
```

You can see this in action in the Pipeline Demo application ([examples/pipeline.html](https://rawgithub.com/jdarling/aggregate.js/master/examples/pipeline.html)) if you set the script to:
```
pick("$>4 && $<9")
log()
toArray()
slice(1, 3)
```

And then set the data to:
```
[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
```

Finally click run and the output (as expected) window will read:
```
Picked
[5,6,7,8]
typeof(response)
"object"
Output from pipeline:
[6,7]
```
