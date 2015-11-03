'use strict';

var EventEmitter = require('events');

exports.errors = require('./lib/errors');

exports.inprocessTransport = require('./lib/inprocess_transport');

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
		return matcher.find(pattern)[0];
	};

	self.addSingle = function (key, pattern, fn) {
		var matcher = singleHandlerMatchers[key];
		if (!matcher) {
			matcher = singleHandlerMatchers[key] = exports.PatternMatcher.create();
		}
		if (matcher.exists(pattern)) {
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
		if (matcher.exists(pattern)) {
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
		return matcher.find(pattern);
	};

	self.addMulti = function (key, pattern, fn) {
		var matcher = multiHandlerMatchers[key];
		if (!matcher) {
			matcher = multiHandlerMatchers[key] = exports.PatternMatcher.create();
		}
		matcher.add(pattern, fn);
		return true;
	};

	self.removeMulti = function (key, pattern, fn) {
		var matcher = multiHandlerMatchers[key];
		if (!matcher) {
			return false;
		}
		return matcher.remove(pattern, fn);
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
