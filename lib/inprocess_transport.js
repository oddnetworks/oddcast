'use strict';

var Promise = require('bluebird');
var EventEmitter = require('events');
var oddcast = require('../');

module.exports = function () {
	return function createInprocessTransport(api) {
		var self = Object.create(EventEmitter.prototype);
		EventEmitter.init.call(self);

		// Broadcast Channel

		self.broadcast = function (pattern, payload) {
			var handlers = api.findMulti(pattern);

			if (handlers.length) {
				// Fire in the next turn of the event loop and wrap in a Promise for
				// better error handling.
				Promise.resolve(payload)
					.then(function triggerObservers(payload) {
						handlers.forEach(function executeObserver(fn) {
							fn(payload);
						});
					})
					.catch(function (err) {
						self.emit('error', err);
					});
			}
			return Promise.resolve(true);
		};

		self.observe = function (pattern, observer) {
			return Promise.resolve(api.addMulti(pattern, observer));
		};

		self.remove = function (pattern, observer) {
			return Promise.resolve(api.removeMulti(pattern, observer));
		};

		// Command Channel

		self.send = function (pattern, payload) {
			var handler = api.findSingle(pattern);

			if (handler) {
				// Fire in the next turn of the event loop and wrap in a Promise for
				// better error handling.
				Promise.resolve(payload)
					.then(handler)
					.catch(function (err) {
						self.emit('error', err);
					});
			}
			return Promise.resolve(true);
		};

		self.addHandler = function (pattern, handler) {
			return Promise.resolve(api.addSingle(pattern, handler));
		};

		self.remove = function (pattern, handler) {
			return Promise.resolve(api.removeSingle(pattern, handler));
		};

		// Request Channel

		self.request = function (pattern, payload) {
			var handler = api.findSingle(pattern);
			if (!handler) {
				return Promise.reject(new oddcast.errors.NotFoundError('No handler for the requested pattern.'));
			}

			// Fire in the next turn of the event loop and wrap in a Promise for
			// better error handling.
			return Promise.resolve(payload).then(handler);
		};

		self.registerHandler = function (pattern, handler) {
			return Promise.resolve(api.addSingle(pattern, handler));
		};

		self.remove = function (pattern, handler) {
			return Promise.resolve(api.removeSingle(pattern, handler));
		};

		return self;
	};
};
