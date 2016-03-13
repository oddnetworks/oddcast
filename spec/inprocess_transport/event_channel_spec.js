/* global jasmine, describe, beforeAll, afterEach, it, expect */
/* eslint-disable max-nested-callbacks */
'use strict';

var oddcast = require('../../lib/oddcast');

describe('InprocessTransport with EventChannel', function () {
	var PAYLOAD_1 = Object.freeze({event: 1});

	beforeAll(function () {
		this.channel = oddcast.eventChannel();
		this.transport = oddcast.inprocessTransport();
		this.channel.use({role: 'foo'}, this.transport);
	});

	afterEach(function () {
		this.channel.removeAllListeners('error');
		this.channel.remove({});
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
			expect(payload).toBe(PAYLOAD_1);
			done();
		});

		this.channel.broadcast({role: 'foo'}, PAYLOAD_1);
	});

	it('broadcasts specific events to generic observers', function (done) {
		this.channel.observe({role: 'foo'}, function (payload) {
			expect(payload).toBe(PAYLOAD_1);
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
			expect(payload).toBe(PAYLOAD_1);
			resolve();
		});
		this.channel.observe({role: 'foo'}, function (payload) {
			expect(payload).toBe(PAYLOAD_1);
			resolve();
		});
		this.channel.observe({role: 'foo', item: 'bar'}, function (payload) {
			expect(payload).toBe(PAYLOAD_1);
			resolve();
		});

		this.channel.broadcast({role: 'foo', item: 'bar'}, PAYLOAD_1);
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
