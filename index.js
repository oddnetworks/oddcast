'use strict';

var EventEmitter = require('events');
var patrun = require('patrun');

exports.errors = require('./lib/errors');

exports.channelPrototype = function () {
	var self = Object.create(EventEmitter.prototype);
	EventEmitter.init.call(self);
	var transportMatcher = exports.createSingleMatcher();
	var singleHandlerMatchers = Object.create(null);
	var multiHandlerMatchers = Object.create(null);

	self.use = function (pattern, transportFactory) {
		var transport = transportFactory(self);
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
			matcher = singleHandlerMatchers[key] = exports.createSingleMatcher();
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

exports.eventChannel = function () {
	var self = Object.create(exports.channelPrototype());

	self.broadcast = function (pattern) {
		var transport = self.findTransport(pattern);
		return transport.broadcast(pattern);
	};

	self.observe = function (pattern, observer) {
		var transport = self.findTransport(pattern);
		return transport.observe(pattern, observer);
	};

	self.remove = function (pattern, observer) {
		var transport = self.findTransport(pattern);
		return transport.removeObserver(pattern, observer);
	};

	return self;
};

exports.commandChannel = function () {
	var self = Object.create(exports.channelPrototype());

	self.send = function (pattern) {
		var transport = self.findTransport(pattern);
		return transport.send(pattern);
	};

	self.receive = function (pattern, handler) {
		var transport = self.findTransport(pattern);
		return transport.addHandler(pattern, handler);
	};

	self.remove = function (pattern, handler) {
		var transport = self.findTransport(pattern);
		return transport.removeHandler(pattern, handler);
	};

	return self;
};

exports.requestChannel = function () {
	var self = Object.create(exports.channelPrototype());

	self.request = function (pattern) {
		var transport = self.findTransport(pattern);
		return transport.request(pattern);
	};

	self.reply = function (pattern, handler) {
		var transport = self.findTransport(pattern);
		return transport.registerHandler(pattern, handler);
	};

	self.remove = function (pattern, handler) {
		var transport = self.findTransport(pattern);
		return transport.unregisterHandler(pattern, handler);
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

