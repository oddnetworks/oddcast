'use strict';
var util = require('util');
var utils = require('./utils');
var Channel = require('./channel');

function EventChannel() {
	Channel.call(this);
}

util.inherits(EventChannel, Channel);

module.exports = EventChannel;

utils.extend(EventChannel.prototype, {
	// broadcast: Channel.prototype.broadcast
	observe: Channel.prototype.addMultiHandler,
	// remove: Channel.prototype.remove
	use: Channel.prototype.useStream
});

EventChannel.create = function () {
	return new EventChannel();
};
