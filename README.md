Oddcast
=======
An event broadcast and queue API for Node.js.

Summary
-------
Software is easier to build and maintain when we only need to understand a small decoupled component at any given time rather than the whole system. Let's just make that assumption and call it a fact.

But the thing is, model-view-controller (MVC) does not really accomplish the goal of creating decoupled components. Neither does Object Oriented programming for that matter. Software design conversations usually result in bikeshedding about which behaviors should exist on which of our models, and how those models should be mashed together to make aggregate views.

Instead, we should be subscribing to the idea of command/query responsibility segregation ([CQRS](http://martinfowler.com/bliki/CQRS.html)). In CQRS commands are operations that usually write our data and queries are operations that read our data. The idea is that the logic for commands and queries should never mix.

When writing a command you need to understand how the data should be structured when written. Once you have validated the correct structure, you then broadcast successful create, update, and delete events on your data as they happen.

When you write a view you listen for the write events broadcasted by the command operations and take appropriate action to maintain your view. You only need to understand the relevant details about the structure of written data, and the requirements of the components which will be querying your view.

To make all this work, you need an asynchronous communication mechanism to send messages between components in your system.

Quick Start
-----------
Oddcast supports 3 kinds of messages: Spam, Command, and Request. To use them you create a channel for the one you want, and give it a transport to use under the covers.

### Spam Channel
A Spam Channel broadcasts events throughout the system to anyone who might be listening.
```JS
var oddcast = require('oddcast');
var spamChannel = oddcast.newSpamChannel();
var options = {};
spamChannel.use({comp: 'store'}, oddcast.processTransport, options);

spamChannel
  .observe({comp: 'store', type: 'video', operation: 'write'},
    function (args) {
      writeIndexRecord(args.key, args.entity);
    });

//
// And in some other code, somewhere else ...
//
var oddcast = require('oddcast');
var spamChannel = oddcast.newSpamChannel();
var options = {};
spamChannel.use({comp: 'store'}, oddcast.processTransport, options);

function onRecordSave(entity) {
  spamChannel
    .broadcast({comp: 'store', type: entity.type, operation: 'write'}, {
      key: entity.id,
      entity: entity
    });
}
```

### Command Channel
A Command Channel is used for directed messages, with the expectation that the receiving component will take a specified action. The underlying transport under a command channel will usually be a message queue.
```JS
var oddcast = require('oddcast');
var commandChannel = oddcast.newCommandChannel();
var options = {};
commandChannel.use({comp: 'ingest'}, oddcast.processTransport, options);

commandChannel.addHandler({comp: 'ingest', type: 'video'}, function (item) {
  var entity = transformItem(item);
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
var commandChannel = oddcast.newCommandChannel();
var options = {};
commandChannel.use({comp: 'ingest'}, oddcast.processTransport, options);

// Fetch data from a remote API and on the the response:
function onApiResponse(items) {
  items.forEach(function (item) {
    commandChannel.send({comp: 'ingest', type: 'video'}, item);
  });
}

```

### Request Channel
A Request Channel is used when you know who has the data you need, and would like to request it from them.
```JS
var oddcast = require('oddcast');
var requestChannel = oddcast.newRequestChannel();
var options = {};
requestChannel.use({comp: 'views'}, oddcast.processTransport, options);

requestChannel.registerHandler({comp: 'views', view: 'homePage'}, function () {
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
var requestChannel = oddcast.newRequestChannel();
var options = {};
requestChannel.use({comp: 'views'}, oddcast.processTransport, options);

Router.get('/', function (req, res) {
  requestChannel
    .request({comp: views, view: 'homePage'})
    .then(function (viewData) {
      res.render('homePage.html', viewData);
    });
});
```


Copyright and License
---------------------
Copyright: (c) 2015 by Odd Networks Inc. (http://oddnetworks.co)

Unless otherwise indicated, all source code is licensed under the MIT license. See MIT-LICENSE for details.
