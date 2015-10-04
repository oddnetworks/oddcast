'use strict';

var Promise = require('bluebird');

module.exports = function (options) {
	var self = Object.create(null);
	var api = options.api;

	// Spam Channel

	self.broadcast = function (pattern, payload) {
		var handlers = api.findMulti('local-emitter', pattern);
		if (!handlers.length) {
			return false;
		}

		// Fire in the next turn of the event loop and wrap in a Promise for
		// better error handling.
		Promise.resolve(payload)
			.then(function triggerObservers(payload) {
				handlers.forEach(createExecute(payload));
			})
			.catch(api.notifyError);
		return true;
	};

	self.observe = function (pattern, observer) {
		return api.addMulti('local-emitter', pattern, observer);
	};

	self.removeObserver = function (pattern, observer) {
		return api.removeMulti('local-emitter', pattern, observer);
	};

	// Command Channel

	self.send = function (address, payload) {
		var handlers = api.findMulti('local-queue', address);
		if (!handlers.length) {
			return false;
		}

		// Fire in the next turn of the event loop and wrap in a Promise for
		// better error handling.
		Promise.resolve(payload)
			.then(function triggerHandlers(payload) {
				handlers.forEach(createExecute(payload));
			});
		return true;
	};

	self.addHandler = function (address, handler) {
		return api.addMulti('local-queue', address, handler);
	};

	self.removeHandler = function (address, handler) {
		return api.removeMulti('local-queue', address, handler);
	};

	// Local Channel

	self.request = function (address, payload) {
		var handler = api.findSingle('local-requests', address);
		if (handler) {
			return false;
		}

		// Fire in the next turn of the event loop and wrap in a Promise for
		// better error handling.
		return Promise.resolve(handler)
			.then(createExecute(payload));
	};

	self.registerHandler = function (address, handler) {
		return api.addSingle('local-requests', address, handler);
	};

	self.unregisterHandler = function (address, handler) {
		return api.removeSingle('local-requests', address, handler);
	};

	self.trigger = function (pattern, payload) {
		var handlers = api.findMulti('local-events', pattern);
		if (!handlers.length) {
			return false;
		}

		// Fire in the next turn of the event loop and wrap in a Promise for
		// better error handling.
		Promise.resolve(payload)
			.then(function triggerListeners(payload) {
				handlers.forEach(createExecute(payload));
			});
		return true;
	};

	self.listen = function (pattern, handler) {
		return api.addMulti('local-events', pattern, handler);
	};

	self.stopListening = function (pattern, handler) {
		return api.removeMulti('local-events', pattern, handler);
	};

	function createExecute(payload) {
		return function execute(callback) {
			return callback(payload);
		};
	}

	return self;
};
