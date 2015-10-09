'use strict';

var test = require('tape');
var sinon = require('sinon');

var shared = require('../shared');
var oddcast = require('../../');
var inprocessTransport = require('../../lib/inprocess_transport');

var lets = Object.create(null);

test('before all', function (t) {
	lets.broadcastChannel = oddcast.newBroadcastChannel();
	lets.broadcastChannel.use({channel: 'broadcast'}, inprocessTransport);
	lets.commandChannel = oddcast.newCommandChannel();
	lets.commandChannel.use({channel: 'command'}, inprocessTransport);
	lets.requestChannel = oddcast.newRequestChannel();
	lets.requestChannel.use({channel: 'request'}, inprocessTransport);
	Object.freeze(lets);
	t.end();
});

test('broadcast channel with handler', function (t) {
	t.plan(5);
	var payload = {};
	var async = false;

	var handler = sinon.spy(function (arg) {
		t.equal(arg, payload, 'got payload');
		t.ok(handler.calledWithExactly(payload), 'exact payload');
		t.ok(async, 'ran async');
	});

	lets.broadcastChannel.observe({channel: 'broadcast', event: 1}, handler)
		.then(function (isset) {
			t.equal(isset, true, 'isset');
		});

	lets.broadcastChannel.broadcast({channel: 'broadcast', event: 1}, payload)
		.then(function (success) {
			t.equal(success, true, 'success');
		});

	async = true;
});

test('broadcast channel with many handlers', function (t) {
	t.plan(7);
	var payload = {};

	var handler1 = sinon.spy(function (arg) {
		t.equal(arg, payload);
		t.ok(handler1.calledWithExactly(payload));
	});

	var handler2 = sinon.spy(function (arg) {
		t.equal(arg, payload);
		t.ok(handler2.calledWithExactly(payload));
	});

	lets.broadcastChannel.observe({channel: 'broadcast', event: 2}, handler1)
		.then(function (isset) {
			t.equal(isset, true, 'isset 1');
		});
	lets.broadcastChannel.observe({channel: 'broadcast', event: 2}, handler2)
		.then(function (isset) {
			t.equal(isset, true, 'isset 2');
		});

	lets.broadcastChannel.broadcast({channel: 'broadcast', event: 2}, payload)
		.then(function (success) {
			t.equal(success, true, 'success');
		});
});

test('broadcast channel called without handler', function (t) {
	t.plan(2);
	var handler = sinon.spy();

	lets.broadcastChannel.observe({channel: 'broadcast', event: 'foo'}, handler);

	lets.broadcastChannel.broadcast({channel: 'broadcast', event: 3}, {})
		.then(function (success) {
			t.equal(success, false, 'success');
		});

	setTimeout(function () {
		t.equal(handler.callCount, 0, 'count');
	}, 20);
});

test('broadcast channel add and remove handler', function (t) {
	t.plan(4);
	var handler = sinon.spy();

	lets.broadcastChannel.observe({channel: 'broadcast', event: 4}, handler);
	lets.broadcastChannel.broadcast({channel: 'broadcast', event: 4}, {});

	setTimeout(function () {
		t.equal(handler.callCount, 1, 'first call count');
		lets.broadcastChannel.removeObserver({channel: 'broadcast', event: 4}, handler)
			.then(function (removed) {
				t.equal(removed, true, 'removed');
				lets.broadcastChannel.broadcast({channel: 'broadcast', event: 4}, {})
					.then(function (success) {
						t.equal(success, false, 'success');
					});
			});

		setTimeout(function () {
			t.equal(handler.callCount, 1, 'last call caount');
		}, 20);
	}, 20);
});

test('broadcast channel with an error in a handler', function (t) {
	t.plan(2);

	var err = new shared.TestError('observer handler error');
	var handler = sinon.spy(function () {
		throw err;
	});

	lets.broadcastChannel.observe({channel: 'broadcast', event: 5}, handler);

	lets.broadcastChannel.broadcast({channel: 'broadcast', event: 5}, {})
		.then(function (success) {
			t.equal(success, true, 'success');
		});

	lets.broadcastChannel.on('error', function (e) {
		t.equal(e, err, 'error');
	});
});

test('command channel with handler', function (t) {
	t.plan(5);
	var payload = {};
	var async = false;

	var handler = sinon.spy(function (arg) {
		t.equal(arg, payload, 'payload');
		t.ok(handler.calledWithExactly(payload), 'exact payload');
		t.ok(async, 'ran async');
	});

	lets.commandChannel.addHandler({channel: 'command', event: 1}, handler)
		.then(function (isset) {
			t.equal(isset, true, 'isset');
		});

	lets.commandChannel.send({channel: 'command', event: 1}, payload)
		.then(function (success) {
			t.equal(success, true, 'success');
		});

	async = true;
});

test('command channel with many handlers', function (t) {
	t.plan(4);
	var payload = {};
	var handler1;
	var handler2;

	handler1 = sinon.spy(function (arg) {
		t.equal(arg, payload, 'got payload');
		setTimeout(function () {
			t.equal(handler2.callCount, 0, 'count handler2');
		}, 20);
	});

	handler2 = sinon.spy(function (arg) {
		t.equal(arg, payload, 'got payload');
		setTimeout(function () {
			t.equal(handler1.callCount, 0, 'count handler1');
		}, 20);
	});

	lets.commandChannel.addHandler({channel: 'command', event: 2}, handler1)
		.then(function (isset) {
			t.equal(isset, true, 'isset');
		});

	lets.commandChannel.addHandler({channel: 'command', event: 2}, handler2)
		.then(function (isset) {
			t.equal(isset, true, 'isset');
		});

	lets.commandChannel.send({channel: 'command', event: 2}, payload);
});

test('command channel called without handler', function (t) {
	t.plan(2);
	var handler = sinon.spy();

	lets.commandChannel.addHandler({channel: 'command', event: 'foo'}, handler);

	lets.commandChannel.send({channel: 'command', event: 3}, {})
		.then(function (success) {
			t.equal(success, false, 'success');
		});

	setTimeout(function () {
		t.equal(handler.callCount, 0, 'count');
	}, 20);
});

test('command channel add and remove handler', function (t) {
	t.plan(4);
	var handler = sinon.spy();

	lets.commandChannel.addHandler({channel: 'command', event: 4}, handler);
	lets.commandChannel.send({channel: 'command', event: 4}, {});

	setTimeout(function () {
		t.equal(handler.callCount, 1);
		lets.commandChannel.removeHandler({channel: 'command', event: 4}, handler)
			.then(function (removed) {
				t.equal(removed, true, 'removed');
				lets.commandChannel.send({channel: 'command', event: 4}, {})
					.then(function (success) {
						t.equal(success, false, 'success');
					});
			});

		setTimeout(function () {
			t.equal(handler.callCount, 1, 'count');
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
	lets.commandChannel.send({channel: 'command', event: 5}, {})
		.then(function (success) {
			t.equal(success, true, 'success');
		});

	lets.commandChannel.on('error', function (e) {
		t.equal(e, err, 'error');
	});
});

test('request channel with handler', function (t) {
	t.plan(5);
	var payload = {payload: true};
	var response = {response: true};
	var async = false;

	var handler = sinon.spy(function (arg) {
		t.equal(arg, payload, 'payload');
		t.ok(handler.calledWithExactly(payload), 'exact payload');
		t.ok(async, 'ran async');
		return response;
	});

	lets.requestChannel.registerHandler({channel: 'request', event: 1}, handler)
		.then(function (isset) {
			t.equal(isset, true, 'isset');
		});

	lets.requestChannel.request({channel: 'request', event: 1}, payload)
		.then(function (res) {
			t.equal(res, response, 'response');
		});

	async = true;
});

test('request channel with many handlers', function (t) {
	t.plan(4);
	var payload = {};
	var handler;
	var response = {};

	handler = sinon.spy(function (arg) {
		t.equal(arg, payload, 'got payload');
		return response;
	});

	lets.requestChannel.registerHandler({channel: 'request', event: 2}, handler)
		.then(function (isset) {
			t.equal(isset, true, 'isset');
		});

	lets.requestChannel.registerHandler({channel: 'request', event: 2}, function () {})
		.then(function (isset) {
			t.equal(isset, false, 'not isset');
		});

	lets.requestChannel.request({channel: 'request', event: 2}, payload)
		.then(function (res) {
			t.equal(res, response, 'response');
		});
});

test('request with Promise result', function (t) {
	t.plan(1);
	var response = {};

	var handler = sinon.spy(function () {
		return Promise.resolve(response);
	});

	lets.requestChannel.registerHandler({channel: 'request', event: 3}, handler);

	lets.requestChannel.request({channel: 'request', event: 3})
		.then(function (res) {
			t.equal(res, response, 'response');
		});
});

test('request channel called without handler', function (t) {
	t.plan(3);
	var handler = sinon.spy();
	var callback = sinon.spy();

	lets.requestChannel.registerHandler({channel: 'request', event: 'foo'}, handler);

	lets.requestChannel.request({channel: 'request', event: 4}, {})
		.then(callback)
		.catch(oddcast.errors.NotFoundError, function (err) {
			t.equal(err.message, 'No handler for the requested pattern.');
		});

	setTimeout(function () {
		t.equal(handler.callCount, 0, 'handler count');
		t.equal(callback.callCount, 0, 'callback count');
	}, 20);
});

test('request channel add and remove handler', function (t) {
	t.plan(5);
	var handler = sinon.spy();
	var callback = sinon.spy();

	lets.requestChannel.registerHandler({channel: 'request', event: 5}, handler);
	lets.requestChannel.request({channel: 'request', event: 5}, {});

	setTimeout(function () {
		t.equal(handler.callCount, 1);
		lets.requestChannel.unregisterHandler({channel: 'request', event: 5}, handler)
			.then(function (removed) {
				t.equal(removed, true, 'removed');
				lets.requestChannel.request({channel: 'request', event: 5}, {})
					.then(callback)
					.catch(oddcast.errors.NotFoundError, function (err) {
						t.equal(err.message, 'No handler for the requested pattern.');
					});
			});

		setTimeout(function () {
			t.equal(handler.callCount, 1, 'handler count');
			t.equal(callback.callCount, 0, 'callback count');
		}, 20);
	}, 20);
});

test('requeset channel with an error in a handler', function (t) {
	t.plan(2);

	var err = new shared.TestError('request handler error');
	var handler = sinon.spy(function () {
		throw err;
	});
	var callback = sinon.spy();

	lets.requestChannel.registerHandler({channel: 'request', event: 6}, handler);
	lets.requestChannel.request({channel: 'request', event: 6}, {})
		.then(callback)
		.catch(shared.TestError, function (e) {
			t.equal(e, err, 'error');
			t.equal(callback.callCount, 0, 'callback count');
		});
});
