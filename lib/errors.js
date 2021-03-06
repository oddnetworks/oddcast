'use strict';

var util = require('util');

function NotFoundError(message) {
	Error.call(this);
	this.name = this.constructor.name;
	this.message = message;
	Error.captureStackTrace(this, this.constructor);
}
util.inherits(NotFoundError, Error);
NotFoundError.prototype.toString = errorToString;
exports.NotFoundError = NotFoundError;

function NoTransportError(pattern) {
	Error.call(this);
	this.name = this.constructor.name;
	this.message = `No transport mounted for pattern ${JSON.stringify(pattern)}`;
	Error.captureStackTrace(this, this.constructor);
}
util.inherits(NoTransportError, Error);
NoTransportError.prototype.toString = errorToString;
exports.NoTransportError = NoTransportError;

function NoHandlerError(pattern) {
	Error.call(this);
	this.name = this.constructor.name;
	this.message = `No handler for pattern ${JSON.stringify(pattern)}`;
	Error.captureStackTrace(this, this.constructor);
}
util.inherits(NoHandlerError, Error);
NoHandlerError.prototype.toString = errorToString;
exports.NoHandlerError = NoHandlerError;

function errorToString() {
	return this.name + ': ' + this.message;
}
