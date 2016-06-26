'use strict';

var util = require('util');
var EventEmitter = require('events');
var Promise = require('bluebird');
var errors = require('./errors');
var utils = require('./utils');

function InprocessTransport() {
	EventEmitter.call(this);

	this.handler = null;
}

util.inherits(InprocessTransport, EventEmitter);

module.exports = InprocessTransport;

utils.extend(InprocessTransport.prototype, {
	write: function (message) {
		var pattern = message.pattern;
		var payload = typeof message.payload === 'undefined' ? null : message.payload;
		payload = JSON.parse(JSON.stringify(payload));

		if (this.handler) {
			// This is a Command or Request Channel
			return this.handler({pattern: pattern, payload: payload})
				.catch(errors.NoTransportError, errors.NoHandlerError, function (err) {
					return Promise.reject(new errors.NotFoundError(err.message));
				});
		}
		// This is an Event Channel
		this.emit('data', {pattern: pattern, payload: payload});
		return this;
	},

	setHandler: function (handler) {
		this.handler = handler;
	}
});

InprocessTransport.create = function () {
	return new InprocessTransport();
};
