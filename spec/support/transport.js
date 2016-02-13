'use strict';

const util = require('util');
const EventEmitter = require('events');

function Transport() {
	EventEmitter.call(this);
}

module.exports = Transport;

util.inherits(Transport, EventEmitter);

Transport.prototype.setHandler = function (handler) {
	this.handler = handler;
};

Transport.prototype.write = function (message) {
	return this.handler(message);
};

Transport.prototype.resume = function () {};

Transport.create = function () {
	return new Transport();
};
