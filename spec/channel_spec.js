/* global jasmine, describe, beforeAll, it, expect, spyOn */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');

const errors = require('../lib/errors');
const NoHandlerError = errors.NoHandlerError;
const NoTransportError = errors.NoTransportError;

const Channel = require('../lib/channel');
const Transport = require('./support/transport');
const StreamTransport = require('./support/stream_transport');

describe('Channel', function () {
	describe('addSingleHandler', function () {
		describe('with same pattern', function () {
			const PAYLOAD = {PAYLOAD: 1};
			let RES1 = 'UNDEFINED';
			let RES2 = 'UNDEFINED';
			let HANDLER1 = jasmine.createSpy('HANDLER1');
			let HANDLER2 = jasmine.createSpy('HANDLER2');

			beforeAll(function () {
				this.channel = Channel.create();
				this.transport = Transport.create();
				this.channel.use({role: 'foo'}, this.transport);

				RES1 = this.channel.addSingleHandler({role: 'foo', cmd: 'bar'}, HANDLER1);
				RES2 = this.channel.addSingleHandler({role: 'foo', cmd: 'bar'}, HANDLER2);
			});

			it('returns true when first handler is added', function () {
				expect(RES1).toBe(true);
			});

			it('returns false after first handler is added', function () {
				expect(RES2).toBe(false);
			});

			describe('after message received', function () {
				beforeAll(function (done) {
					this.transport.write({
						pattern: {role: 'foo', cmd: 'bar'},
						payload: PAYLOAD
					})
					.then(done)
					.catch(done.fail);
				});

				it('calls the first handler once', function () {
					expect(HANDLER1).toHaveBeenCalled();
				});

				it('does not call the second handler', function () {
					expect(HANDLER2).not.toHaveBeenCalled();
				});
			});

			describe('after handler removed', function () {
				let ADD = 'UNDEFINED';
				let HANDLER = jasmine.createSpy('HANDLER');

				beforeAll(function (done) {
					this.channel.remove({role: 'foo', cmd: 'bar'});
					ADD = this.channel.addSingleHandler({role: 'foo', cmd: 'bar'}, HANDLER);

					this.transport.write({
						pattern: {role: 'foo', cmd: 'bar'},
						payload: PAYLOAD
					})
					.then(done)
					.catch(done.fail);
				});

				it('returns true for new handler', function () {
					expect(ADD).toBe(true);
				});

				it('calls the new handler once', function () {
					expect(HANDLER).toHaveBeenCalled();
				});
			});
		});

		describe('with different pattern', function () {
			const PAYLOAD1 = {PAYLOAD: 1};
			const PAYLOAD2 = {PAYLOAD: 2};
			let RES1 = 'UNDEFINED';
			let RES2 = 'UNDEFINED';
			let HANDLER1 = jasmine.createSpy('HANDLER1');
			let HANDLER2 = jasmine.createSpy('HANDLER2');

			beforeAll(function () {
				this.channel = Channel.create();
				this.transport = Transport.create();
				this.channel.use({role: 'foo'}, this.transport);

				RES1 = this.channel
					.addSingleHandler({role: 'foo', cmd: 'x', async: true}, HANDLER1);

				RES2 = this.channel
					.addSingleHandler({role: 'foo', cmd: 'y', async: true}, HANDLER2);
			});

			it('returns true when first handler is added', function () {
				expect(RES1).toBe(true);
			});

			it('returns true when second handler is added', function () {
				expect(RES2).toBe(true);
			});

			describe('after message received', function () {
				beforeAll(function (done) {
					Promise.all([
						this.transport.write({
							pattern: {role: 'foo', cmd: 'x', async: true},
							payload: PAYLOAD1
						}),
						this.transport.write({
							pattern: {role: 'foo', cmd: 'y', async: true},
							payload: PAYLOAD2
						})
					])
					.then(done)
					.catch(done.fail);
				});

				it('calls the first handler once', function () {
					expect(HANDLER1.calls.count()).toBe(1);
					const payload = HANDLER1.calls.mostRecent().args[0];
					expect(payload).toBe(PAYLOAD1);
				});

				it('does not call the second handler', function () {
					expect(HANDLER2.calls.count()).toBe(1);
					const payload = HANDLER2.calls.mostRecent().args[0];
					expect(payload).toBe(PAYLOAD2);
				});
			});

			describe('after handler removed', function () {
				beforeAll(function (done) {
					// Reset the spies
					HANDLER1.calls.reset();
					HANDLER2.calls.reset();

					this.channel.remove({role: 'foo', cmd: 'y', async: true});

					// We don't care about errors here. We're not testing execution
					// functionality.
					this.channel.on('error', function () {});

					Promise.all([
						this.transport.write({
							pattern: {role: 'foo', cmd: 'x', async: true},
							payload: PAYLOAD1
						}),
						this.transport.write({
							pattern: {role: 'foo', cmd: 'y', async: true},
							payload: PAYLOAD2
						})
					])
					.catch(NoHandlerError, function () {
						return Promise.delay(10);
					})
					.then(done)
					.catch(done.fail);
				});

				it('does not call the removed handler', function () {
					expect(HANDLER2).not.toHaveBeenCalled();
				});

				it('calls the remaining handler', function () {
					expect(HANDLER1).toHaveBeenCalled();
				});
			});
		});

		describe('with general pattern', function () {
			const PAYLOAD = {PAYLOAD: 1};
			let RES1 = 'UNDEFINED';
			let RES2 = 'UNDEFINED';
			let HANDLER1 = jasmine.createSpy('HANDLER1');
			let HANDLER2 = jasmine.createSpy('HANDLER2');

			beforeAll(function () {
				this.channel = Channel.create();
				this.transport = Transport.create();
				this.channel.use({role: 'foo'}, this.transport);

				RES1 = this.channel.addSingleHandler({role: 'foo', cmd: 'bar'}, HANDLER1);
				RES2 = this.channel.addSingleHandler({role: 'foo'}, HANDLER2);
			});

			it('returns true for specific pattern', function () {
				expect(RES1).toBe(true);
			});

			it('returns true for general pattern', function () {
				expect(RES2).toBe(true);
			});

			describe('after message received', function () {
				beforeAll(function (done) {
					this.transport.write({
						pattern: {role: 'foo'},
						payload: PAYLOAD
					})
					.then(done)
					.catch(done.fail);
				});

				it('does not call the first handler', function () {
					expect(HANDLER1).not.toHaveBeenCalled();
				});

				it('calls the second handler', function () {
					expect(HANDLER2).toHaveBeenCalled();
				});
			});
		});

		describe('with specific pattern', function () {
			const PAYLOAD = {PAYLOAD: 1};
			let RES1 = 'UNDEFINED';
			let RES2 = 'UNDEFINED';
			let HANDLER1 = jasmine.createSpy('HANDLER1');
			let HANDLER2 = jasmine.createSpy('HANDLER2');

			beforeAll(function () {
				this.channel = Channel.create();
				this.transport = Transport.create();
				this.channel.use({role: 'foo'}, this.transport);

				RES1 = this.channel.addSingleHandler({role: 'foo', cmd: 'bar'}, HANDLER1);
				RES2 = this.channel.addSingleHandler({role: 'foo', cmd: 'bar', async: true}, HANDLER2);
			});

			it('returns true for general pattern', function () {
				expect(RES1).toBe(true);
			});

			it('returns false for specific pattern', function () {
				expect(RES2).toBe(false);
			});

			describe('after message received', function () {
				beforeAll(function (done) {
					this.transport.write({
						pattern: {role: 'foo', cmd: 'bar'},
						payload: PAYLOAD
					})
					.then(done)
					.catch(done.fail);
				});

				it('calls the first handler', function () {
					expect(HANDLER1).toHaveBeenCalled();
				});

				it('does not call the second handler', function () {
					expect(HANDLER2).not.toHaveBeenCalled();
				});
			});
		});
	});

	describe('addMultiHandler', function () {
		describe('with same pattern', function () {
			const PAYLOAD = {PAYLOAD: 1};
			let RES1 = 'UNDEFINED';
			let RES2 = 'UNDEFINED';
			let HANDLER1 = jasmine.createSpy('HANDLER1');
			let HANDLER2 = jasmine.createSpy('HANDLER2');

			beforeAll(function () {
				this.channel = Channel.create();
				this.transport = StreamTransport.create();
				this.channel.useStream({role: 'foo'}, this.transport);

				RES1 = this.channel.addMultiHandler({role: 'foo', cmd: 'bar'}, HANDLER1);
				RES2 = this.channel.addMultiHandler({role: 'foo', cmd: 'bar'}, HANDLER2);
			});

			it('returns true when first handler is added', function () {
				expect(RES1).toBe(true);
			});

			it('returns true after first handler is added', function () {
				expect(RES2).toBe(true);
			});

			describe('after message received', function () {
				beforeAll(function (done) {
					this.transport.write({
						pattern: {role: 'foo', cmd: 'bar'},
						payload: PAYLOAD
					});

					Promise.delay(10)
						.then(done)
						.catch(done.fail);
				});

				it('calls the first handler once', function () {
					expect(HANDLER1).toHaveBeenCalled();
				});

				it('calls the second handler once', function () {
					expect(HANDLER2).toHaveBeenCalled();
				});
			});

			describe('after handler removed', function () {
				let ADD = 'UNDEFINED';
				let HANDLER = jasmine.createSpy('HANDLER');

				beforeAll(function (done) {
					this.channel.remove({role: 'foo', cmd: 'bar'});
					ADD = this.channel.addMultiHandler({role: 'foo', cmd: 'bar'}, HANDLER);

					this.transport.write({
						pattern: {role: 'foo', cmd: 'bar'},
						payload: PAYLOAD
					});

					Promise.delay(10)
						.then(done)
						.catch(done.fail);
				});

				it('returns true for new handler', function () {
					expect(ADD).toBe(true);
				});

				it('calls the new handler once', function () {
					expect(HANDLER).toHaveBeenCalled();
				});
			});
		});

		describe('with different pattern', function () {
			const PAYLOAD1 = {PAYLOAD: 1};
			const PAYLOAD2 = {PAYLOAD: 2};
			let RES1 = 'UNDEFINED';
			let RES2 = 'UNDEFINED';
			let HANDLER1 = jasmine.createSpy('HANDLER1');
			let HANDLER2 = jasmine.createSpy('HANDLER2');

			beforeAll(function () {
				this.channel = Channel.create();
				this.transport = StreamTransport.create();
				this.channel.useStream({role: 'foo'}, this.transport);

				RES1 = this.channel
					.addMultiHandler({role: 'foo', cmd: 'x', async: true}, HANDLER1);

				RES2 = this.channel
					.addMultiHandler({role: 'foo', cmd: 'y', async: true}, HANDLER2);
			});

			it('returns true when first handler is added', function () {
				expect(RES1).toBe(true);
			});

			it('returns true when second handler is added', function () {
				expect(RES2).toBe(true);
			});

			describe('after message received', function () {
				beforeAll(function (done) {
					this.transport.write({
						pattern: {role: 'foo', cmd: 'x', async: true},
						payload: PAYLOAD1
					});
					this.transport.write({
						pattern: {role: 'foo', cmd: 'y', async: true},
						payload: PAYLOAD2
					});

					Promise.delay(10)
						.then(done)
						.catch(done.fail);
				});

				it('calls the first handler once', function () {
					expect(HANDLER1.calls.count()).toBe(1);
					const payload = HANDLER1.calls.mostRecent().args[0];
					expect(payload).toBe(PAYLOAD1);
				});

				it('does not call the second handler', function () {
					expect(HANDLER2.calls.count()).toBe(1);
					const payload = HANDLER2.calls.mostRecent().args[0];
					expect(payload).toBe(PAYLOAD2);
				});
			});

			describe('after handler removed', function () {
				beforeAll(function (done) {
					// Reset the spies
					HANDLER1.calls.reset();
					HANDLER2.calls.reset();

					this.channel.remove({role: 'foo', cmd: 'y', async: true});

					this.transport.write({
						pattern: {role: 'foo', cmd: 'x', async: true},
						payload: PAYLOAD1
					});

					this.transport.write({
						pattern: {role: 'foo', cmd: 'y', async: true},
						payload: PAYLOAD2
					});

					Promise.delay(10)
						.then(done)
						.catch(done.fail);
				});

				it('does not call the removed handler', function () {
					expect(HANDLER2).not.toHaveBeenCalled();
				});

				it('calls the remaining handler', function () {
					expect(HANDLER1).toHaveBeenCalled();
				});
			});
		});

		describe('with general pattern', function () {
			const PAYLOAD = {PAYLOAD: 1};
			let RES1 = 'UNDEFINED';
			let RES2 = 'UNDEFINED';
			let HANDLER1 = jasmine.createSpy('HANDLER1');
			let HANDLER2 = jasmine.createSpy('HANDLER2');

			beforeAll(function () {
				this.channel = Channel.create();
				this.transport = StreamTransport.create();
				this.channel.useStream({role: 'foo'}, this.transport);

				RES1 = this.channel.addMultiHandler({role: 'foo', cmd: 'bar'}, HANDLER1);
				RES2 = this.channel.addMultiHandler({role: 'foo'}, HANDLER2);
			});

			it('returns true for specific pattern', function () {
				expect(RES1).toBe(true);
			});

			it('returns true for general pattern', function () {
				expect(RES2).toBe(true);
			});

			describe('after message received', function () {
				beforeAll(function (done) {
					this.transport.write({
						pattern: {role: 'foo'},
						payload: PAYLOAD
					});

					Promise.delay(10)
						.then(done)
						.catch(done.fail);
				});

				it('does not call the first handler', function () {
					expect(HANDLER1).not.toHaveBeenCalled();
				});

				it('calls the second handler', function () {
					expect(HANDLER2).toHaveBeenCalled();
				});
			});
		});

		describe('with specific pattern', function () {
			const PAYLOAD = {PAYLOAD: 1};
			let RES1 = 'UNDEFINED';
			let RES2 = 'UNDEFINED';
			let HANDLER1 = jasmine.createSpy('HANDLER1');
			let HANDLER2 = jasmine.createSpy('HANDLER2');

			beforeAll(function () {
				this.channel = Channel.create();
				this.transport = StreamTransport.create();
				this.channel.useStream({role: 'foo'}, this.transport);

				RES1 = this.channel.addMultiHandler({role: 'foo', cmd: 'bar'}, HANDLER1);
				RES2 = this.channel.addMultiHandler({role: 'foo', cmd: 'bar', async: true}, HANDLER2);
			});

			it('returns true for general pattern', function () {
				expect(RES1).toBe(true);
			});

			it('returns true for specific pattern', function () {
				expect(RES2).toBe(true);
			});

			describe('after message received', function () {
				beforeAll(function (done) {
					this.transport.write({
						pattern: {role: 'foo', cmd: 'bar'},
						payload: PAYLOAD
					});

					Promise.delay(10)
						.then(done)
						.catch(done.fail);
				});

				it('calls the first handler', function () {
					expect(HANDLER1).toHaveBeenCalled();
				});

				it('does not call the second handler', function () {
					expect(HANDLER2).not.toHaveBeenCalled();
				});
			});
		});
	});

	describe('broadcast', function () {
		const PAYLOAD1 = {PAYLOAD: 1};
		const ERROR1 = new Error('ERROR1');

		describe('without any transports', function () {
			beforeAll(function () {
				this.channel = Channel.create();
			});

			it('throws a NoTransportError', function () {
				const channel = this.channel;

				function broadcast() {
					channel.broadcast({role: 'foo', cmd: 'bar'});
				}

				expect(broadcast).toThrowError(
					NoTransportError,
					'No transport mounted for pattern role:foo,cmd:bar'
				);
			});
		});

		describe('with transports', function () {
			beforeAll(function () {
				const channel = Channel.create();

				this.matchingTransport = StreamTransport.create();
				this.nonMatchingTransport = StreamTransport.create();

				spyOn(this.matchingTransport, 'write');
				spyOn(this.nonMatchingTransport, 'write');

				channel.useStream({role: 'foo'}, this.matchingTransport);
				channel.useStream({role: 'foo', cmd: 'baz'}, this.nonMatchingTransport);

				channel.broadcast({role: 'foo', cmd: 'bar'}, PAYLOAD1);
			});

			it('calls matching transports write() with pattern and payload', function () {
				expect(this.matchingTransport.write).toHaveBeenCalledTimes(1);
				expect(this.matchingTransport.write).toHaveBeenCalledWith({
					pattern: {role: 'foo', cmd: 'bar'},
					payload: PAYLOAD1
				});
			});

			it('does not call write() on non-matching transports', function () {
				expect(this.nonMatchingTransport.write).not.toHaveBeenCalled();
			});
		});

		describe('when transport.write() returns rejected Promise', function () {
			beforeAll(function (done) {
				const channel = Channel.create();

				const transport = StreamTransport.create();
				transport.write = function () {
					return Promise.reject(ERROR1);
				};

				this.errorHandler = function () {
					done();
				};

				spyOn(this, 'errorHandler').and.callThrough();
				channel.on('error', this.errorHandler);

				channel.useStream({role: 'foo'}, transport);
				channel.broadcast({role: 'foo', cmd: 'bar'}, PAYLOAD1);
			});

			it('emits the error', function () {
				expect(this.errorHandler).toHaveBeenCalledTimes(1);
				expect(this.errorHandler).toHaveBeenCalledWith(ERROR1);
			});
		});
	});

	describe('onMessageHandler', function () {
		describe('without matching transports', function () {
			beforeAll(function (done) {
				const channel = Channel.create();
				const transport = Transport.create();

				this.errorHandler = function () {};

				spyOn(this, 'errorHandler');
				channel.on('error', this.errorHandler);

				channel.use({role: 'bar'}, transport);

				this.handler = function () {};
				spyOn(this, 'handler');
				channel.addSingleHandler({role: 'foo'}, this.handler);

				transport.write({pattern: {role: 'foo'}}).catch(err => {
					this.rejectedError = err;
					done();
				});
			});

			it('does not call added handlers', function () {
				expect(this.handler).not.toHaveBeenCalled();
			});

			it('emits a NoTransportError', function () {
				expect(this.errorHandler).toHaveBeenCalledTimes(1);
				expect(this.errorHandler).toHaveBeenCalledWith(new NoTransportError({role: 'foo'}));
			});

			it('rejects with a NoTransportError', function () {
				expect(this.rejectedError instanceof NoTransportError).toBe(true);
			});
		});

		describe('with mismatched transport', function () {
			beforeAll(function (done) {
				const channel = Channel.create();
				const transport = Transport.create();
				const mismatchedTransport = Transport.create();

				this.errorHandler = function () {};

				spyOn(this, 'errorHandler');
				channel.on('error', this.errorHandler);

				channel.use({role: 'foo'}, mismatchedTransport);
				channel.use({role: 'bar'}, transport);

				this.handler = function () {};
				spyOn(this, 'handler');
				channel.addSingleHandler({role: 'foo'}, this.handler);

				transport.write({pattern: {role: 'foo'}}).catch(err => {
					this.rejectedError = err;
					done();
				});
			});

			it('does not call added handlers', function () {
				expect(this.handler).not.toHaveBeenCalled();
			});

			it('emits a NoTransportError', function () {
				expect(this.errorHandler).toHaveBeenCalledTimes(1);
				expect(this.errorHandler).toHaveBeenCalledWith(new NoTransportError({role: 'foo'}));
			});

			it('rejects with a NoTransportError', function () {
				expect(this.rejectedError instanceof NoTransportError).toBe(true);
			});
		});

		describe('without any handlers', function () {
			beforeAll(function (done) {
				const channel = Channel.create();
				const transport = Transport.create();

				this.errorHandler = function () {};

				spyOn(this, 'errorHandler');
				channel.on('error', this.errorHandler);

				channel.use({role: 'foo'}, transport);

				transport.write({pattern: {role: 'foo'}}).catch(err => {
					this.rejectedError = err;
					done();
				});
			});

			it('emits a NoHandlerError', function () {
				expect(this.errorHandler).toHaveBeenCalledTimes(1);
				expect(this.errorHandler).toHaveBeenCalledWith(new NoHandlerError({role: 'foo'}));
			});

			it('rejects with a NoTransportError', function () {
				expect(this.rejectedError instanceof NoHandlerError).toBe(true);
			});
		});

		describe('with thrown error in handler', function () {
			const ERROR1 = new Error('ERROR1');

			beforeAll(function (done) {
				const channel = Channel.create();
				const transport = Transport.create();

				this.errorHandler = function () {};

				spyOn(this, 'errorHandler');
				channel.on('error', this.errorHandler);

				channel.use({role: 'foo'}, transport);

				channel.addSingleHandler({role: 'foo'}, function () {
					throw ERROR1;
				});

				transport.write({pattern: {role: 'foo'}}).catch(err => {
					this.rejectedError = err;
					done();
				});
			});

			it('emits the error', function () {
				expect(this.errorHandler).toHaveBeenCalledTimes(1);
				expect(this.errorHandler).toHaveBeenCalledWith(ERROR1);
			});

			it('rejects the error', function () {
				expect(this.rejectedError).toBe(ERROR1);
			});
		});

		describe('with rejected promise from handler', function () {
			const ERROR1 = new Error('ERROR1');

			beforeAll(function (done) {
				const channel = Channel.create();
				const transport = Transport.create();

				this.errorHandler = function () {};

				spyOn(this, 'errorHandler');
				channel.on('error', this.errorHandler);

				channel.use({role: 'foo'}, transport);

				channel.addSingleHandler({role: 'foo'}, function () {
					return Promise.reject(ERROR1);
				});

				transport.write({pattern: {role: 'foo'}}).catch(err => {
					this.rejectedError = err;
					done();
				});
			});

			it('emits the error', function () {
				expect(this.errorHandler).toHaveBeenCalledTimes(1);
				expect(this.errorHandler).toHaveBeenCalledWith(ERROR1);
			});

			it('rejects the error', function () {
				expect(this.rejectedError).toBe(ERROR1);
			});
		});

		describe('with returned value from handler', function () {
			const RESPONSE = {res: 1};

			beforeAll(function (done) {
				const channel = Channel.create();
				const transport = Transport.create();

				channel.use({role: 'foo'}, transport);

				channel.addSingleHandler({role: 'foo'}, function () {
					return RESPONSE;
				});

				transport.write({pattern: {role: 'foo'}}).then(res => {
					this.response = res;
					done();
				});
			});

			it('returns the value to the transport', function () {
				expect(this.response).toBe(RESPONSE);
			});
		});
	});

	describe('onEventHandler', function () {
		describe('without matching transports', function () {
			beforeAll(function (done) {
				const channel = Channel.create();
				const transport = StreamTransport.create();

				channel.useStream({role: 'bar'}, transport);

				this.handler = function () {};
				spyOn(this, 'handler');
				channel.addMultiHandler({role: 'foo'}, this.handler);

				transport.write({pattern: {role: 'foo'}});

				setTimeout(done, 30);
			});

			it('does not call added handlers', function () {
				expect(this.handler).not.toHaveBeenCalled();
			});
		});

		describe('with mismatched transport', function () {
			beforeAll(function (done) {
				const channel = Channel.create();
				const transport = StreamTransport.create();
				const mismatchedTransport = StreamTransport.create();

				channel.useStream({role: 'foo'}, mismatchedTransport);
				channel.useStream({role: 'bar'}, transport);

				this.handler = function () {};
				spyOn(this, 'handler');
				channel.addMultiHandler({role: 'foo'}, this.handler);

				transport.write({pattern: {role: 'foo'}});

				setTimeout(done, 30);
			});

			it('does not call added handlers', function () {
				expect(this.handler).not.toHaveBeenCalled();
			});
		});

		describe('with thrown error in handler', function () {
			const ERROR1 = new Error('ERROR1');

			beforeAll(function (done) {
				const channel = Channel.create();
				const transport = StreamTransport.create();

				this.errorHandler = function () {
					done();
				};

				spyOn(this, 'errorHandler').and.callThrough();
				channel.on('error', this.errorHandler);

				channel.useStream({role: 'foo'}, transport);

				channel.addMultiHandler({role: 'foo'}, function () {
					throw ERROR1;
				});

				transport.write({pattern: {role: 'foo'}});
			});

			it('emits the error', function () {
				expect(this.errorHandler).toHaveBeenCalledTimes(1);
				expect(this.errorHandler).toHaveBeenCalledWith(ERROR1);
			});
		});

		describe('with rejected promise from handler', function () {
			const ERROR1 = new Error('ERROR1');

			beforeAll(function (done) {
				const channel = Channel.create();
				const transport = StreamTransport.create();

				this.errorHandler = function () {
					done();
				};

				spyOn(this, 'errorHandler').and.callThrough();
				channel.on('error', this.errorHandler);

				channel.useStream({role: 'foo'}, transport);

				channel.addMultiHandler({role: 'foo'}, function () {
					return Promise.reject(ERROR1);
				});

				transport.write({pattern: {role: 'foo'}});
			});

			it('emits the error', function () {
				expect(this.errorHandler).toHaveBeenCalledTimes(1);
				expect(this.errorHandler).toHaveBeenCalledWith(ERROR1);
			});
		});
	});
});
