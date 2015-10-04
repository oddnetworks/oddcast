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
	t.plan(4);
	var payload = {};
	var async = false;

	var handler = sinon.spy(function (arg) {
		t.equal(arg, payload);
		t.ok(handler.calledWithExactly(payload));
		t.ok(async, 'ran async');
	});

	lets.spamChannel.observe({channel: 'spam', event: 'foo'}, handler);
	var rv = lets.spamChannel.broadcast({channel: 'spam', event: 'foo'}, payload);
	t.equal(rv, true);
	async = true;
});

test('spam channel called without handler', function (t) {
	t.plan(2);
	var handler = sinon.spy();

	lets.spamChannel.observe({channel: 'spam', event: 'foo'}, handler);
	var rv = lets.spamChannel.broadcast({channel: 'spam', event: 'bar'}, {});
	t.equal(rv, false);
	setTimeout(function () {
		t.equal(handler.callCount, 0);
	}, 20);
});
