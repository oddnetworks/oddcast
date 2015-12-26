'use strict';
const test = require('tape');
const util = require('util');
const EventEmitter = require('events');
const sinon = require('sinon');
const Channel = require('../../lib/channel');
const errors = require('../../lib/errors');

// A mock transport for Command and Request Channels.
function Transport() {
	EventEmitter.call(this);
}
util.inherits(Transport, EventEmitter);
Transport.prototype.setHandler = function (handler) {
	this.handler = handler;
};
Transport.prototype.write = function (message) {
	return this.handler(message);
};
Transport.prototype.resume = function () {};
Transport.create = function () {
	return new Transport();
};

// A mock transport for Event Channels
function StreamTransport() {
	EventEmitter.call(this);
}
util.inherits(StreamTransport, EventEmitter);
StreamTransport.prototype.write = function (message) {
	this.emit('data', message);
};
StreamTransport.prototype.resume = function () {};
StreamTransport.create = function () {
	return new StreamTransport();
};

(function withSingleHandler() {
	let channel;

	const handler1 = sinon.spy();
	const handler2 = sinon.spy();

	const payload1 = {};

	let addReturn1;
	let addReturn2;

	const transport1 = Transport.create();

	function beforeEach() {
		channel = Channel.create();
		channel.use({test: 1}, transport1);
		addReturn1 = channel.addSingleHandler({test: 1}, handler1);
		addReturn2 = channel.addSingleHandler({test: 1}, handler2);
	}

	function afterEach() {
		channel.remove({test: 1}, handler1);
		handler1.reset();
		handler2.reset();
	}

	test('returns true when a handler is successfully added', function (t) {
		t.plan(1);
		beforeEach();
		t.equal(addReturn1, true, 'addReturn1');
		afterEach();
	});

	test('returns false when a duplicate handler is added', function (t) {
		t.plan(1);
		beforeEach();
		t.equal(addReturn2, false, 'addReturn2');
		afterEach();
	});

	test('calls handler when pattern matches', function (t) {
		t.plan(2);
		beforeEach();
		transport1.write({
			pattern: {test: 1, foo: 'bar'},
			payload: payload1
		});

		// Handlers are called asynchronously.
		process.nextTick(function () {
			t.equal(handler1.callCount, 1, 'handler1.callCount');
			t.equal(handler1.firstCall.args[0], payload1, 'handler1.payload');
			afterEach();
		});
	});

	test('duplicate handler is not called', function (t) {
		t.plan(1);
		beforeEach();
		transport1.write({
			pattern: {test: 1, foo: 'bar'},
			payload: payload1
		});

		// Handlers are called asynchronously.
		process.nextTick(function () {
			t.equal(handler2.callCount, 0, 'handler2.callCount');
			afterEach();
		});
	});

	test('no handler is called when the pattern does not match', function (t) {
		t.plan(4);
		beforeEach();
		const errorHandler = sinon.spy();
		channel.on('error', errorHandler);
		transport1.write({
			pattern: {test: 'x', foo: 'bar'},
			payload: payload1
		})
		// Since this transport implements the setHandler() method, a rejected
		// Promise will be returned here.
		.catch(function (err) {
			t.ok(err instanceof errors.NoTransportError, 'NoTransportError');
		});

		// Handlers are called asynchronously.
		process.nextTick(function () {
			const err = errorHandler.firstCall.args[0];
			t.equal(err.message, 'No transport mounted for pattern foo:bar,test:x');
			t.equal(handler1.callCount, 0, 'handler2.callCount');
			t.equal(handler2.callCount, 0, 'handler2.callCount');
			afterEach();
		});
	});
})();

(function withMultipleHandlers() {
	let channel;

	const handler1 = sinon.spy();
	const handler2 = sinon.spy();

	const payload1 = {};

	let addReturn1;
	let addReturn2;

	const transport1 = StreamTransport.create();

	function beforeEach() {
		channel = Channel.create();
		channel.useStream({test: 1}, transport1);
		addReturn1 = channel.addMultiHandler({test: 1}, handler1);
		addReturn2 = channel.addMultiHandler({test: 1}, handler2);
	}

	function afterEach() {
		channel.remove({test: 1});
		handler1.reset();
		handler2.reset();
	}

	test('returns true when a handler is successfully added', function (t) {
		t.plan(1);
		beforeEach();
		t.equal(addReturn1, true, 'addReturn1');
		afterEach();
	});

	test('returns true when a duplicate handler is added', function (t) {
		t.plan(1);
		beforeEach();
		t.equal(addReturn2, true, 'addReturn2');
		afterEach();
	});

	test('calls handlers when pattern matches', function (t) {
		t.plan(4);
		beforeEach();
		transport1.write({
			pattern: {test: 1, foo: 'bar'},
			payload: payload1
		});

		// Handlers are called asynchronously.
		process.nextTick(function () {
			t.equal(handler1.callCount, 1, 'handler1.callCount');
			t.equal(handler1.firstCall.args[0], payload1, 'handler1.payload');
			t.equal(handler2.callCount, 1, 'handler1.callCount');
			t.equal(handler2.firstCall.args[0], payload1, 'handler1.payload');
			afterEach();
		});
	});

	test('no handler is called when the pattern does not match', function (t) {
		t.plan(2);
		beforeEach();
		transport1.write({
			pattern: {test: 'x', foo: 'bar'},
			payload: payload1
		});

		// Handlers are called asynchronously.
		process.nextTick(function () {
			t.equal(handler1.callCount, 0, 'handler1.callCount');
			t.equal(handler2.callCount, 0, 'handler2.callCount');
			afterEach();
		});
	});
})();

(function removeHandlers() {
	let channel;

	const handler1 = sinon.spy();
	const handler2 = sinon.spy();
	const handler3 = sinon.spy();
	const handler4 = sinon.spy();

	const transport = StreamTransport.create();

	function beforeEach() {
		channel = Channel.create();
		channel.useStream({x: 1, y: 2, z: 3}, transport);
		channel.addMultiHandler({x: 1}, handler1);
		channel.addMultiHandler({x: 1}, handler2);
		channel.addMultiHandler({y: 2}, handler3);
		channel.addSingleHandler({z: 3}, handler4);
	}

	function afterEach() {
		channel.remove({x: 1});
		channel.remove({y: 2});
		channel.remove({z: 3});
		handler1.reset();
		handler2.reset();
		handler3.reset();
		handler4.reset();
	}

	test('removed handlers are not active', function (t) {
		t.plan(4);
		beforeEach();

		channel.remove({x: 1}, handler1);
		channel.remove({y: 2});
		channel.remove({z: 3});

		transport.write({
			pattern: {x: 1, y: 2, z: 3},
			payload: {}
		});

		// Handlers are called asynchronously.
		process.nextTick(function () {
			t.equal(handler1.callCount, 0, 'handler1.callCount');
			t.equal(handler2.callCount, 1, 'handler2.callCount');
			t.equal(handler3.callCount, 0, 'handler3.callCount');
			t.equal(handler4.callCount, 0, 'handler4.callCount');
			afterEach();
		});
	});
})();

(function withMultipleTransports() {
	let channel;

	const handler1 = sinon.spy();
	const handler2 = sinon.spy();

	const payload1 = {};

	const transport1 = Transport.create();
	const transport2 = StreamTransport.create();

	function beforeEach() {
		channel = Channel.create();

		channel.use({test: 1}, transport1);
		channel.useStream({test: 2}, transport2);

		channel.addSingleHandler({test: 1}, handler1);
		channel.addSingleHandler({test: 2}, handler2);
	}

	function afterEach() {
		channel.remove({test: 1}, handler1);
		channel.remove({test: 2}, handler2);
		handler1.reset();
		handler2.reset();
	}

	test('calls {test: 1} handler when {test: 1} transport is used', function (t) {
		t.plan(2);
		beforeEach();
		transport1.write({
			pattern: {test: 1, foo: 'bar'},
			payload: payload1
		});

		// Handlers are called asynchronously.
		process.nextTick(function () {
			t.equal(handler1.callCount, 1, 'handler1.callCount');
			t.equal(handler1.firstCall.args[0], payload1, 'handler1.payload');
			afterEach();
		});
	});

	test('does not call {test: 1} handler when {test: 2} transport is used', function (t) {
		t.plan(1);
		beforeEach();
		transport2.write({
			pattern: {test: 2, foo: 'bar'},
			payload: payload1
		});

		// Handlers are called asynchronously.
		process.nextTick(function () {
			t.equal(handler1.callCount, 0, 'handler1.callCount');
			afterEach();
		});
	});

	test('calls {test: 2} handler when {test: 2} transport is used', function (t) {
		t.plan(2);
		beforeEach();
		transport2.write({
			pattern: {test: 2, foo: 'bar'},
			payload: payload1
		});

		// Handlers are called asynchronously.
		process.nextTick(function () {
			t.equal(handler2.callCount, 1, 'handler2.callCount');
			t.equal(handler2.firstCall.args[0], payload1, 'handler2.payload');
			afterEach();
		});
	});

	test('does not call {test: 2} handler when {test: 1} transport is used', function (t) {
		t.plan(1);
		beforeEach();
		transport1.write({
			pattern: {test: 1, foo: 'bar'},
			payload: payload1
		});

		// Handlers are called asynchronously.
		process.nextTick(function () {
			t.equal(handler2.callCount, 0, 'handler1.callCount');
			afterEach();
		});
	});

	test('no call if transport does not match message pattern', function (t) {
		t.plan(5);
		beforeEach();
		const errorHandler = sinon.spy();
		channel.on('error', errorHandler);
		transport1.write({
			pattern: {test: 2, foo: 'bar'},
			payload: payload1
		})
		.catch(function (err) {
			t.ok(err instanceof errors.NoTransportError, 'NoTransportError');
		});

		// The Stream Transport does not throw an NoTransportError
		transport2.write({
			pattern: {test: 1, foo: 'bar'},
			payload: payload1
		});

		// Handlers are called asynchronously.
		process.nextTick(function () {
			t.equal(handler1.callCount, 0, 'handler1.callCount');
			t.equal(handler2.callCount, 0, 'handler3.callCount');

			// The Stream Transport does not throw an NoTransportError
			t.equal(errorHandler.callCount, 1, 'errorHandler callCount');
			const err = errorHandler.firstCall.args[0];
			t.ok(err instanceof errors.NoTransportError, 'NoTransportError');
			afterEach();
		});
	});
})();

(function addingTransportWithUse() {
	let channel;
	let transport;
	const err1 = new Error('addingTransportWithUse');
	const payload1 = {};

	function beforeEach() {
		transport = Transport.create();
		channel = Channel.create();
	}

	test('it proxies error events', function (t) {
		t.plan(2);
		beforeEach();

		let spy = sinon.spy();
		channel.on('error', spy);
		channel.use({}, transport);
		transport.emit('error', err1);

		t.equal(spy.callCount, 1);
		t.equal(spy.firstCall.args[0], err1);
	});

	test('it calls setHandler() if present', function (t) {
		t.plan(1);
		beforeEach();

		sinon.spy(transport, 'setHandler');
		channel.use({}, transport);
		t.equal(transport.setHandler.callCount, 1);

		transport.setHandler.restore();
	});

	test('it calls resume() if present', function (t) {
		t.plan(1);
		beforeEach();

		sinon.spy(transport, 'resume');
		channel.use({}, transport);
		t.equal(transport.resume.callCount, 1);

		transport.resume.restore();
	});

	test('executes handlers asynchronously with payload', function (t) {
		t.plan(2);
		beforeEach();
		channel.use({test: 1}, transport);
		let async = false;

		function handler(x) {
			t.equal(x, payload1, 'payload');
			t.equal(async, true, 'async');
		}

		channel.addSingleHandler({test: 1}, handler);

		channel.broadcast({test: 1}, payload1);

		async = true;
	});

	test('emits errors in handlers', function (t) {
		const err = new Error();
		t.plan(1);
		beforeEach();
		channel.use({test: 1}, transport);

		function handler() {
			throw err;
		}

		channel.addSingleHandler({test: 1}, handler);
		channel.on('error', function (e) {
			t.equal(e, err, 'Error');
		});

		channel.broadcast({test: 1}, payload1);
	});
})();

(function addingTransportWithUseStream() {
	let channel;
	let transport;
	const err1 = new Error('addingTransportWithUse');
	const payload1 = {};

	function beforeEach() {
		transport = StreamTransport.create();
		channel = Channel.create();
	}

	test('it proxies error events', function (t) {
		t.plan(2);
		beforeEach();

		let spy = sinon.spy();
		channel.on('error', spy);
		channel.useStream({}, transport);
		transport.emit('error', err1);

		t.equal(spy.callCount, 1);
		t.equal(spy.firstCall.args[0], err1);
	});

	test('it captures data events', function (t) {
		t.plan(2);
		beforeEach();

		sinon.spy(transport, 'on');
		channel.useStream({}, transport);
		t.equal(transport.on.firstCall.args.length, 2, 'transport.on args');
		t.equal(transport.on.firstCall.args[0], 'data', 'transport.on data');

		transport.on.restore();
	});

	test('it calls resume() if present', function (t) {
		t.plan(1);
		beforeEach();

		sinon.spy(transport, 'resume');
		channel.useStream({}, transport);
		t.equal(transport.resume.callCount, 1);

		transport.resume.restore();
	});

	test('executes handlers asynchronously with payload', function (t) {
		t.plan(2);
		beforeEach();
		channel.useStream({test: 1}, transport);
		let async = false;

		function handler(x) {
			t.equal(x, payload1, 'payload');
			t.equal(async, true, 'async');
		}

		channel.addMultiHandler({test: 1}, handler);

		channel.broadcast({test: 1}, payload1);

		async = true;
	});

	test('emits errors in handlers', function (t) {
		const err = new Error();
		t.plan(2);
		beforeEach();
		channel.useStream({test: 1}, transport);

		function handler1() {
			throw err;
		}

		function handler2(x) {
			t.equal(x, payload1, 'payload');
		}

		channel.addMultiHandler({test: 1}, handler1);
		channel.addMultiHandler({test: 1}, handler2);
		channel.on('error', function (e) {
			t.equal(e, err, 'Error');
		});

		channel.broadcast({test: 1}, payload1);
	});
})();
