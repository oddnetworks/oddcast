/* global describe, beforeAll, afterEach, it, expect */
/* eslint-disable max-nested-callbacks */
'use strict';

var oddcast = require('../../lib/oddcast');

describe('InprocessTransport with CommandChannel', function () {
	var PAYLOAD_1 = Object.freeze({event: 1});
	var RESPONSE_1 = Object.freeze({response: 1});
	// var ERROR_1 = new Error('ERROR_1');

	beforeAll(function () {
		this.channel = oddcast.requestChannel();
		this.transport = oddcast.inprocessTransport();
		this.channel.use({role: 'foo'}, this.transport);
	});

	afterEach(function () {
		this.channel.removeAllListeners('error');
		this.channel.remove({});
	});

	it('defaults payload to null', function (done) {
		this.channel.respond({role: 'foo'}, function (payload) {
			expect(payload).toBe(null);
			done();
			return null;
		});

		this.channel.request({role: 'foo'});
	});

	it('calls handlers asynchronously', function (done) {
		var async = false;

		this.channel.respond({role: 'foo'}, function () {
			expect(async).toBe(true);
			return RESPONSE_1;
		});

		this.channel.request({role: 'foo'}, PAYLOAD_1)
			.then(function () {
				done();
			});

		async = true;
	});

	it('passes the payload to handlers', function (done) {
		this.channel.respond({role: 'foo'}, function (payload) {
			expect(payload).not.toBe(PAYLOAD_1);
			expect(payload).toEqual(PAYLOAD_1);
			done();
		});

		this.channel.request({role: 'foo'}, PAYLOAD_1);
	});

	it('responds with a resolved promise for the return value', function (done) {
		this.channel.respond({role: 'foo'}, function () {
			return RESPONSE_1;
		});

		this.channel.request({role: 'foo'}, PAYLOAD_1)
			.then(function (res) {
				expect(res).toBe(RESPONSE_1);
				done();
			});
	});

	it('removes all handlers (in afterEach())', function () {
		var matcher = this.channel.handlerMatcher;
		expect(matcher.index.list().length).toBe(0);
	});
});
