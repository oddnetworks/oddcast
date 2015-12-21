'use strict';
const test = require('tape');
const Channel = require('../../lib/channel');
const CommandChannel = require('../../lib/command_channel');

(function inheritedMethods() {
	test('it has a send method', function (t) {
		t.plan(1);
		const send = CommandChannel.prototype.send;
		t.equal(send, Channel.prototype.broadcast);
	});

	test('it has a receive method', function (t) {
		t.plan(1);
		const receive = CommandChannel.prototype.receive;
		t.equal(receive, Channel.prototype.addSingleHandler);
	});

	test('it has a remove method', function (t) {
		t.plan(1);
		const remove = CommandChannel.prototype.remove;
		t.equal(remove, Channel.prototype.remove);
	});

	test('it has a remove method', function (t) {
		t.plan(1);
		const use = CommandChannel.prototype.use;
		t.equal(use, Channel.prototype.use);
	});
})();
