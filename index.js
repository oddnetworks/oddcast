'use strict';

var EventEmitter = require('events');

exports.errors = require('./lib/errors');

exports.inprocessTransport = require('./lib/inprocess_transport');

exports.channelPrototype = function () {
	var self = Object.create(EventEmitter.prototype);
	EventEmitter.init.call(self);
	var transportMatcher = exports.PatternMatcher.create();

	self.use = function (pattern, transportFactory) {
		var matcher = exports.createChannelMatcher();
		matcher.notifyError = function (err) {
			self.emit('error', err);
		};
		var transport = transportFactory(matcher);
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
		return transport.broadcast(pattern, payload);
	};

	self.observe = function (pattern, observer) {
		if (typeof observer !== 'function') {
			throw new Error('observe() expects a function as the second argument.');
		}
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

	self.send = function (pattern, payload) {
		var transport = self.findTransport(pattern);
		return transport.send(pattern, payload);
	};

	self.receive = function (pattern, handler) {
		if (typeof handler !== 'function') {
			throw new Error('receive() expects a function as the second argument.');
		}
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

	self.request = function (pattern, payload) {
		var transport = self.findTransport(pattern);
		return transport.request(pattern, payload);
	};

	self.reply = function (pattern, handler) {
		if (typeof handler !== 'function') {
			throw new Error('reply() expects a function as the second argument.');
		}
		var transport = self.findTransport(pattern);
		return transport.registerHandler(pattern, handler);
	};

	self.remove = function (pattern, handler) {
		var transport = self.findTransport(pattern);
		return transport.unregisterHandler(pattern, handler);
	};

	return self;
};

function PatternMatcher() {
	this.index = Object.create(null);
}

exports.PatternMatcher = PatternMatcher;

PatternMatcher.prototype.add = function (objectPattern, object) {
	var stringPattern = this.patternToString(objectPattern);
	var list = this.index[stringPattern];
	if (!list) {
		list = this.index[stringPattern] = [];
	}
	list.push(object);
};

PatternMatcher.prototype.find = function (objectPattern) {
	var stringPattern = this.patternToString(objectPattern);
	var index = this.index;

	return Object.keys(index).reduce(function (matches, pattern) {
		if (stringPattern.indexOf(pattern) > -1) {
			matches = matches.concat(index[pattern]);
		}
		return matches;
	}, []);
};

PatternMatcher.prototype.exists = function (objectPattern) {
	var stringPattern = this.patternToString(objectPattern);
	return Boolean(this.index[stringPattern]);
};

PatternMatcher.prototype.remove = function (objectPattern, object) {
	var stringPattern = this.patternToString(objectPattern);
	var matches;
	var i;

	if (typeof object === 'undefined') {
		if (this.index[stringPattern]) {
			delete this.index[stringPattern];
			return true;
		}
		return false;
	}

	matches = this.index[stringPattern];
	i = matches.indexOf(object);
	if (i >= 0) {
		matches.splice(i, 1);
		return true;
	}

	return false;
};

PatternMatcher.prototype.patternToString = function (objectPattern) {
	var self = this;
	if (objectPattern && typeof objectPattern === 'object') {
		return Object.keys(objectPattern).sort().map(function (key) {
			return key + ':' + self.objectToString(objectPattern[key]);
		}).join();
	}
	return this.objectToString(objectPattern);
};

PatternMatcher.prototype.objectToString = function (object) {
	if (typeof object === 'string') {
		return object;
	}
	if (typeof object === 'boolean' || (typeof object === 'number' && !isNaN(object))) {
		return object.toString();
	}
	if (object && (typeof object === 'object' || typeof object === 'function')) {
		return Object.prototype.call(object);
	}
	if (object === null || typeof object === 'undefined' || isNaN(object)) {
		return 'null';
	}
	return Object.prototype.toString.call(object);
};

PatternMatcher.create = function () {
	return new PatternMatcher();
};
