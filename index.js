'use strict';

var Promise = require('bluebird');
var EventEmitter = require('events');
var patrun = require('patrun');

var errors = require('./lib/errors');

exports.newChannelPrototype = function () {
	var self = Object.create(EventEmitter.prototype);
	EventEmitter.init.call(self);
	var transportMatcher = exports.createSingleMatcher();
	var singleHandlerMatchers = Object.create(null);
	var multiHandlerMatchers = Object.create(null);

	self.use = function (pattern, transportFactory, options) {
		options = options || Object.create(null);
		options.api = self;
		var transport = transportFactory(options);
		transportMatcher.add(pattern, transport);
	};

	self.findSingle = function (key, pattern) {
		var matcher = singleHandlerMatchers[key];
		if (!matcher) {
			return null;
		}
		return matcher.find(pattern);
	};

	self.addSingle = function (key, pattern, fn) {
		var matcher = singleHandlerMatchers[key];
		if (!matcher) {
			matcher = singleHandlerMatchers[key] = exports.createMultiMatcher();
		}
		if (matcher.find(pattern)) {
			return false;
		}
		matcher.add(pattern, fn);
		return true;
	};

	self.removeSingle = function (key, pattern) {
		var matcher = singleHandlerMatchers[key];
		if (!matcher) {
			return false;
		}
		if (matcher.find(pattern)) {
			matcher.remove(pattern);
			return true;
		}
		return false;
	};

	self.findMulti = function (key, pattern) {
		var matcher = multiHandlerMatchers[key];
		if (!matcher) {
			return [];
		}
		return matcher.find(pattern) || [];
	};

	self.addMulti = function (key, pattern, fn) {
		var matcher = multiHandlerMatchers[key];
		if (!matcher) {
			matcher = multiHandlerMatchers[key] = exports.createMultiMatcher();
		}
		matcher.add(pattern, fn);
		return true;
	};

	self.removeMulti = function (key, pattern, fn) {
		var i;
		var matcher = multiHandlerMatchers[key];
		if (!matcher) {
			return false;
		}
		var handlers = matcher.find(pattern);
		if (!handlers) {
			return false;
		}
		i = handlers.indexOf(fn);
		if (i < 0) {
			return false;
		}
		handlers.splice(i, 1);
		return true;
	};

	self.findTransport = function (pattern) {
		return transportMatcher.find(pattern);
	};

	self.notifyError = function (err) {
		self.emit('error', err);
	};

	return self;
};

exports.newSpamChannel = function () {
	var self = Object.create(exports.newChannelPrototype());

	self.broadcast = function (pattern, payload) {
		var transport = self.findTransport(pattern);
		return transport.broadcast(pattern, payload);
	};

	self.observe = function (pattern, observer) {
		var transport = self.findTransport(pattern);
		return transport.observe(pattern, observer);
	};

	self.removeObserver = function (pattern, observer) {
		var transport = self.findTransport(pattern);
		return transport.removeObserver(pattern, observer);
	};

	return self;
};

exports.newCommandChannel = function () {
	var self = Object.create(exports.newChannelPrototype());

	self.send = function (address, payload) {
		var transport = self.findTransport(address);
		return transport.send(address, payload);
	};

	self.addHandler = function (address, handler) {
		var transport = self.findTransport(address);
		return transport.addHandler(address, handler);
	};

	self.removeHandler = function (address, handler) {
		var transport = self.findTransport(address);
		return transport.removeHandler(address, handler);
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
		return transport.unregisterHandler(address, handler);
	};

	self.trigger = function (pattern, payload) {
		var transport = self.findTransport(pattern);
		return transport.trigger(pattern, payload);
	};

	self.listen = function (pattern, handler) {
		var transport = self.findTransport(pattern);
		return transport.listen(pattern, handler);
	};

	self.stopListening = function (pattern, handler) {
		var transport = self.findTransport(pattern);
		return transport.stopListening(pattern, handler);
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

