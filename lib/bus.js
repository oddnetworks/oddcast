'use strict';
var Promise = require('bluebird');
var utils = require('./utils');

var EventChannel = require('./event_channel');
var CommandChannel = require('./command_channel');
var RequestChannel = require('./request_channel');
var Action = require('./action');

function Bus(spec) {
	Object.defineProperties(this, {
		events: {
			enumerable: true,
			value: spec.events
		},
		commands: {
			enumerable: true,
			value: spec.commands
		},
		requests: {
			enumerable: true,
			value: spec.requests
		}
	});
}

module.exports = Bus;

utils.extend(Bus.prototype, {
	observe: function (pattern, handler) {
		this.events.observe(pattern, handler);
		return this;
	},

	broadcast: function (pattern, payload) {
		this.events.broadcast(pattern, payload);
		return this;
	},

	queryHandler: function (pattern, handler) {
		this.requests.respond(pattern, function (args) {
			return new Promise(function queryHandlerWrapper(resolve, reject) {
				if (handler.length > 1) {
					handler(args, function (err, res) {
						if (err) {
							reject(err);
						} else {
							resolve(res);
						}
					});
				} else {
					var res = handler(args);
					if (res && typeof res.then === 'function') {
						res.then(resolve, reject);
					} else {
						throw new Error('A Promise is expected from a queryHandler when ' +
							'no callback is supplied');
					}
				}
			});
		});

		return this;
	},

	query: function (pattern, args) {
		return this.requests.request(pattern, args);
	},

	commandHandler: function (pattern, handler) {
		var self = this;
		this.commands.receive(pattern, function (action) {
			var payload = action.payload;
			var promise = new Promise(function commandHandlerWrapper(resolve, reject) {
				if (handler.length > 1) {
					handler(payload, function (err, res) {
						if (err) {
							reject(err);
						} else {
							resolve(res);
						}
					});
				} else {
					var res = handler(payload);
					if (res && typeof res.then === 'function') {
						res.then(resolve, reject);
					} else {
						throw new Error('A Promise is expected from a commandHandler when ' +
							'no callback is supplied');
					}
				}
			});

			return promise.then(
				function (res) {
					var thisAction = action.withResult(res);
					self.events.broadcast(thisAction.pattern, thisAction);
					return true;
				},
				function (err) {
					var thisAction = action.withError(err);
					self.events.broadcast(thisAction.pattern, thisAction);
					return Promise.reject(err);
				}
			);
		});

		return this;
	},

	sendCommand: function (pattern, payload) {
		var self = this;
		var action = Action.create(pattern, payload);

		return new Promise(function (resolve, reject) {
			function onComplete(newAction) {
				if (newAction.id === action.id) {
					self.events.remove(pattern, onComplete);
					if (newAction.error) {
						return reject(newAction.error);
					}
					return resolve(newAction.result);
				}
			}

			self.events.observe(pattern, onComplete);
			self.commands.send(pattern, action);
		});
	}
});

Bus.create = function (options) {
	options = options || Object.create(null);

	return new Bus({
		events: options.events || EventChannel.create(),
		commands: options.commands || CommandChannel.create(),
		requests: options.requests || RequestChannel.create()
	});
};
