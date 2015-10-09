'use strict';

var test = require('tape');
var sinon = require('sinon');

var shared = require('../shared');
var oddcast = require('../../');
var inprocessTransport = require('../../lib/inprocess_transport');

var lets = Object.create(null);

test('before all', function (t) {
	lets.events = oddcast.eventChannel();
	lets.events.use({channel: 'broadcast'}, inprocessTransport);
	lets.commands = oddcast.commandChannel();
	lets.commands.use({channel: 'command'}, inprocessTransport);
	lets.req = oddcast.requestChannel();
	lets.req.use({channel: 'request'}, inprocessTransport);
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

	lets.events.observe({channel: 'broadcast', event: 1}, handler)
		.then(function (isset) {
			t.equal(isset, true, 'isset');
		});

	lets.events.broadcast({channel: 'broadcast', event: 1}, payload)
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

	lets.events.observe({channel: 'broadcast', event: 2}, handler1)
		.then(function (isset) {
			t.equal(isset, true, 'isset 1');
		});
	lets.events.observe({channel: 'broadcast', event: 2}, handler2)
		.then(function (isset) {
			t.equal(isset, true, 'isset 2');
		});

	lets.events.broadcast({channel: 'broadcast', event: 2}, payload)
		.then(function (success) {
			t.equal(success, true, 'success');
		});
});

test('broadcast channel called without handler', function (t) {
	t.plan(2);
	var handler = sinon.spy();

	lets.events.observe({channel: 'broadcast', event: 'foo'}, handler);

	lets.events.broadcast({channel: 'broadcast', event: 3}, {})
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

	lets.events.observe({channel: 'broadcast', event: 4}, handler);
	lets.events.broadcast({channel: 'broadcast', event: 4}, {});

	setTimeout(function () {
		t.equal(handler.callCount, 1, 'first call count');
		lets.events.remove({channel: 'broadcast', event: 4}, handler)
			.then(function (removed) {
				t.equal(removed, true, 'removed');
				lets.events.broadcast({channel: 'broadcast', event: 4}, {})
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

	lets.events.observe({channel: 'broadcast', event: 5}, handler);

	lets.events.broadcast({channel: 'broadcast', event: 5}, {})
		.then(function (success) {
			t.equal(success, true, 'success');
		});

	lets.events.on('error', function (e) {
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

	lets.commands.receive({channel: 'command', event: 1}, handler)
		.then(function (isset) {
			t.equal(isset, true, 'isset');
		});

	lets.commands.send({channel: 'command', event: 1}, payload)
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

	lets.commands.receive({channel: 'command', event: 2}, handler1)
		.then(function (isset) {
			t.equal(isset, true, 'isset');
		});

	lets.commands.receive({channel: 'command', event: 2}, handler2)
		.then(function (isset) {
			t.equal(isset, true, 'isset');
		});

	lets.commands.send({channel: 'command', event: 2}, payload);
});

test('command channel called without handler', function (t) {
	t.plan(2);
	var handler = sinon.spy();

	lets.commands.receive({channel: 'command', event: 'foo'}, handler);

	lets.commands.send({channel: 'command', event: 3}, {})
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

	lets.commands.receive({channel: 'command', event: 4}, handler);
	lets.commands.send({channel: 'command', event: 4}, {});

	setTimeout(function () {
		t.equal(handler.callCount, 1);
		lets.commands.remove({channel: 'command', event: 4}, handler)
			.then(function (removed) {
				t.equal(removed, true, 'removed');
				lets.commands.send({channel: 'command', event: 4}, {})
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

	lets.commands.receive({channel: 'command', event: 5}, handler);
	lets.commands.send({channel: 'command', event: 5}, {})
		.then(function (success) {
			t.equal(success, true, 'success');
		});

	lets.commands.on('error', function (e) {
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

	lets.req.reply({channel: 'request', event: 1}, handler)
		.then(function (isset) {
			t.equal(isset, true, 'isset');
		});

	lets.req.request({channel: 'request', event: 1}, payload)
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

	lets.req.reply({channel: 'request', event: 2}, handler)
		.then(function (isset) {
			t.equal(isset, true, 'isset');
		});

	lets.req.reply({channel: 'request', event: 2}, function () {})
		.then(function (isset) {
			t.equal(isset, false, 'not isset');
		});

	lets.req.request({channel: 'request', event: 2}, payload)
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

	lets.req.reply({channel: 'request', event: 3}, handler);

	lets.req.request({channel: 'request', event: 3})
		.then(function (res) {
			t.equal(res, response, 'response');
		});
});

test('request channel called without handler', function (t) {
	t.plan(3);
	var handler = sinon.spy();
	var callback = sinon.spy();

	lets.req.reply({channel: 'request', event: 'foo'}, handler);

	lets.req.request({channel: 'request', event: 4}, {})
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

	lets.req.reply({channel: 'request', event: 5}, handler);
	lets.req.request({channel: 'request', event: 5}, {});

	setTimeout(function () {
		t.equal(handler.callCount, 1);
		lets.req.remove({channel: 'request', event: 5}, handler)
			.then(function (removed) {
				t.equal(removed, true, 'removed');
				lets.req.request({channel: 'request', event: 5}, {})
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

	lets.req.reply({channel: 'request', event: 6}, handler);
	lets.req.request({channel: 'request', event: 6}, {})
		.then(callback)
		.catch(shared.TestError, function (e) {
			t.equal(e, err, 'error');
			t.equal(callback.callCount, 0, 'callback count');
		});
});
