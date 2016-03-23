Oddcast
=======
> An event broadcast and queue API for Node.js.

[![NPM][npm-banner]][npm-banner-url]

[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Dependency Status][david-badge]][david-url]

### Why?
See the short [manifesto](#manifesto) below.

Quick Start
-----------
Oddcast exposes event channel communication through an Event Bus, simply called "Bus".

So so assume __component A__ is an npm package used for data storage. You'd do this:
```js
exports.initialize = function (bus) {
  const datastore = require('some-datastore-api');
  const promisifiedStore = datastore.initializePromisified();

  bus.commandHandler({role: 'datastore', cmd: 'createRecord'}, function (payload) {
    return promisifiedStore.create(payload).then(function (res) {
      payload.id = res.id;
      return payload;
    });
  });

  bus.queryHandler({role: 'datastore', cmd: 'fetchRecord'}, function (args) {
    return promisifiedStore.fetch({id: args.id});
  });

  //
  // If it's easier, you can use callbacks instead of Promises.
  //
  const store = datastore.initialize();

  bus.commandHandler({role: 'datastore', cmd: 'createRecord'}, function (payload, next) {
    store.create(payload, function (err, res) {
      if (err) {
        return next(err);
      }
      payload.id = res.id;
      next(null, payload);
    });
  });

  bus.queryHandler({role: 'datastore', cmd: 'fetchRecord'}, function (args, next) {
    store.fetch(payload, next);
  });
};
```

And, assume __component B__ is an node.js module used for logging in your app. You'd do this:
```js
exports.initialize = function (bus) {

  bus.observe({role: 'datastore'}, function (action) {
    console.log(action.pattern);
    // outputs {role: 'datastore', cmd: 'createRecord'}
    // or {role: 'datastore', cmd: 'fetchRecord'}
    if (action.error) {
      console.log('resulted in error');
    } else {
      console.log('resulted in success');
    }
  });
};
```

And then, in your app, you'd do this:
```js
const oddcast = require('oddcast');
const bus = oddcast.bus();

// You could hook up any compliant transport to the bus channels, but here we
// just use the built in InprocessTransport which will suit most use cases.
bus.events.use({}, oddcast.inprocessTransport());
bus.commands.use({}, oddcast.inprocessTransport());
bus.requests.use({}, oddcast.inprocessTransport());

// Require the store component above ^ and initialize it
require('my-store-component').initialize(bus);

// Require the logging component and initialize it
require('my-logging-component').initialize(bus);

const myDog = {type: 'Dog', sound: 'ruff, ruff'};

// Send a command (operations which change state)
bus.sendCommand({role: 'datastore', cmd: 'createRecord'}, myDog)
  .then(function (res) {
    console.log(`My dog ${res.name} was saved at ${res.id}.`);
  })
  .catch(function (err) {
    console.error('There was an error saving my dog:');
    console.error(err.stack);
  });

// Send a query (operations which only read state)
bus.query({role: 'datastore', cmd: 'fetchRecord'}, {id: 'foo-123'})
  .then(function (res) {
    console.log(`got record ${res.id}`);
  })
  .catch(function (err) {
    console.error('There was fetching record "foo-123":');
    console.error(err.stack);
  });
```

### Events Channel
An Events Channel broadcasts events throughout the system to anyone who might be listening. This is the typical event system we've seen in JavaScript applications for many years.

```js
var oddcast = require('oddcast');
var transport = require('my-transport');
var events = oddcast.eventChannel();
events.use({role: 'store'}, transport({
    url: 'http://mypubsub.io/channel/1'
  }));

events.observe({role: 'store', op: 'write', type: 'video'}, function (args) {
  writeIndexRecord(args.entity.key, args.entity);
});

//
// And in some other code, somewhere else ...
//
var oddcast = require('oddcast');
var transport = require('my-transport');
var events = oddcast.eventChannel();
events.use({role: 'store'}, transport({
    url: 'http://mypubsub.io/channel/1'
  }));

// When a record is saved to the datastore, we broadcast it.
events.broadcast({
    role: 'store',
    type: entity.type,
    op: 'write',
    entity: entity
  });
```


API
---
### Bus
TODO

### Event Channel
#### EventChannel#broadcast(pattern, payload)
Broadcast an event on the underlying event transport. Sending a payload is optional.

If there is no transport for the event, an `oddcast.errors.NoTransportError` will be thrown.

#### EventChannel#observe(pattern, handler)
Register a handler function to handle events from the underlying transport matching the given pattern.

Handler errors will be emitted by the CommandChannel instance as error events, so make sure your program is handling them.

#### EventChannel#remove(pattern, handler)
Remove the receive handler at the given pattern. The pattern needs to be exactly the same as that used in #receive(). If a handler is not passed in, then all handlers on the given pattern will be removed.

#### EventChannel#use(pattern, transport)
Register a transport to use at the given pattern.

Any messages sent via #broadcast() which do not match this pattern will not be passed to this transport.

Any messages received by this transport which do not match this pattern will not be passed to the handlers.

### Command Channel
#### CommandChannel#send(pattern, payload)
Send a message on the underlying command transport. A payload is required.

If there is no transport for the command, an `oddcast.errors.NoTransportError` will be thrown.

#### CommandChannel#receive(pattern, handler)
Register a handler function to handle messages from the underlying transport matching the given pattern. If there is already a handler for the pattern, an `Error` will be thrown, as duplicate handlers should not be allowed on the same pattern for a Command Channel.

The handler should return a Promise which resolves to `true` if the handler operation succeeded. If not, the handler should return a Promise which rejects with an Error explaining why it failed.

Handler failures will be emitted by the CommandChannel instance as error events, so make sure your program is handling them.

#### CommandChannel#remove(pattern)
Remove the receive handler at the given pattern. The pattern needs to be exactly the same as that used in #receive().

#### CommandChannel#use(pattern, transport)
Register a transport to use at the given pattern. Registering more than one transport on the same pattern will throw an Error.

Any messages sent via #send() which do not match this pattern will not be passed to this transport.

Any messages received by this transport which do not match this pattern will not be passed to the handlers.

### Request Channel
#### RequestChannel#request(pattern, payload)
Send a request on the underlying request transport. Sending a payload is optional.

Returns a Promise for the result from the receiving handler. If there was no handler registered to receive the request at the given pattern, the returned promise will be rejected with `oddcast.errors.NotFoundError`.

If there is no transport for the request, an `oddcast.errors.NoTransportError` will be thrown.

#### RequestChannel#respond(pattern, handler)
Register a handler function to respond to requests from the underlying transport matching the given pattern. If there is already a handler for the pattern, a plain `Error` will be thrown, as duplicate handlers should not be allowed on the same pattern for a Request Channel.

Handler failures will be emitted by the CommandChannel instance as error events, so make sure your program is handling them.

#### RequestChannel#remove(pattern)
Remove the respond handler at the given pattern. The pattern needs to be exactly the same as that used in #respond().

#### RequestChannel#use(pattern, transport)
Register a transport to use at the given pattern. Registering more than one transport on the same pattern will throw an Error.

Any requests sent via #request() which do not match this pattern will not be passed to this transport.

Any requests received by this transport which do not match this pattern will not be passed to the handlers.

Manifesto
---------
We all know that a small component will fit into your brain easier than an entire system.

We've been using model-view-controller to "componentize" our systems for almost 30 years. The thing is, MVC does not really accomplish that goal, and neither does Object Oriented programming for that matter.

Instead of MVC, consider command/query responsibility segregation ([CQRS](http://martinfowler.com/bliki/CQRS.html)). In CQRS commands are operations which write our data while queries are operations which read our data. Most importantly, the logic for commands and queries should never mix.

When a command is sent into the system it arrives in a component which understands how the data should be structured and how to persist it. Once your command component has written the data, it will broadcast successful create, update, and delete events to the rest of the system without caring about who might be listening.

Separate view components then listen for those data changes broadcasted by the command receiving components and take appropriate action to maintain only the views which they are responsible for.

To make all this work, you need an asynchronous communication mechanism to send messages between components in your system. This communication is where Oddcast comes in.

Copyright and License
---------------------
Copyright: (c) 2015 by Odd Networks Inc. (http://oddnetworks.co)

Unless otherwise indicated, all source code is licensed under the MIT license. See MIT-LICENSE for details.

[npm-banner]: https://nodei.co/npm/oddcast.png?downloads=true
[npm-banner-url]: https://nodei.co/npm/oddcast/
[npm-badge]: https://badge.fury.io/js/oddcast.svg
[npm-url]: https://badge.fury.io/js/oddcast
[travis-badge]: https://api.travis-ci.org/oddnetworks/oddcast.svg
[travis-url]: https://travis-ci.org/oddnetworks/oddcast
[david-badge]: https://david-dm.org/oddnetworks/oddcast.svg
[david-url]: https://david-dm.org/oddnetworks/oddcast
