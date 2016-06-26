/* global jasmine, describe, beforeAll, afterEach, it, expect */
/* eslint-disable max-nested-callbacks */
'use strict';

var oddcast = require('../../lib/oddcast');

describe('InprocessTransport with CommandChannel', function () {
	var PAYLOAD_1 = Object.freeze({event: 1});
	var ERROR_1 = new Error('ERROR_1');

	beforeAll(function () {
		this.channel = oddcast.commandChannel();
		this.transport = oddcast.inprocessTransport();
		this.channel.use({role: 'foo'}, this.transport);
	});

	afterEach(function () {
		this.channel.removeAllListeners('error');
		this.channel.remove({});
	});

	it('defaults payload to null', function (done) {
		this.channel.receive({role: 'foo'}, function (payload) {
			expect(payload).toBe(null);
			done();
			return null;
		});

		this.channel.send({role: 'foo'});
	});

	it('calls handlers asynchronously', function (done) {
		var async = false;

		this.channel.receive({role: 'foo'}, function () {
			expect(async).toBe(true);
			done();
		});

		this.channel.send({role: 'foo'}, PAYLOAD_1);
		async = true;
	});

	it('passes the payload to handlers', function (done) {
		this.channel.receive({role: 'foo'}, function (payload) {
			expect(payload).not.toBe(PAYLOAD_1);
			expect(payload).toEqual(PAYLOAD_1);
			done();
		});

		this.channel.send({role: 'foo'}, PAYLOAD_1);
	});

	it('sends specific commands to generic receivers', function (done) {
		this.channel.receive({role: 'foo'}, function (payload) {
			expect(payload).not.toBe(PAYLOAD_1);
			expect(payload).toEqual(PAYLOAD_1);
			done();
		});

		this.channel.send({role: 'foo', item: 'bar'}, PAYLOAD_1);
	});

	it('does not send generic events to specific receivers', function (done) {
		var spy = jasmine.createSpy('receiver');
		this.channel.receive({role: 'foo', item: 'bar'}, spy);

		this.channel.receive({role: 'foo'}, function () {
			// Give it some time to fire.
			setTimeout(function () {
				expect(spy).not.toHaveBeenCalled();
				done();
			}, 24);
		});

		this.channel.send({role: 'foo'}, PAYLOAD_1);
	});

	it('does not send commands to multiple receivers', function (done) {
		this.channel.receive({role: 'foo'}, function (payload) {
			expect(payload).not.toBe(PAYLOAD_1);
			expect(payload).toEqual(PAYLOAD_1);
		});

		var handler2 = jasmine.createSpy('handler2');
		this.channel.receive({role: 'foo'}, handler2);

		var handler3 = jasmine.createSpy('handler3');
		this.channel.receive({role: 'foo', item: 'bar'}, handler3);

		this.channel.send({role: 'foo', item: 'bar'}, PAYLOAD_1);

		// Give enough time for handlers to be called
		setTimeout(function () {
			expect(handler2).not.toHaveBeenCalled();
			expect(handler3).not.toHaveBeenCalled();
			done();
		}, 34);
	});

	it('emits the error when a receiver throws an error', function (done) {
		this.channel.receive({role: 'foo'}, function () {
			throw ERROR_1;
		});

		this.channel.on('error', function (err) {
			expect(err).toBe(ERROR_1);
		});

		this.channel.send({role: 'foo'}, PAYLOAD_1);

		setTimeout(function () {
			done();
		}, 34);
	});

	it('emits the error when a receiver rejects', function (done) {
		this.channel.receive({role: 'foo'}, function () {
			return Promise.reject(ERROR_1);
		});

		this.channel.on('error', function (err) {
			expect(err).toBe(ERROR_1);
		});

		this.channel.send({role: 'foo'}, PAYLOAD_1);

		setTimeout(function () {
			done();
		}, 34);
	});

	it('removes all handlers (in afterEach())', function () {
		var matcher = this.channel.handlerMatcher;
		expect(Object.keys(matcher.index).length).toBe(0);
	});
});
