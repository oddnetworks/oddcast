'use strict';
const Promise = require('bluebird');
const test = require('tape');
const sinon = require('sinon');

const shared = require('../shared');
const oddcast = require('../../lib/oddcast');

(function () {
	const events = oddcast.eventChannel();
	const commands = oddcast.commandChannel();
	const req = oddcast.requestChannel();

	test('before all', function (t) {
		events.use({role: 'broadcastTest'}, oddcast.inprocessTransport());
		commands.use({role: 'commandTest'}, oddcast.inprocessTransport());
		req.use({role: 'requestTest'}, oddcast.inprocessTransport());
		t.end();
	});

	test('EventChannel with handler', function (t) {
		t.plan(3);
		const payload = {};
		let async = false;
		let isset = null;

		const handler = sinon.spy(function (arg) {
			t.equal(arg, payload, 'args');
			t.ok(async, 'ran async');
		});

		isset = events.observe({role: 'broadcastTest', test: 1}, handler);
		t.equal(isset, true, 'isset');

		events.broadcast({role: 'broadcastTest', test: 1}, payload);

		async = true;
	});

	test('EventChannel with many handlers', function (t) {
		t.plan(4);
		const payload = {};
		let isset = null;

		const handler1 = sinon.spy(function (arg) {
			t.equal(arg, payload, 'args');
		});

		const handler2 = sinon.spy(function (arg) {
			t.equal(arg, payload, 'args');
		});

		isset = events.observe({role: 'broadcastTest', test: 2}, handler1);
		t.equal(isset, true, 'isset 1');
		isset = events.observe({role: 'broadcastTest', test: 2}, handler2);
		t.equal(isset, true, 'isset 1');

		events.broadcast({role: 'broadcastTest', test: 2}, payload);
	});

	test('EventChannel add and remove handler', function (t) {
		t.plan(3);
		const handler = sinon.spy();

		events.observe({role: 'broadcastTest', test: 4}, handler);
		events.broadcast({role: 'broadcastTest', test: 4, param: 'foo'});

		setTimeout(function () {
			t.equal(handler.callCount, 1, 'first call count');
			const removed = events.remove({role: 'broadcastTest', test: 4}, handler);
			t.equal(removed, true, 'removed');
			events.broadcast({role: 'broadcastTest', test: 4});

			setTimeout(function () {
				t.equal(handler.callCount, 1, 'last call count');
			}, 20);
		}, 20);
	});

	test('EventChannel with an error in a handler', function (t) {
		t.plan(1);

		const err = new shared.TestError('observer handler error');
		const handler = sinon.spy(function () {
			throw err;
		});

		events.observe({role: 'broadcastTest', test: 5}, handler);

		events.broadcast({role: 'broadcastTest', test: 5});

		events.on('error', function (e) {
			t.equal(e, err, 'error');
		});
	});

	test('CommandChannel with handler', function (t) {
		t.plan(3);
		const payload = {};
		let async = false;
		let isset = null;

		const handler = sinon.spy(function (arg) {
			t.equal(arg, payload, 'arg');
			t.ok(async, 'ran async');
		});

		isset = commands.receive({role: 'commandTest', test: 1}, handler);
		t.equal(isset, true, 'isset');

		commands.send({role: 'commandTest', test: 1}, payload);

		async = true;
	});

	test('CommandChannel with many handlers', function (t) {
		t.plan(5);
		const payload = {};
		let isset = null;

		const handler1 = sinon.spy(function (arg) {
			t.equal(arg, payload, 'got payload');
		});

		const handler2 = sinon.spy();

		setTimeout(function () {
			t.equal(handler1.callCount, 1, 'count handler1');
			t.equal(handler2.callCount, 0, 'count handler2');
		}, 12);

		isset = commands.receive({role: 'commandTest', test: 2}, handler1);
		t.equal(isset, true, 'isset');

		isset = commands.receive({role: 'commandTest', test: 2}, handler2)
		t.equal(isset, false, 'isset');

		commands.send({role: 'commandTest', test: 2}, payload);
	});

	test('CommandChannel called without handler', function (t) {
		t.plan(2);
		const handler = sinon.spy();
		const errorHandler = sinon.spy();

		commands.on('error', errorHandler);
		commands.receive({role: 'commandTest', test: 'NA'}, handler);
		commands.send({role: 'commandTest', test: 3});

		setTimeout(function () {
			commands.removeListener('error', errorHandler);
			t.equal(handler.callCount, 0, 'count');
			const err = errorHandler.firstCall.args[0];
			t.equal(err.message, 'No handler for pattern role:commandTest,test:3');
		}, 12);
	});

	test('CommandChannel add and remove handler', function (t) {
		t.plan(4);
		const handler = sinon.spy();
		const errorHandler = sinon.spy();

		commands.on('error', errorHandler);
		commands.receive({role: 'commandTest', test: 4}, handler);
		commands.send({role: 'commandTest', test: 4});

		setTimeout(function () {
			t.equal(handler.callCount, 1);
			const removed = commands.remove({role: 'commandTest', test: 4}, handler);
			t.equal(removed, true, 'removed');
			commands.send({role: 'commandTest', test: 4});

			setTimeout(function () {
				t.equal(handler.callCount, 1, 'count');
				const err = errorHandler.firstCall.args[0];
				t.equal(err.message, 'No handler for pattern role:commandTest,test:4');
			}, 20);
		}, 20);
	});

	test('CommandChannel with an error in a handler', function (t) {
		t.plan(1);

		const err = new shared.TestError('command handler error');
		const handler = sinon.spy(function () {
			throw err;
		});

		function errorHandler(e) {
			commands.removeListener('error', errorHandler)
			t.equal(e, err, 'error');
		}

		commands.on('error', errorHandler);
		commands.receive({role: 'commandTest', test: 5}, handler);
		commands.send({role: 'commandTest', test: 5});
	});

	test('RequestChannel with handler', function (t) {
		t.plan(4);
		const payload = {};
		const response = {response: true};
		let async = false;
		let isset = null;

		const handler = sinon.spy(function (arg) {
			t.equal(arg, payload, 'payload');
			t.ok(async, 'ran async');
			return response;
		});

		isset = req.respond({role: 'requestTest', test: 1}, handler);
		t.equal(isset, true, 'isset');

		req.request({role: 'requestTest', test: 1}, payload)
			.then(function (res) {
				t.equal(res, response, 'response');
			});

		async = true;
	});

	test('RequestChannel with many handlers', function (t) {
		t.plan(5);
		const payload = {};
		const response = {};
		let isset = null;

		const handler1 = sinon.spy(function (arg) {
			t.equal(arg, payload, 'payload');
			return response;
		});

		const handler2 = sinon.spy();

		isset = req.respond({role: 'requestTest', test: 2}, handler1);
		t.equal(isset, true, 'isset');

		isset = req.respond({role: 'requestTest', test: 2}, handler2);
		t.equal(isset, false, 'isset');

		req.request({role: 'requestTest', test: 2}, payload)
			.then(function (res) {
				t.equal(res, response, 'response');
				t.equal(handler2.callCount, 0);
			});
	});

	test('RequestChannel with Promise result', function (t) {
		t.plan(1);
		const response = {};

		const handler = sinon.spy(function () {
			return Promise.resolve(response);
		});

		req.respond({role: 'requestTest', test: 3}, handler);

		req.request({role: 'requestTest', test: 3})
			.then(function (res) {
				t.equal(res, response, 'response');
			});
	});

	test('RequestChannel called without handler', function (t) {
		t.plan(4);
		const handler = sinon.spy();
		const callback = sinon.spy();
		const errorHandler = sinon.spy();

		req.on('error', errorHandler);
		req.respond({role: 'requestTest', test: 'foo'}, handler);

		req.request({role: 'requestTest', test: 4, param: 'foo'})
			.then(callback)
			.catch(function (err) {
				t.equal(err.message, 'No handler for pattern param:foo,role:requestTest,test:4');
			});

		setTimeout(function () {
			req.removeListener('error', errorHandler);
			t.equal(handler.callCount, 0, 'handler count');
			t.equal(callback.callCount, 0, 'callback count');
			const err = errorHandler.firstCall.args[0];
			t.equal(err.message, 'No handler for pattern param:foo,role:requestTest,test:4');
		}, 20);
	});

	test('RequestChannel add and remove handler', function (t) {
		t.plan(6);
		const handler = sinon.spy();
		const errorHandler = sinon.spy();
		const callback = sinon.spy();

		req.on('error', errorHandler);
		req.respond({role: 'requestTest', test: 5}, handler);
		req.request({role: 'requestTest', test: 5}, {});

		setTimeout(function () {
			t.equal(handler.callCount, 1);
			const removed = req.remove({role: 'requestTest', test: 5}, handler);
			t.equal(removed, true, 'removed');
			req.request({role: 'requestTest', test: 5, param: 'foo'})
				.then(callback)
				.catch(function (err) {
					t.equal(err.message, 'No handler for pattern param:foo,role:requestTest,test:5');
				});

			setTimeout(function () {
				req.removeListener('error', errorHandler);
				const err = errorHandler.firstCall.args[0];
				t.equal(err.message, 'No handler for pattern param:foo,role:requestTest,test:5');
				t.equal(handler.callCount, 1, 'handler count');
				t.equal(callback.callCount, 0, 'callback count');
			}, 20);
		}, 20);
	});

	test('RequestChannel with an error in a handler', function (t) {
		t.plan(3);

		const errorHandler = sinon.spy();
		const err = new shared.TestError('request handler error');
		const handler = sinon.spy(function () {
			throw err;
		});
		const callback = sinon.spy();

		req.on('error', errorHandler);
		req.respond({role: 'requestTest', test: 6}, handler);

		req
			.request({role: 'requestTest', test: 6, param: 'foo'})
			.then(callback)
			.catch(function (e) {
				req.removeListener('error', errorHandler);
				t.equal(e, err, 'error');
				t.equal(errorHandler.firstCall.args[0], err, 'error');
				t.equal(callback.callCount, 0, 'callback count');
			});
	});
})();
