'use strict';
var EventEmitter = require('events');
var util = require('util');
var utils = require('./utils');
var errors = require('./errors');
var PatternMatcher = require('./pattern_matcher');

function Channel() {
	EventEmitter.call(this);

	Object.defineProperties(this, {
		transportMatcher: {
			writable: true,
			enumerable: false,
			configurable: false,
			value: PatternMatcher.create()
		},
		handlerMatcher: {
			writable: true,
			enumerable: false,
			configurable: false,
			value: PatternMatcher.create()
		},
		onErrorBound: {
			writable: true,
			enumerable: false,
			configurable: false,
			value: this.onerror.bind(this)
		}
	});
}

util.inherits(Channel, EventEmitter);

module.exports = Channel;

utils.extend(Channel.prototype, {
	addSingleHandler: function (pattern, fn) {
		if (typeof fn !== 'function') {
			throw new Error(
				'expects a function as the second argument when adding a handler.');
		}
		if (this.handlerMatcher.exists(pattern)) {
			return false;
		}
		this.handlerMatcher.add(pattern, fn);
		return true;
	},

	addMultiHandler: function (pattern, fn) {
		if (typeof fn !== 'function') {
			throw new Error(
				'expects a function as the second argument when adding a handler.');
		}
		this.handlerMatcher.add(pattern, fn);
		return true;
	},

	remove: function (pattern, fn) {
		return this.handlerMatcher.remove(pattern, fn);
	},

	broadcast: function (pattern, payload) {
		var transports = this.transportMatcher.find(pattern);

		if (!transports.length) {
			throw new errors.NoTransportError(pattern);
		}

		transports.forEach(function (transport) {
			transport.write({
				pattern: pattern,
				payload: payload
			});
		});

		return this;
	},

	use: function (pattern, transport) {
		var patternString;

		if (this.transportMatcher.exists(pattern)) {
			patternString = PatternMatcher.prototype.patternToString(pattern);
			throw new Error('A transport already exists on ' + patternString);
		}

		this.transportMatcher.add(pattern, transport);

		if (typeof transport.setHandler === 'function') {
			transport.setHandler(this.onMessageHandler(transport));
		}

		transport.on('error', this.onErrorBound);

		if (typeof transport.resume === 'function') {
			transport.resume();
		}

		return this;
	},

	useStream: function (pattern, transport) {
		this.transportMatcher.add(pattern, transport);
		transport.on('data', this.onEventHandler(transport));
		transport.on('error', this.onErrorBound);
		if (typeof transport.resume === 'function') {
			transport.resume();
		}
		return this;
	},

	onMessageHandler: function (transport) {
		var self = this;

		return function ondata(message) {
			var pattern = message.pattern;
			var payload = message.payload;
			var handler;

			// Only emit messages and report success to the transport if the
			// the originating transport is registered for this pattern.
			if (self.transportMatcher.find(pattern).indexOf(transport) > -1) {
				handler = self.handlerMatcher.find(pattern)[0];
				if (handler) {
					return self.executeHandler(handler, payload);
				}
				return Promise.reject(new errors.NoHandlerError(pattern));
			}
			return Promise.reject(new errors.NoTransportError(pattern));
		};
	},

	onEventHandler: function (transport) {
		var self = this;

		return function ondata(data) {
			var pattern = data.pattern;
			var payload = data.payload;

			// Only emit messages if we have a transport registered for this pattern.
			if (self.transportMatcher.find(pattern).indexOf(transport) > -1) {
				self.handlerMatcher.find(pattern).forEach(function (handler) {
					self.executeHandler(handler, payload);
				});
			}
		};
	},

	executeHandler: function (handler, payload) {
		var self = this;

		// Give all our handlers a chance to execute before firing the error
		// event in another turn of the event loop.
		process.nextTick(function () {
			try {
				return Promise.resolve(handler(payload));
			} catch (err) {
				self.emit('error', err);
				return Promise.reject(err);
			}
		});
	},

	onerror: function (err) {
		this.emit('error', err);
	}
});

Channel.create = function () {
	return new Channel();
};
