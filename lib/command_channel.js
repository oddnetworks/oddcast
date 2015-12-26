'use strict';
var util = require('util');
var utils = require('./utils');
var Channel = require('./channel');

function CommandChannel() {
	Channel.call(this);
}

util.inherits(CommandChannel, Channel);

module.exports = CommandChannel;

utils.extend(CommandChannel.prototype, {
	send: Channel.prototype.broadcast,
	receive: Channel.prototype.addSingleHandler
	// remove: Channel.prototype.remove
	// use: Channel.prototype.use
});

CommandChannel.create = function () {
	return new CommandChannel();
};
