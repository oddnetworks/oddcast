/* global describe, beforeAll, it, expect, spyOn */
/* eslint-disable max-nested-callbacks */
'use strict';

var oddcast = require('../lib/oddcast');

describe('InprocessTransport', function () {
	var PAYLOAD1 = Object.freeze({event: 1});
	var PAYLOAD2 = Object.freeze({event: 1});
	var RESULT1 = Object.freeze({result: 1});

	describe('with EventChannel', function () {
		beforeAll(function (done) {
			this.channel = oddcast.eventChannel();
			this.transport = oddcast.inprocessTransport();
			this.channel.use({role: 'foo'}, this.transport);

			var resolve = createResolver(done, 2);
			this.handler1 = resolve;
			this.handler2 = resolve;
			spyOn(this, 'handler1').and.callThrough();
			spyOn(this, 'handler2').and.callThrough();

			this.channel.observe({role: 'foo', item: 'bar'}, this.handler1);
			this.channel.observe({role: 'foo', item: 'bar'}, this.handler2);

			this.channel.broadcast({role: 'foo', item: 'bar'}, PAYLOAD1);
		});

		it('calls the handlers', function () {
			expect(this.handler1).toHaveBeenCalledTimes(1);
			expect(this.handler2).toHaveBeenCalledTimes(1);
		});
	});

	describe('with CommandChannel', function () {
		describe('without matching handler', function () {
			beforeAll(function (done) {
				this.channel = oddcast.commandChannel();
				this.transport = oddcast.inprocessTransport();
				this.channel.use({role: 'foo'}, this.transport);

				var self = this;
				this.errorHandler = function (err) {
					self.error = err;
					done();
				};
				spyOn(this, 'errorHandler').and.callThrough();

				this.channel.on('error', this.errorHandler);
				this.channel.send({role: 'foo', item: 'bar'}, PAYLOAD1);
			});

			it('emits a NoHandler error', function () {
				expect(this.error instanceof oddcast.errors.NoHandlerError).toBe(true);
			});
		});

		describe('with a matching handler', function () {
			beforeAll(function (done) {
				this.channel = oddcast.commandChannel();
				this.transport = oddcast.inprocessTransport();
				this.channel.use({role: 'foo'}, this.transport);

				this.errorHandler = function () {};
				spyOn(this, 'errorHandler');

				var resolve = createResolver(done, 2);
				this.handler1 = resolve;
				spyOn(this, 'handler1').and.callThrough();

				this.channel.on('error', this.errorHandler);
				this.channel.receive({role: 'foo', item: 'bar'}, this.handler1);

				this.channel.send({role: 'foo', item: 'bar'}, PAYLOAD1);
				this.channel.send({role: 'foo', item: 'bar'}, PAYLOAD2);
			});

			it('calls the handler', function () {
				expect(this.handler1).toHaveBeenCalledTimes(2);
			});
		});
	});

	describe('with RequestChannel', function () {
		describe('without matching handler', function () {
			beforeAll(function (done) {
				this.channel = oddcast.requestChannel();
				this.transport = oddcast.inprocessTransport();
				this.channel.use({role: 'foo'}, this.transport);

				this.errorHandler = function () {};
				spyOn(this, 'errorHandler');
				this.channel.on('error', this.errorHandler);

				var self = this;
				this.channel.request({role: 'foo', item: 'bar'}, PAYLOAD1)
					.then(function () {
						done.fail(new Error('should not call .then()'));
					})
					.catch(function (err) {
						self.error = err;
						done();
					});
			});

			it('rejects with a NotFoundError error', function () {
				expect(this.error instanceof oddcast.errors.NotFoundError).toBe(true);
			});
		});

		describe('with a matching handler', function () {
			beforeAll(function (done) {
				this.channel = oddcast.requestChannel();
				this.transport = oddcast.inprocessTransport();
				this.channel.use({role: 'foo'}, this.transport);

				this.errorHandler = function () {};
				spyOn(this, 'errorHandler');

				this.channel.on('error', this.errorHandler);

				this.payloads = [];
				this.responses = [];
				var self = this;

				this.channel.respond({role: 'foo', item: 'bar'}, function (payload) {
					self.payloads.push(payload);
					return RESULT1;
				});

				var resolve = createResolver(done, 2, RESULT1);

				this.channel.request({role: 'foo', item: 'bar'}, PAYLOAD1)
					.then(function (res) {
						self.responses.push(res);
						resolve();
					});

				this.channel.request({role: 'foo', item: 'bar'}, PAYLOAD2)
					.then(function (res) {
						self.responses.push(res);
						resolve();
					});
			});

			it('calls the handler with the payloads', function () {
				expect(this.payloads.length).toBe(2);
				expect(this.payloads[0]).toBe(PAYLOAD1);
				expect(this.payloads[1]).toBe(PAYLOAD2);
			});
		});
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
