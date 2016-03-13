/* global describe, beforeAll, it, expect, spyOn, xdescribe */
/* eslint-disable max-nested-callbacks */
'use strict';

var oddcast = require('../lib/oddcast');

describe('InprocessTransport', function () {
	var payload1 = {event: 1};

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

			this.channel.broadcast({role: 'foo', item: 'bar'}, payload1);
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
				this.channel.send({role: 'foo', item: 'bar'}, payload1);
			});

			it('emits a NotFound error', function () {
				expect(this.error instanceof oddcast.errors.NoHandlerError).toBe(true);
			});
		});
	});

	xdescribe('with RequestChannel', function () {
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
