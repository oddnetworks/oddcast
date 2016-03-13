/* global describe, beforeAll, it, expect */
/* eslint-disable max-nested-callbacks */
'use strict';

var Channel = require('../lib/channel');
var CommandChannel = require('../lib/command_channel');

describe('CommandChannel', function () {
	beforeAll(function () {
		this.channel = CommandChannel.create();
	});

	describe('send()', function () {
		it('uses Channel.prototype.broadcast', function () {
			expect(this.channel.send).toBe(Channel.prototype.broadcast);
		});
	});

	describe('receive()', function () {
		it('uses Channel.prototype.addSingleHandler', function () {
			expect(this.channel.receive).toBe(Channel.prototype.addSingleHandler);
		});
	});

	describe('remove()', function () {
		it('uses Channel.prototype.addSingleHandler', function () {
			expect(this.channel.receive).toBe(Channel.prototype.addSingleHandler);
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
