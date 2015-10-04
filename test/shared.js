'use strict';

var util = require('util');

function TestError(message) {
	Error.call(this);
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	this.message = message;
}
util.inherits(TestError, Error);
exports.TestError = TestError;
