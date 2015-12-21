'use strict';
const test = require('tape');
const Channel = require('../../lib/channel');
const EventChannel = require('../../lib/event_channel');

(function inheritedMethods() {
	test('it has a broadcast method', function (t) {
		t.plan(1);
		const broadcast = EventChannel.prototype.broadcast;
		t.equal(broadcast, Channel.prototype.broadcast);
	});

	test('it has a observe method', function (t) {
		t.plan(1);
		const observe = EventChannel.prototype.observe;
		t.equal(observe, Channel.prototype.addMultiHandler);
	});

	test('it has a remove method', function (t) {
		t.plan(1);
		const remove = EventChannel.prototype.remove;
		t.equal(remove, Channel.prototype.remove);
	});

	test('it has a use method', function (t) {
		t.plan(1);
		const use = EventChannel.prototype.use;
		t.equal(use, Channel.prototype.useStream);
	});
})();
