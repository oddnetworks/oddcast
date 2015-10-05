'use strict';

var Promise = require('bluebird');
var oddcast = require('../');

module.exports = function (options) {
	var self = Object.create(null);
	var api = options.api;

	// Spam Channel

	self.broadcast = function (pattern, payload) {
		var handlers = api.findMulti('local-emitter', pattern);
		if (!handlers.length) {
			return Promise.resolve(false);
		}

		// Fire in the next turn of the event loop and wrap in a Promise for
		// better error handling.
		Promise.resolve(payload)
			.then(function triggerObservers(payload) {
				handlers.forEach(function executeObserver(fn) {
					fn(payload);
				});
			})
			.catch(api.notifyError);
		return Promise.resolve(true);
	};

	self.observe = function (pattern, observer) {
		return Promise.resolve(api.addMulti('local-emitter', pattern, observer));
	};

	self.removeObserver = function (pattern, observer) {
		return Promise.resolve(api.removeMulti('local-emitter', pattern, observer));
	};

	// Command Channel

	self.send = function (pattern, payload) {
		var handlers = api.findMulti('local-queue', pattern);
		if (!handlers.length) {
			return Promise.resolve(false);
		}
		var handler = handlers[Math.floor(Math.random() * handlers.length)];

		// Fire in the next turn of the event loop and wrap in a Promise for
		// better error handling.
		Promise.resolve(payload)
			.then(handler)
			.catch(api.notifyError);
		return Promise.resolve(true);
	};

	self.addHandler = function (pattern, handler) {
		return Promise.resolve(api.addMulti('local-queue', pattern, handler));
	};

	self.removeHandler = function (pattern, handler) {
		return Promise.resolve(api.removeMulti('local-queue', pattern, handler));
	};

	// Request Channel

	self.request = function (pattern, payload) {
		var handler = api.findSingle('local-requests', pattern);
		if (!handler) {
			return Promise.reject(new oddcast.errors.NotFoundError('No handler for the requested pattern.'));
		}

		// Fire in the next turn of the event loop and wrap in a Promise for
		// better error handling.
		return Promise.resolve(payload).then(handler);
	};

	self.registerHandler = function (pattern, handler) {
		return Promise.resolve(api.addSingle('local-requests', pattern, handler));
	};

	self.unregisterHandler = function (pattern, handler) {
		return Promise.resolve(api.removeSingle('local-requests', pattern, handler));
	};

	return self;
};
