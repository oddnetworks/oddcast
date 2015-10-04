'use strict';

var test = require('tape');
var sinon = require('sinon');

var oddcast = require('../../');
var inprocessTransport = require('../../lib/inprocess_transport');

var lets = Object.create(null);

test('before all', function (t) {
  lets.spamChannel = oddcast.newSpamChannel();
  lets.spamChannel.use({channel: 'spam'}, inprocessTransport);
  lets.commandChannel = oddcast.newCommandChannel();
  lets.commandChannel.use({channel: 'command'}, inprocessTransport);
  lets.localChannel = oddcast.newLocalChannel();
  lets.localChannel.use({channel: 'local'}, inprocessTransport);
  lets.handlers = Object.create(null);
  Object.freeze(lets);
  t.end();
});

test('spam channel called once', function (t) {
  t.plan(3);
  var payload = {};
  var async = false;

  var handler = sinon.spy(function (arg) {
    t.equal(arg, payload);
    t.ok(handler.calledWithExactly(payload));
    t.ok(async, 'ran async');
  });

  lets.spamChannel.observe({channel: 'spam', event: 'foo'}, handler);
  lets.spamChannel.broadcast({channel: 'spam', event: 'foo'}, payload);
  async = true;
});
