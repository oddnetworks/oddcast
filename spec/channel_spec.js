/* global jasmine, describe, beforeAll, it, expect */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');

const errors = require('../lib/errors');
const NoHandlerError = errors.NoHandlerError;

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
});
