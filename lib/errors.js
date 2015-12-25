'use strict';

var util = require('util');
var PatternMatcher = require('./pattern_matcher');

function NotFoundError(message) {
	Error.call(this);
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	this.message = message;
}
util.inherits(NotFoundError, Error);
exports.NotFoundError = NotFoundError;

function NoTransportError(pattern) {
	if (!this) {
		debugger;
	}
	Error.call(this);
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	var patternString = PatternMatcher.prototype.patternToString(pattern);
	this.message = 'No transport mounted for pattern ' + patternString;
}
util.inherits(NoTransportError, Error);
exports.NoTransportError = NoTransportError;

function NoHandlerError(pattern) {
	Error.call(this);
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	var patternString = PatternMatcher.prototype.patternToString(pattern);
	this.message = 'No handler for pattern ' + patternString;
}
util.inherits(NoHandlerError, Error);
exports.NoHandlerError = NoHandlerError;
