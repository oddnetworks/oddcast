Oddcast
=======
> An event broadcast and queue API for Node.js.

[![NPM][npm-banner]][npm-banner-url]

[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Coverage Status][coveralls-badge]][coveralls-status]
[![Dependency Status][david-badge]][david-url]

Summary
-------
A small component of a system will fit into your brain better than the entire system. That is a statement of fact.

We've been using model-view-controller to "componentize" our systems for almost 30 years. The thing is, MVC does not really accomplish the componentization goal. Neither does Object Oriented programming for that matter.

Instead of MVC, consider command/query responsibility segregation ([CQRS](http://martinfowler.com/bliki/CQRS.html)). In CQRS commands are operations which write our data while queries are operations which read our data. Most importantly, the logic for commands and queries should never mix.

When a command is sent into the system, there will be a single component that will understand how the data should be structured and will persist it. This is not any different than the models in MVC. But, once your command component has written the data, it will then broadcast successful create, update, and delete events to the rest of the system, without caring about who might be listening. Separate view components then listen for those data changes broadcasted by the command components and take appropriate action to maintain only the view which it is responsible for.

The whole point of command query responsibility segregation is the "segregation". Commands are kind of like models that only write. Views are not really models at all, but a combination of indexes and queries. So your read components are separated from your write components making it easier to reason about the responsibilities contained in each.

To make all this work, you need an asynchronous communication mechanism to send messages between components in your system. This communication is where Oddcast comes in.

Quick Start
-----------
Oddcast supports 3 kinds of messages: **Broadcast**, **Command**, and **Request**. To use them you create a channel for the one you want, and give it a transport to use under the covers.

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
[coveralls-badge]:https://coveralls.io/repos/oddnetworks/oddcast/badge.svg?branch=master&service=github
[coveralls-url]: https://coveralls.io/github/oddnetworks/oddcast?branch=master
[david-badge]: https://david-dm.org/oddnetworks/oddcast.svg
[david-url]: https://david-dm.org/oddnetworks/oddcast
