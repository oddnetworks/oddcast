'use strict';

var util = require('util');
var oddcast = require('../');

function NotFoundError(message) {
	Error.call(this);
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	this.message = message;
}
util.inherits(NotFoundError, Error);
exports.NotFoundError = NotFoundError;

function NoTransportError(pattern) {
	Error.call(this);
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	var patternString = oddcast.PatternMatcher.prototype.patternToString(pattern);
	this.message = 'No transport mounted for pattern ' + patternString;
}
util.inherits(NoTransportError, Error);
exports.NoTransportError = NoTransportError;
