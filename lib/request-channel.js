'use strict';
var util = require('util');
var utils = require('./utils');
var errors = require('./errors');
var Channel = require('./channel');

function RequestChannel() {
	Channel.call(this);
}

util.inherits(RequestChannel, Channel);

module.exports = RequestChannel;

utils.extend(RequestChannel.prototype, {
	request: function (pattern, payload) {
		var transport = this.transportMatcher.find(pattern)[0];

		if (!transport) {
			throw new errors.NoTransportError(pattern);
		}

		return transport.write({
			pattern: pattern,
			payload: payload
		});
	},

	respond: Channel.prototype.addSingleHandler,
	// remove: Channel.prototype.remove
	// use: Channel.prototype.use
	addMultiHandler: utils.notImplemented('addMultiHandler'),
	useStream: utils.notImplemented('useStream')
});

RequestChannel.create = function () {
	return new RequestChannel();
};
