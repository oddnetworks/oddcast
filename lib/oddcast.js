'use strict';
var EventChannel = require('./event-channel');
var CommandChannel = require('./command-channel');
var RequestChannel = require('./request-channel');
var InprocessTransport = require('./inprocess-transport');
var Bus = require('./bus');
var errors = require('./errors');

exports.errors = errors;
exports.eventChannel = EventChannel.create;
exports.commandChannel = CommandChannel.create;
exports.requestChannel = RequestChannel.create;
exports.inprocessTransport = InprocessTransport.create;
exports.bus = Bus.create;
