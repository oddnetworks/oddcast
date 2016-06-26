/* global jasmine, describe, beforeAll, afterEach, it, expect */
/* eslint-disable max-nested-callbacks */
'use strict';

var Promise = require('bluebird');
var oddcast = require('../../lib/oddcast');

describe('InprocessTransport with EventChannel', function () {
	var PAYLOAD_1 = Object.freeze({event: 1});
	var ERROR_1 = new Error('ERROR_1');

	beforeAll(function () {
		this.channel = oddcast.eventChannel();
		this.transport = oddcast.inprocessTransport();
		this.channel.use({role: 'foo'}, this.transport);
	});

	afterEach(function () {
		this.channel.removeAllListeners('error');
		this.channel.remove({});
	});

	it('defaults payload to null', function (done) {
		this.channel.observe({role: 'foo'}, function (payload) {
			expect(payload).toBe(null);
			done();
			return null;
		});

		this.channel.broadcast({role: 'foo'});
	});

	it('calls handlers asynchronously', function (done) {
		var async = false;

		this.channel.observe({role: 'foo'}, function () {
			expect(async).toBe(true);
			done();
		});

		this.channel.broadcast({role: 'foo'}, PAYLOAD_1);
		async = true;
	});

	it('passes the payload to handlers', function (done) {
		this.channel.observe({role: 'foo'}, function (payload) {
			expect(payload).not.toBe(PAYLOAD_1);
			expect(payload).toEqual(PAYLOAD_1);
			done();
		});

		this.channel.broadcast({role: 'foo'}, PAYLOAD_1);
	});

	it('broadcasts specific events to generic observers', function (done) {
		this.channel.observe({role: 'foo'}, function (payload) {
			expect(payload).not.toBe(PAYLOAD_1);
			expect(payload).toEqual(PAYLOAD_1);
			done();
		});

		this.channel.broadcast({role: 'foo', item: 'bar'}, PAYLOAD_1);
	});

	it('does not broadcast generic events to specific observers', function (done) {
		var spy = jasmine.createSpy('observer');
		this.channel.observe({role: 'foo', item: 'bar'}, spy);

		this.channel.observe({role: 'foo'}, function () {
			// Give it some time to fire.
			setTimeout(function () {
				expect(spy).not.toHaveBeenCalled();
				done();
			}, 24);
		});

		this.channel.broadcast({role: 'foo'}, PAYLOAD_1);
	});

	it('broadcasts events to multiple observers', function (done) {
		var resolve = createResolver(done, 3);

		this.channel.observe({role: 'foo'}, function (payload) {
			expect(payload).not.toBe(PAYLOAD_1);
			expect(payload).toEqual(PAYLOAD_1);
			resolve();
		});
		this.channel.observe({role: 'foo'}, function (payload) {
			expect(payload).not.toBe(PAYLOAD_1);
			expect(payload).toEqual(PAYLOAD_1);
			resolve();
		});
		this.channel.observe({role: 'foo', item: 'bar'}, function (payload) {
			expect(payload).not.toBe(PAYLOAD_1);
			expect(payload).toEqual(PAYLOAD_1);
			resolve();
		});

		this.channel.broadcast({role: 'foo', item: 'bar'}, PAYLOAD_1);
	});

	it('emits the error when an observer throws an error', function (done) {
		this.channel.observe({role: 'foo'}, function () {
			throw ERROR_1;
		});

		this.channel.on('error', function (err) {
			expect(err).toBe(ERROR_1);
		});

		this.channel.broadcast({role: 'foo'}, PAYLOAD_1);

		// Give enough time for handlers to be called
		setTimeout(function () {
			done();
		}, 34);
	});

	it('emits the error when an observer rejects', function (done) {
		this.channel.observe({role: 'foo'}, function () {
			return Promise.reject(ERROR_1);
		});

		this.channel.on('error', function (err) {
			expect(err).toBe(ERROR_1);
		});

		this.channel.broadcast({role: 'foo'}, PAYLOAD_1);

		// Give enough time for handlers to be called
		setTimeout(function () {
			done();
		}, 34);
	});

	it('removes all handlers (in afterEach())', function () {
		var matcher = this.channel.handlerMatcher;
		expect(Object.keys(matcher.index).length).toBe(0);
	});
});

function createResolver(done, expectedCount) {
	var count = 0;
	return function () {
		count += 1;
		if (count >= expectedCount) {
			done();
		}
	};
}
