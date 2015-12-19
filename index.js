'use strict';

var EventEmitter = require('events');
var errors = require('./lib/errors');

exports.errors = errors;
exports.inprocessTransport = require('./lib/inprocess_transport');

exports.channelPrototype = function () {
	var self = Object.create(EventEmitter.prototype);
	EventEmitter.init.call(self);
	var transportMatcher = exports.PatternMatcher.create();

	self.use = function (pattern, transportFactory) {
		var matcher = exports.createChannelMatcher();
		var transport = transportFactory(matcher);
		if (typeof transport.on === 'function') {
			transport.on('error', function (err) {
				self.emit('error', err);
			});
		}
		transportMatcher.remove(pattern);
		transportMatcher.add(pattern, transport);
	};

	self.findTransport = function (pattern) {
		return transportMatcher.find(pattern)[0];
	};

	return self;
};

exports.ChannelMatcher = {
	findSingle: function (pattern) {
		return this.matcher.find(pattern)[0];
	},

	addSingle: function (pattern, fn) {
		if (this.matcher.exists(pattern)) {
			return false;
		}
		this.matcher.add(pattern, fn);
		return true;
	},

	removeSingle: function (pattern) {
		if (this.matcher.exists(pattern)) {
			this.matcher.remove(pattern);
			return true;
		}
		return false;
	},

	findMulti: function (pattern) {
		return this.matcher.find(pattern);
	},

	addMulti: function (pattern, fn) {
		this.matcher.add(pattern, fn);
		return true;
	},

	removeMulti: function (pattern, fn) {
		return this.matcher.remove(pattern, fn);
	}
};

exports.createChannelMatcher = function () {
	var self = Object.create(exports.ChannelMatcher);
	self.matcher = exports.PatternMatcher.create();
	return self;
};

exports.eventChannel = function () {
	var self = Object.create(exports.channelPrototype());

	self.broadcast = function (pattern, payload) {
		var transport = self.findTransport(pattern);
		if (!transport) {
			throw new errors.NoTransportError(pattern);
		}
		return transport.broadcast(pattern, payload);
	};

	self.observe = function (pattern, observer) {
		if (typeof observer !== 'function') {
			throw new Error('observe() expects a function as the second argument.');
		}
		var transport = self.findTransport(pattern);
		if (!transport) {
			throw new errors.NoTransportError(pattern);
		}
		return transport.observe(pattern, observer);
	};

	self.remove = function (pattern, observer) {
		var transport = self.findTransport(pattern);
		if (!transport) {
			throw new errors.NoTransportError(pattern);
		}
		return transport.remove(pattern, observer);
	};

	return self;
};

exports.commandChannel = function () {
	var self = Object.create(exports.channelPrototype());

	self.send = function (pattern, payload) {
		var transport = self.findTransport(pattern);
		return transport.send(pattern, payload);
	};

	self.receive = function (pattern, handler) {
		if (typeof handler !== 'function') {
			throw new Error('receive() expects a function as the second argument.');
		}
		var transport = self.findTransport(pattern);
		if (!transport) {
			throw new errors.NoTransportError(pattern);
		}
		return transport.addHandler(pattern, handler);
	};

	self.remove = function (pattern, handler) {
		var transport = self.findTransport(pattern);
		if (!transport) {
			throw new errors.NoTransportError(pattern);
		}
		return transport.remove(pattern, handler);
	};

	return self;
};

exports.requestChannel = function () {
	var self = Object.create(exports.channelPrototype());

	self.request = function (pattern, payload) {
		var transport = self.findTransport(pattern);
		if (!transport) {
			throw new errors.NoTransportError(pattern);
		}
		return transport.request(pattern, payload);
	};

	self.reply = function (pattern, handler) {
		if (typeof handler !== 'function') {
			throw new Error('reply() expects a function as the second argument.');
		}
		var transport = self.findTransport(pattern);
		if (!transport) {
			throw new errors.NoTransportError(pattern);
		}
		return transport.registerHandler(pattern, handler);
	};

	self.remove = function (pattern, handler) {
		var transport = self.findTransport(pattern);
		if (!transport) {
			throw new errors.NoTransportError(pattern);
		}
		return transport.remove(pattern, handler);
	};

	return self;
};
