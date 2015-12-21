'use strict';
const test = require('tape');
const sinon = require('sinon');
const Channel = require('../../lib/channel');
const RequestChannel = require('../../lib/request_channel');

(function requestWithNoTransport() {
	let channel;

	function beforeEach() {
		channel = RequestChannel.create();
	}

	test('throws a NoTransportError', function (t) {
		t.plan(1);
		beforeEach();
		t.throws(function () {
			channel.request();
		}, /No transport mounted/);
	});
})();

(function requestWithTransport() {
	let channel;
	const payload = {};
	const returnValue = {};

	const transport = {
		write: function () {
			return returnValue;
		},
		on: function () {}
	};

	function beforeEach() {
		channel = RequestChannel.create();
		sinon.spy(transport, 'write');
		channel.use({test: 1}, transport);
	}

	function afterEach() {
		transport.write.restore();
	}

	test('write is called', function (t) {
		t.plan(1);
		beforeEach();

		channel.request({test: 1}, payload);
		t.equal(transport.write.callCount, 1);

		afterEach();
	});

	test('write is called with pattern and payload', function (t) {
		t.plan(2);
		beforeEach();
		const pattern = {test: 1};

		channel.request(pattern, payload);

		const args = transport.write.firstCall.args;
		t.equal(args[0].pattern, pattern);
		t.equal(args[0].payload, payload);

		afterEach();
	});

	test('returns result of write', function (t) {
		t.plan(1);
		beforeEach();

		const rv = channel.request({test: 1}, payload);
		t.equal(rv, returnValue);

		afterEach();
	});
})();

(function inheritedMethods() {
	test('it has a respond method', function (t) {
		t.plan(1);
		const respond = RequestChannel.prototype.respond;
		t.equal(respond, Channel.prototype.addSingleHandler);
	});

	test('it has a respond method', function (t) {
		t.plan(1);
		const remove = RequestChannel.prototype.remove;
		t.equal(remove, Channel.prototype.remove);
	});

	test('it has a respond method', function (t) {
		t.plan(1);
		const use = RequestChannel.prototype.use;
		t.equal(use, Channel.prototype.use);
	});
})();
