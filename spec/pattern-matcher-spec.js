/* global describe, beforeAll, it, expect */
/* eslint-disable max-nested-callbacks */
'use strict';

var PatternMatcher = require('../lib/pattern-matcher');

describe('PatternMatcher', function () {
	var A = {a: 0};
	var B = {b: 0};
	var C = {c: 0};
	var D = {d: 0};
	var E = {e: 0};

	beforeAll(function () {
		this.matcher = PatternMatcher.create();
		this.matcher.add({foo: 'bar'}, A);
		this.matcher.add({foo: 'bar'}, B);
		this.matcher.add({baz: 'zee'}, C);
		this.matcher.add({foo: 'bar', baz: 'zee'}, D);
		this.matcher.add({foo: 'zee', baz: 'zee'}, E);
	});

	it('registers many per pattern', function () {
		var res = this.matcher.find({foo: 'bar'});
		expect(res.length).toBe(2);
		expect(res).toContain(A);
		expect(res).toContain(B);
	});

	it('registers only one based on specificity', function () {
		var res = this.matcher.find({baz: 'zee'});
		expect(res.length).toBe(1);
		expect(res[0]).toBe(C);
	});

	it('finds by decreasing specificity', function () {
		var res = this.matcher.find({baz: 'zee', foo: 'bar', cat: 'g'});
		expect(res.length).toBe(4);
		expect(res).toContain(A);
		expect(res).toContain(B);
		expect(res).toContain(C);
		expect(res).toContain(D);
		expect(res).not.toContain(E);
	});

	it('matches anything with {}', function () {
		var res = this.matcher.find({});
		expect(res.length).toBe(5);
		expect(res).toContain(A);
		expect(res).toContain(B);
		expect(res).toContain(C);
		expect(res).toContain(D);
		expect(res).toContain(E);
	});

	describe('before and after removal', function () {
		beforeAll(function () {
			this.matcher = PatternMatcher.create();
			this.matcher.add({foo: 'bar'}, A);
			this.matcher.add({foo: 'bar'}, B);
			this.matcher.add({baz: 'zee'}, C);
			this.matcher.add({baz: 'zee', bar: 'zee'}, D);
			this.before = Object.freeze({
				'foo:bar': this.matcher.find({foo: 'bar'}),
				'baz:zee,bar:zee': this.matcher.find({baz: 'zee', bar: 'zee'})
			});
			this.matcher.remove({foo: 'bar'}, A);
			this.matcher.remove({baz: 'zee'});
		});

		it('removes by pattern and Object reference', function () {
			expect(this.before['foo:bar']).toContain(A);
			var res = this.matcher.find({foo: 'bar'});
			expect(res.length).toBe(1);
			expect(res[0]).toBe(B);
		});

		it('eagerly removes by pattern', function () {
			expect(this.before['baz:zee,bar:zee']).toContain(C);
			expect(this.before['baz:zee,bar:zee']).toContain(D);
			var res = this.matcher.find({baz: 'zee'});
			expect(res.length).toBe(0);
		});
	});

	describe('remove all', function () {
		beforeAll(function () {
			this.matcher = PatternMatcher.create();

			this.matcher.add({foo: 'bar'}, A);
			this.matcher.add({foo: 'baz'}, B);

			this.before = Object.freeze({
				'foo:bar': this.matcher.find({foo: 'bar'}),
				'foo:baz': this.matcher.find({foo: 'baz'})
			});

			this.matcher.remove({});
		});

		it('removes all objects from all patterns', function () {
			expect(this.before['foo:bar'].length).toBe(1);
			expect(this.before['foo:bar']).toContain(A);
			expect(this.before['foo:baz'].length).toBe(1);
			expect(this.before['foo:baz']).toContain(B);
			expect(this.matcher.find({foo: 'bar'}).length).toBe(0);
			expect(this.matcher.find({foo: 'baz'}).length).toBe(0);
		});
	});
});
