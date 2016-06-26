'use strict';

const util = require('util');
const EventEmitter = require('events');

function StreamTransport() {
	EventEmitter.call(this);
}

module.exports = StreamTransport;

util.inherits(StreamTransport, EventEmitter);

StreamTransport.prototype.write = function (message) {
	this.emit('data', message);
};

StreamTransport.prototype.resume = function () {};

StreamTransport.create = function () {
	return new StreamTransport();
};
