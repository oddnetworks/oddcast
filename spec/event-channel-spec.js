/* global describe, beforeAll, it, expect */
/* eslint-disable max-nested-callbacks */
'use strict';

var Channel = require('../lib/channel');
var EventChannel = require('../lib/event-channel');

describe('EventChannel', function () {
	beforeAll(function () {
		this.channel = EventChannel.create();
	});

	describe('broadcast()', function () {
		it('uses Channel.prototype.broadcast', function () {
			expect(this.channel.broadcast).toBe(Channel.prototype.broadcast);
		});
	});

	describe('observe()', function () {
		it('uses Channel.prototype.addMultiHandler', function () {
			expect(this.channel.observe).toBe(Channel.prototype.addMultiHandler);
		});
	});

	describe('remove()', function () {
		it('uses Channel.prototype.remove', function () {
			expect(this.channel.remove).toBe(Channel.prototype.remove);
		});
	});

	describe('use()', function () {
		it('uses Channel.prototype.useStream', function () {
			expect(this.channel.use).toBe(Channel.prototype.useStream);
		});
	});

	describe('addSingleHandler()', function () {
		it('throws a not implemented error', function () {
			var channel = this.channel;

			function test() {
				channel.addSingleHandler();
			}

			expect(test).toThrowError('Not Implemented: addSingleHandler');
		});
	});
});
