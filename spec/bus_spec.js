/* global describe, beforeAll, it, expect, spyOn */
/* eslint-disable max-nested-callbacks */
'use strict';
var Promise = require('bluebird');
var oddcast = require('../lib/oddcast');
var Bus = require('../lib/bus');

describe('Bus', function () {
	var CONST = Object.freeze({
		PATTERN1: {foo: 'bar'},
		HANDLER1: function () {},
		ARGS1: {ARGS: 1},
		PAYLOAD1: {PAYLOAD: 1},
		RES1: {RES: 1},
		RES2: {RES: 2},
		ERROR1: new Error('TEST_ERROR_1')
	});

	function createBus(spec) {
		var bus = Bus.create(spec);
		bus.events.use({}, oddcast.inprocessTransport());
		bus.commands.use({}, oddcast.inprocessTransport());
		bus.requests.use({}, oddcast.inprocessTransport());
		return bus;
	}

	describe('observe', function () {
		var RES1 = 'UNDEFINED';

		beforeAll(function () {
			this.bus = createBus();
			spyOn(this.bus.events, 'observe');
			RES1 = this.bus.observe(CONST.PATTERN1, CONST.HANDLER1);
		});

		it('calls the bus.events.observe function', function () {
			expect(this.bus.events.observe).toHaveBeenCalledTimes(1);
			expect(this.bus.events.observe).toHaveBeenCalledWith(
				CONST.PATTERN1,
				CONST.HANDLER1
			);
		});

		it('returns itself', function () {
			expect(RES1).toBe(this.bus);
		});
	});

	describe('broadcast', function () {
		var RES1 = 'UNDEFINED';

		beforeAll(function () {
			this.bus = createBus();
			spyOn(this.bus.events, 'broadcast');
			RES1 = this.bus.broadcast(CONST.PATTERN1, CONST.PAYLOAD1);
		});

		it('calls the bus.events.broadcast function', function () {
			expect(this.bus.events.broadcast).toHaveBeenCalledTimes(1);
			expect(this.bus.events.broadcast).toHaveBeenCalledWith(
				CONST.PATTERN1,
				CONST.PAYLOAD1
			);
		});

		it('returns itself', function () {
			expect(RES1).toBe(this.bus);
		});
	});

	describe('commands', function () {
		describe('handler returns non promise with no callback', function () {
			var ERROR1 = 'UNDEFINED';

			beforeAll(function (done) {
				this.bus = createBus();
				this.bus.commandHandler({foo: 'bar'}, function () {
					return undefined;
				});
				this.bus.sendCommand({foo: 'bar'}, CONST.ARGS1).then(done, function (err) {
					ERROR1 = err;
					done();
				});
			});

			it('rejects with an Error', function () {
				expect(ERROR1.message).toBe(
					'A Promise is expected from a queryHandler when no callback is supplied');
			});
		});

		describe('handler returns a promise and has a callback', function () {
			var RES = 'UNDEFINED';

			beforeAll(function (done) {
				this.bus = createBus();
				this.bus.commandHandler({foo: 'bar'}, function (args, next) {
					next(null, CONST.RES1);
					return Promise.resolve(CONST.RES2);
				});
				this.bus.sendCommand({foo: 'bar'}, CONST.ARGS1).then(function (res) {
					RES = res;
					done();
				}, done.fail);
			});

			it('returns the value passed to the callback', function () {
				expect(RES).toBe(CONST.RES1);
			});
		});

		describe('handler returns promise', function () {
			var RES = 'UNDEFINED';
			var ARGS = 'UNDEFINED';

			beforeAll(function (done) {
				this.bus = createBus();
				this.bus.commandHandler({foo: 'bar'}, function (args) {
					ARGS = args;
					return Promise.resolve(CONST.RES1);
				});
				this.bus.command({foo: 'bar'}, CONST.ARGS1).then(function (res) {
					RES = res;
					done();
				}, done.fail);
			});

			it('returns the value passed to the callback', function () {
				expect(RES).toBe(CONST.RES1);
			});

			it('passes the given arguments Object', function () {
				expect(ARGS).toEqual(CONST.ARGS1);
			});
		});

		describe('handler returns rejected promise', function () {
			var ERROR = 'UNDEFINED';

			beforeAll(function (done) {
				this.bus = createBus();
				this.bus.commandHandler({foo: 'bar'}, function () {
					return Promise.reject(CONST.ERROR1);
				});
				this.bus.command({foo: 'bar'}, CONST.ARGS1).then(done, function (err) {
					ERROR = err;
					done();
				});
			});

			it('rejects with the rejected error', function () {
				expect(ERROR).toBe(CONST.ERROR1);
			});
		});

		describe('handler calls callback', function () {
			var RES = 'UNDEFINED';
			var ARGS = 'UNDEFINED';

			beforeAll(function (done) {
				this.bus = createBus();
				this.bus.commandHandler({foo: 'bar'}, function (args, next) {
					ARGS = args;
					next(null, CONST.RES1);
				});
				this.bus.sendCommand({foo: 'bar'}, CONST.ARGS1).then(function (res) {
					RES = res;
					done();
				}, done.fail);
			});

			it('returns the value passed to the callback', function () {
				expect(RES).toBe(CONST.RES1);
			});

			it('passes the given arguments Object', function () {
				expect(ARGS).toEqual(CONST.ARGS1);
			});
		});

		describe('handler calls callback with error', function () {
			var ERROR = 'UNDEFINED';

			beforeAll(function (done) {
				this.bus = createBus();
				this.bus.commandHandler({foo: 'bar'}, function (args, next) {
					next(CONST.ERROR1);
				});
				this.bus.sendCommand({foo: 'bar'}, CONST.ARGS1).then(done, function (err) {
					ERROR = err;
					done();
				});
			});

			it('rejects with the passed error', function () {
				expect(ERROR).toBe(CONST.ERROR1);
			});
		});
	});

	describe('queries', function () {
		describe('handler returns non promise with no callback', function () {
			var ERROR1 = 'UNDEFINED';

			beforeAll(function (done) {
				this.bus = createBus();
				this.bus.queryHandler({foo: 'bar'}, function () {
					return undefined;
				});
				this.bus.query({foo: 'bar'}, CONST.ARGS1).then(done, function (err) {
					ERROR1 = err;
					done();
				});
			});

			it('rejects with an Error', function () {
				expect(ERROR1.message).toBe(
					'A Promise is expected from a queryHandler when no callback is supplied');
			});
		});

		describe('handler returns a promise and has a callback', function () {
			var RES = 'UNDEFINED';

			beforeAll(function (done) {
				this.bus = createBus();
				this.bus.queryHandler({foo: 'bar'}, function (args, next) {
					next(null, CONST.RES1);
					return Promise.resolve(CONST.RES2);
				});
				this.bus.query({foo: 'bar'}, CONST.ARGS1).then(function (res) {
					RES = res;
					done();
				}, done.fail);
			});

			it('returns the value passed to the callback', function () {
				expect(RES).toBe(CONST.RES1);
			});
		});

		describe('handler returns promise', function () {
			var RES = 'UNDEFINED';
			var ARGS = 'UNDEFINED';

			beforeAll(function (done) {
				this.bus = createBus();
				this.bus.queryHandler({foo: 'bar'}, function (args) {
					ARGS = args;
					return Promise.resolve(CONST.RES1);
				});
				this.bus.query({foo: 'bar'}, CONST.ARGS1).then(function (res) {
					RES = res;
					done();
				}, done.fail);
			});

			it('returns the value passed to the callback', function () {
				expect(RES).toBe(CONST.RES1);
			});

			it('passes the given arguments Object', function () {
				expect(ARGS).toEqual(CONST.ARGS1);
			});
		});

		describe('handler returns rejected promise', function () {
			var ERROR = 'UNDEFINED';

			beforeAll(function (done) {
				this.bus = createBus();
				this.bus.queryHandler({foo: 'bar'}, function () {
					return Promise.reject(CONST.ERROR1);
				});
				this.bus.query({foo: 'bar'}, CONST.ARGS1).then(done, function (err) {
					ERROR = err;
					done();
				});
			});

			it('rejects with the rejected error', function () {
				expect(ERROR).toBe(CONST.ERROR1);
			});
		});

		describe('handler calls callback', function () {
			var RES = 'UNDEFINED';
			var ARGS = 'UNDEFINED';

			beforeAll(function (done) {
				this.bus = createBus();
				this.bus.queryHandler({foo: 'bar'}, function (args, next) {
					ARGS = args;
					next(null, CONST.RES1);
				});
				this.bus.query({foo: 'bar'}, CONST.ARGS1).then(function (res) {
					RES = res;
					done();
				}, done.fail);
			});

			it('returns the value passed to the callback', function () {
				expect(RES).toBe(CONST.RES1);
			});

			it('passes the given arguments Object', function () {
				expect(ARGS).toEqual(CONST.ARGS1);
			});
		});

		describe('handler calls callback with error', function () {
			var ERROR = 'UNDEFINED';

			beforeAll(function (done) {
				this.bus = createBus();
				this.bus.queryHandler({foo: 'bar'}, function (args, next) {
					next(CONST.ERROR1);
				});
				this.bus.query({foo: 'bar'}, CONST.ARGS1).then(done, function (err) {
					ERROR = err;
					done();
				});
			});

			it('rejects with the passed error', function () {
				expect(ERROR).toBe(CONST.ERROR1);
			});
		});
	});
});
