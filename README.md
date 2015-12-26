Oddcast
=======
> An event broadcast and queue API for Node.js.

[![NPM][npm-banner]][npm-banner-url]

[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Dependency Status][david-badge]][david-url]

Summary
-------
We all know that a small component will fit into your brain easier than an entire system.

We've been using model-view-controller to "componentize" our systems for almost 30 years. The thing is, MVC does not really accomplish that goal, and neither does Object Oriented programming for that matter.

Instead of MVC, consider command/query responsibility segregation ([CQRS](http://martinfowler.com/bliki/CQRS.html)). In CQRS commands are operations which write our data while queries are operations which read our data. Most importantly, the logic for commands and queries should never mix.

When a command is sent into the system it arrives in a component which understands how the data should be structured and how to persist it. Once your command component has written the data, it will broadcast successful create, update, and delete events to the rest of the system without caring about who might be listening.

Separate view components then listen for those data changes broadcasted by the command receiving components and take appropriate action to maintain only the views which they are responsible for.

To make all this work, you need an asynchronous communication mechanism to send messages between components in your system. This communication is where Oddcast comes in.

Quick Start
-----------
Oddcast supports 3 kinds of messages: **Broadcast**, **Command**, and **Request**. To use them you create a channel for the one you want, and give it a transport which supports the channel type under the covers.

### Broadcast Channel
A Broadcast Channel broadcasts events throughout the system to anyone who might be listening. This is the typical event system we've seen in JavaScript applications for many years.

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

### Command Channel
A Command Channel is used for directed messages, with the expectation that the receiving component will take a specified action. The underlying transport under a command channel will usually be a message queue.

```js
var oddcast = require('oddcast');
var transport = require('my-transport');
var commands = oddcast.commandChannel();
commands.use({role: 'ingest'}, transport({
    url: 'http://myqueue.io/queue/1'
  }));

commands.receive({role: 'ingest', type: 'video'}, function (args) {
  var entity = transformItem(args.item);
  var promise = saveEntity(entity).then(function () {
    // We return true so the queue knows this message has been processed.
    return true;
  })
  .catch(function (err) {
    log.error(err);
    // We return false so the queue will keep this message and try
    // sending it again.
    return false;
  });

  return promise;
});

//
// And in some other code, somewhere else ...
//
var oddcast = require('oddcast');
var transport = require('my-transport');
var commands = oddcast.commandChannel();
commands.use({role: 'ingest'}, transport({
    url: 'http://myqueue.io/queue/1'
  }));

// Fetch data from a remote API and queue it up for the store
// by sending off a "job" for each one.
items.forEach(function (item) {
  commands.send({role: 'ingest', type: item.type, item: item});
});

```

### Request Channel
A Request Channel is used when you know who has the data you need, and would like to request it from them.
```js
var oddcast = require('oddcast');
var transport = require('my-transport');
var rchannel = oddcast.requestChannel();
rchannel.use({role: 'views'}, transport({
    host: '0.0.0.0',
    port: 8080
  }));

rchannel.respond({view: 'homePage'}, function () {
  return {
    featuredVideo: getFeaturedVideo(),
    recentlyAdded: getRecentlyAdded(),
    season: getShowSeason()
  };
});

//
// And in some other code, somewhere else ...
//
var oddcast = require('oddcast');
var transport = require('my-transport');
var rchannel = oddcast.requestChannel();
rchannel.use({role: 'views'}, transport({
    url: 'http://mymicroservice.io:8080/endpoint/1'
  }));

// Respond to an HTTP request by querying your view.
Router.get('/', function (req, res) {
  rchannel
    .request({role: views, view: 'homePage'})
    .then(function (viewData) {
      res.render('homePage.html', viewData);
    });
});
```

API
---
### Event Channel
#### #broadcast(pattern, payload)
Broadcast an event on the underlying event transport. Sending a payload is optional.

If there is no transport for the event, an `oddcast.errors.NoTransportError` will be thrown.

#### #observe(pattern, handler)
Register a handler function to handle events from the underlying transport matching the given pattern.

Handler errors will be emitted by the CommandChannel instance as error events, so make sure your program is handling them.

#### #remove(pattern, handler)
Remove the receive handler at the given pattern. The pattern needs to be exactly the same as that used in #receive(). If a handler is not passed in, then all handlers on the given pattern will be removed.

#### #use(pattern, transport)
Register a transport to use at the given pattern.

Any messages sent via #broadcast() which do not match this pattern will not be passed to this transport.

Any messages received by this transport which do not match this pattern will not be passed to the handlers.

### Command Channel
#### #send(pattern, payload)
Send a message on the underlying command transport. A payload is required.

If there is no transport for the command, an `oddcast.errors.NoTransportError` will be thrown.

#### #receive(pattern, handler)
Register a handler function to handle messages from the underlying transport matching the given pattern. If there is already a handler for the pattern, an `Error` will be thrown, as duplicate handlers should not be allowed on the same pattern for a Command Channel.

The handler should return a Promise which resolves to `true` if the handler operation succeeded. If not, the handler should return a Promise which rejects with an Error explaining why it failed.

Handler failures will be emitted by the CommandChannel instance as error events, so make sure your program is handling them.

#### #remove(pattern)
Remove the receive handler at the given pattern. The pattern needs to be exactly the same as that used in #receive().

#### #use(pattern, transport)
Register a transport to use at the given pattern. Registering more than one transport on the same pattern will throw an Error.

Any messages sent via #send() which do not match this pattern will not be passed to this transport.

Any messages received by this transport which do not match this pattern will not be passed to the handlers.

### Request Channel
#### #request(pattern, payload)
Send a request on the underlying request transport. Sending a payload is optional.

Returns a Promise for the result from the receiving handler. If there was no handler registered to receive the request at the given pattern, the returned promise will be rejected with `oddcast.errors.NotFoundError`.

If there is no transport for the request, an `oddcast.errors.NoTransportError` will be thrown.

#### #respond(pattern, handler)
Register a handler function to respond to requests from the underlying transport matching the given pattern. If there is already a handler for the pattern, a plain `Error` will be thrown, as duplicate handlers should not be allowed on the same pattern for a Request Channel.

Handler failures will be emitted by the CommandChannel instance as error events, so make sure your program is handling them.

#### #remove(pattern)
Remove the respond handler at the given pattern. The pattern needs to be exactly the same as that used in #respond().

#### #use(pattern, transport)
Register a transport to use at the given pattern. Registering more than one transport on the same pattern will throw an Error.

Any requests sent via #request() which do not match this pattern will not be passed to this transport.

Any requests received by this transport which do not match this pattern will not be passed to the handlers.

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
