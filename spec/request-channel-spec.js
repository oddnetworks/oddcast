/* global describe, beforeAll, it, expect, spyOn */
/* eslint-disable max-nested-callbacks */
'use strict';

var Channel = require('../lib/channel');
var errors = require('../lib/errors');
var RequestChannel = require('../lib/request-channel');
var Transport = require('./support/transport');

var NoTransportError = errors.NoTransportError;

describe('EventChannel', function () {
	beforeAll(function () {
		this.channel = RequestChannel.create();
	});

	describe('request()', function () {
		beforeAll(function () {
			this.channel = RequestChannel.create();
			this.transport = Transport.create();
			spyOn(this.transport, 'write');
			this.payload = {item: 1};
			this.channel.use({role: 'foo'}, this.transport);
		});

		describe('with no matching transport', function () {
			beforeAll(function () {
				this.error = null;
				try {
					this.channel.request({role: 'bar'}, this.payload);
				} catch (err) {
					this.error = err;
				}
			});

			it('throws a NoTransportError', function () {
				expect(this.error instanceof NoTransportError).toBe(true);
			});

			it('does not call transport.write()', function () {
				expect(this.transport.write).not.toHaveBeenCalled();
			});
		});

		describe('with writable transport', function () {
			beforeAll(function () {
				this.channel.request({role: 'foo'}, this.payload);
			});

			it('writes to the transport', function () {
				expect(this.transport.write).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('respond()', function () {
		it('uses Channel.prototype.addSingleHandler', function () {
			expect(this.channel.respond).toBe(Channel.prototype.addSingleHandler);
		});
	});

	describe('remove()', function () {
		it('uses Channel.prototype.remove', function () {
			expect(this.channel.remove).toBe(Channel.prototype.remove);
		});
	});

	describe('use()', function () {
		it('uses Channel.prototype.use', function () {
			expect(this.channel.use).toBe(Channel.prototype.use);
		});
	});

	describe('addMultiHandler()', function () {
		it('throws a not implemented error', function () {
			var channel = this.channel;

			function test() {
				channel.addMultiHandler();
			}

			expect(test).toThrowError('Not Implemented: addMultiHandler');
		});
	});

	describe('useStream()', function () {
		it('throws a not implemented error', function () {
			var channel = this.channel;

			function test() {
				channel.useStream();
			}

			expect(test).toThrowError('Not Implemented: useStream');
		});
	});
});
