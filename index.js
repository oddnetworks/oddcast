'use strict';

var Promise = require('bluebird');
var patrun = require('patrun');

var errors = require('./lib/errors');

exports.newChannelPrototype = function () {
	var self = Object.create(null);
	var transportIndex = Object.create(null);
	var transportMatcher = exports.createSingleMatcher();
	var singleHandlerIndexes = Object.create(null);
	var multiHandlerIndexes = Object.create(null);
	var singleHandlerMatchers = Object.create(null);
	var multiHandlerMatchers = Object.create(null);

	self.use = function (pattern, transportFactory, options) {
		options = options || Object.create(null);
		options.api = self;
		var transport = transportFactory(options);
		if (typeof pattern === 'string') {
			transportIndex[pattern] = transport;
		} else if (typeof pattern === 'object' && !Array.isArray(pattern)) {
			transportMatcher.add(pattern, transport);
		}
	};

	self.findSingle = function (key, pattern) {
		var index;
		var matcher;
		var handler;
		if (typeof pattern === 'string') {
			index = singleHandlerIndexes[key];
			if (!index) {
				return null;
			}
			handler = index[pattern];
			if (!handler) {
				return null;
			}
			return handler;
		} else if (typeof pattern === 'object' && !Array.isArray(pattern)) {
			matcher = singleHandlerMatchers[key];
			if (!matcher) {
				return null;
			}
			handler = matcher.find(pattern);
			if (!handler) {
				return null;
			}
			return handler;
		}
	};

	self.addSingle = function (key, pattern, fn) {
		var index;
		var matcher;
		if (typeof pattern === 'string') {
			index = singleHandlerIndexes[key];
			if (!index) {
				index = singleHandlerIndexes[key] = Object.create(null);
			}
			if (index[pattern]) {
				return false;
			}
			index[pattern] = fn;
			return false;
		} else if (typeof pattern === 'object' && !Array.isArray(pattern)) {
			matcher = singleHandlerMatchers[key];
			if (!matcher) {
				matcher = singleHandlerMatchers[key] = exports.createMultiMatcher();
			}
			if (matcher.find(pattern)) {
				return false;
			}
			matcher.add(pattern, fn);
			return true;
		}
	};

	self.removeSingle = function (key, pattern, fn) {
		var index;
		var matcher;
		var found = false;
		if (typeof pattern === 'string') {
			index = singleHandlerIndexes[key];
			if (!index) {
				return false;
			}
			if (!index[pattern]) {
				return false;
			}
			found = index[pattern] === fn;
			delete index[pattern];
			return found;
		} else if (typeof pattern === 'object' && !Array.isArray(pattern)) {
			matcher = singleHandlerMatchers[key];
			if (!matcher) {
				return false;
			}
			if (matcher.find(pattern)) {
				matcher.remove(pattern);
				return true;
			}
			return false;
		}
	};

	self.findMulti = function (key, pattern) {
		var index;
		var handlers;
		var matcher;
		if (typeof pattern === 'string') {
			index = multiHandlerIndexes[key];
			if (!index) {
				return [];
			}
			handlers = index[pattern];
			if (!handlers) {
				return [];
			}
			return handlers;
		} else if (typeof pattern === 'object' && !Array.isArray(pattern)) {
			matcher = multiHandlerMatchers[key];
			if (!matcher) {
				return [];
			}
			handlers = matcher.find(pattern);
			if (!handlers) {
				return [];
			}
			return handlers;
		}
	};

	self.addMulti = function (key, pattern, fn) {
		var index;
		var handlers;
		var matcher;
		if (typeof pattern === 'string') {
			index = multiHandlerIndexes[key];
			if (!index) {
				index = multiHandlerIndexes[key] = Object.create(null);
			}
			handlers = index[pattern];
			if (!handlers) {
				handlers = index[pattern] = [];
			}
			handlers.push(fn);
		} else if (typeof pattern === 'object' && !Array.isArray(pattern)) {
			matcher = multiHandlerMatchers[key];
			if (!matcher) {
				matcher = multiHandlerMatchers[key] = exports.createMultiMatcher();
			}
			matcher.add(pattern, fn);
		}
	};

	self.removeMulti = function (key, pattern, fn) {
		var index;
		var handlers;
		var i;
		var matcher;
		if (typeof pattern === 'string') {
			index = multiHandlerIndexes[key];
			if (!index) {
				return false;
			}
			handlers = index[pattern];
			if (!handlers) {
				return false;
			}
			i = handlers.indexOf(fn);
			if (i < 0) {
				return false;
			}
			handlers.splice(i, 1);
			return true;
		} else if (typeof pattern === 'object' && !Array.isArray(pattern)) {
			matcher = multiHandlerMatchers[key];
			if (!matcher) {
				return false;
			}
			handlers = matcher.find(pattern);
			if (!handlers) {
				return false;
			}
			i = handlers.indexOf(fn);
			if (i < 0) {
				return false;
			}
			handlers.splice(i, 1);
			return true;
		}
	};

	self.findTransport = function (pattern) {
		if (typeof pattern === 'string') {
			return transportIndex[pattern];
		} else if (typeof pattern === 'object' && !Array.isArray(pattern)) {
			return transportMatcher.find(pattern);
		}
	};

	return self;
};

exports.newSpamChannel = function () {
	var self = Object.create(exports.newChannelPrototype());

	self.broadcast = function (pattern, payload) {
		var transport = self.findTransport(pattern);
		transport.broadcast(pattern, payload);
	};

	self.observe = function (pattern, observer) {
		var transport = self.findTransport(pattern);
		transport.observe(pattern, observer);
	};

	self.removeObserver = function (pattern, observer) {
		var transport = self.findTransport(pattern);
		transport.removeObserver(pattern, observer);
	};

	return self;
};

exports.newCommandChannel = function () {
	var self = Object.create(exports.newChannelPrototype());

	self.send = function (address, payload) {
		var transport = self.findTransport(address);
		transport.send(address, payload);
	};

	self.addHandler = function (address, handler) {
		var transport = self.findTransport(address);
		transport.addHandler(address, handler);
	};

	self.removeHandler = function (address, handler) {
		var transport = self.findTransport(address);
		transport.removeHandler(address, handler);
	};

	return self;
};

exports.newLocalChannel = function () {
	var self = Object.create(exports.newChannelPrototype());

	self.request = function (address, payload) {
		var transport = self.findTransport(address);
		var res = transport.request(address, payload);
		if (res === false) {
			return Promise.reject(new errors.NotFoundError('Not found: ' + address));
		}
		return Promise.resolve(res);
	};

	self.registerHandler = function (address, handler) {
		var transport = self.findTransport(address);
		return transport.registerHandler(address, handler);
	};

	self.unregisterHandler = function (address, handler) {
		var transport = self.findTransport(address);
		transport.unregisterHandler(address, handler);
	};

	self.trigger = function (pattern, payload) {
		var transport = self.findTransport(pattern);
		transport.trigger(pattern, payload);
	};

	self.listen = function (pattern, handler) {
		var transport = self.findTransport(pattern);
		transport.listen(pattern, handler);
	};

	self.stopListening = function (pattern, handler) {
		var transport = self.findTransport(pattern);
		transport.stopListening(pattern, handler);
	};

	return self;
};

exports.createSingleMatcher = function () {
	return patrun();
};

exports.createMultiMatcher = function () {
	return patrun(function (pattern, fn) {
		var api = Object.create(null);
		var exactMatches = true;
		var items = this.find(pattern, exactMatches) || [];
		items.push(fn);

		api.find = function () {
			return items.length > 0 ? items : null;
		};

		api.remove = function () {
			items.pop();
			return items.length === 0;
		};

		return api;
	});
};

