'use strict';
var EventChannel = require('./event_channel');
var CommandChannel = require('./command_channel');
var RequestChannel = require('./request_channel');
var InprocessTransport = require('./inprocess_transport');

exports.eventChannel = EventChannel.create;
exports.commandChannel = CommandChannel.create;
exports.requestChannel = RequestChannel.create;
exports.inprocessTransport = InprocessTransport.create;
