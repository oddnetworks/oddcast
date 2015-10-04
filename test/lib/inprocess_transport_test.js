'use strict';

var test = require('tape');
var sinon = require('sinon');

var shared = require('../shared');
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
	Object.freeze(lets);
	t.end();
});

test('spam channel with handler', function (t) {
	t.plan(4);
	var payload = {};
	var async = false;

	var handler = sinon.spy(function (arg) {
		t.equal(arg, payload);
		t.ok(handler.calledWithExactly(payload));
		t.ok(async, 'ran async');
	});

	lets.spamChannel.observe({channel: 'spam', event: 1}, handler);
	var rv = lets.spamChannel.broadcast({channel: 'spam', event: 1}, payload);
	t.equal(rv, true);
	async = true;
});

test('spam channel with many handlers', function (t) {
	t.plan(4);
	var payload = {};

	var handler1 = sinon.spy(function (arg) {
		t.equal(arg, payload);
		t.ok(handler1.calledWithExactly(payload));
	});

	var handler2 = sinon.spy(function (arg) {
		t.equal(arg, payload);
		t.ok(handler2.calledWithExactly(payload));
	});

	lets.spamChannel.observe({channel: 'spam', event: 2}, handler1);
	lets.spamChannel.observe({channel: 'spam', event: 2}, handler2);
	lets.spamChannel.broadcast({channel: 'spam', event: 2}, payload);
});

test('spam channel called without handler', function (t) {
	t.plan(2);
	var handler = sinon.spy();

	lets.spamChannel.observe({channel: 'spam', event: 'foo'}, handler);
	var rv = lets.spamChannel.broadcast({channel: 'spam', event: 3}, {});
	t.equal(rv, false);
	setTimeout(function () {
		t.equal(handler.callCount, 0);
	}, 20);
});

test('spam channel add and remove handler', function (t) {
	t.plan(4);
	var handler = sinon.spy();

	lets.spamChannel.observe({channel: 'spam', event: 4}, handler);
	lets.spamChannel.broadcast({channel: 'spam', event: 4}, {});

	setTimeout(function () {
		t.equal(handler.callCount, 1);
		var removed = lets.spamChannel.removeObserver({channel: 'spam', event: 4}, handler);
		t.equal(removed, true);
		var rv = lets.spamChannel.broadcast({channel: 'spam', event: 4}, {});
		t.equal(rv, false);

		setTimeout(function () {
			t.equal(handler.callCount, 1);
		}, 20);
	}, 20);
});

test('spam channel with an error in a handler', function (t) {
	t.plan(2);

	var err = new shared.TestError('observer handler error');
	var handler = sinon.spy(function () {
		throw err;
	});

	lets.spamChannel.observe({channel: 'spam', event: 5}, handler);
	var rv = lets.spamChannel.broadcast({channel: 'spam', event: 5}, {});
	t.equal(rv, true);

	lets.spamChannel.on('error', function (e) {
		t.equal(e, err);
	});
});

test('command channel with handler', function (t) {
	t.plan(4);
	var payload = {};
	var async = false;

	var handler = sinon.spy(function (arg) {
		t.equal(arg, payload);
		t.ok(handler.calledWithExactly(payload));
		t.ok(async, 'ran async');
	});

	lets.commandChannel.addHandler({channel: 'command', event: 1}, handler);
	var rv = lets.commandChannel.send({channel: 'command', event: 1}, payload);
	t.equal(rv, true);
	async = true;
});

test('command channel with many handlers', function (t) {
	t.plan(5);
	var payload = {};
	var handler1;
	var handler2;

	handler1 = sinon.spy(function (arg) {
		t.equal(arg, payload);
		t.ok(handler1.calledWithExactly(payload));
		setTimeout(function () {
			t.equal(handler2.callCount, 0);
		}, 20);
	});

	handler2 = sinon.spy(function (arg) {
		t.equal(arg, payload);
		t.ok(handler1.calledWithExactly(payload));
		setTimeout(function () {
			t.equal(handler1.callCount, 0);
		}, 20);
	});

	var isset1 = lets.commandChannel.addHandler({channel: 'command', event: 2}, handler1);
	t.equal(isset1, true);

	var isset2 = lets.commandChannel.addHandler({channel: 'command', event: 2}, handler2);
	t.equal(isset2, true);

	lets.commandChannel.send({channel: 'command', event: 2}, payload);
});

test('command channel called without handler', function (t) {
	t.plan(2);
	var handler = sinon.spy();

	lets.commandChannel.addHandler({channel: 'command', event: 'foo'}, handler);
	var rv = lets.commandChannel.send({channel: 'command', event: 3}, {});
	t.equal(rv, false);
	setTimeout(function () {
		t.equal(handler.callCount, 0);
	}, 20);
});

test('command channel add and remove handler', function (t) {
	t.plan(4);
	var handler = sinon.spy();

	lets.commandChannel.addHandler({channel: 'command', event: 4}, handler);
	lets.commandChannel.send({channel: 'command', event: 4}, {});

	setTimeout(function () {
		t.equal(handler.callCount, 1);
		var removed = lets.commandChannel.removeHandler({channel: 'command', event: 4}, handler);
		t.equal(removed, true);
		var rv = lets.commandChannel.send({channel: 'command', event: 4}, {});
		t.equal(rv, false);

		setTimeout(function () {
			t.equal(handler.callCount, 1);
		}, 20);
	}, 20);
});

test('command channel with an error in a handler', function (t) {
	t.plan(2);

	var err = new shared.TestError('command handler error');
	var handler = sinon.spy(function () {
		throw err;
	});

	lets.commandChannel.addHandler({channel: 'command', event: 5}, handler);
	var rv = lets.commandChannel.send({channel: 'command', event: 5}, {});
	t.equal(rv, true);

	lets.commandChannel.on('error', function (e) {
		t.equal(e, err);
	});
});
