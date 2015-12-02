'use strict';
const test = require('tape');
const oddcast = require('../');

(function () {
	const lets = Object.freeze({
		a: {a: 0},
		x: {x: 1},
		y: {y: 2},
		z: {z: 3}
	});
	const matcher = oddcast.PatternMatcher.create();

	test('before all', function (t) {
		matcher.add({foo: 'bar'}, lets.a);
		matcher.add({foo: 'bar'}, lets.x);
		matcher.add({baz: 'zee'}, lets.y);
		matcher.add({foo: 'bar', baz: 'zee'}, lets.z);
		t.end();
	});

	test('registers many per pattern', function (t) {
		var res = matcher.find({foo: 'bar'});
		t.equal(res.length, 2, 'result.length');
		t.ok(res.indexOf(lets.a) >= 0, '0 result');
		t.ok(res.indexOf(lets.x) >= 0, '1 result');
		t.end();
	});

	test('can register only one', function (t) {
		var res = matcher.find({baz: 'zee'});
		t.equal(res.length, 1, 'result.length');
		t.equal(res[0], lets.y, 'exact match');
		t.end();
	});

	test('finds by decreasing specificity', function (t) {
		var res = matcher.find({baz: 'zee', foo: 'bar'});
		t.ok(res.indexOf(lets.a) >= 0, '0 result');
		t.ok(res.indexOf(lets.x) >= 0, '1 result');
		t.ok(res.indexOf(lets.y) >= 0, '2 result');
		t.ok(res.indexOf(lets.z) >= 0, '3 result');
		t.end();
	});

	test('can remove by pattern', function (t) {
		matcher.remove({foo: 'bar'}, lets.a);
		var res = matcher.find({foo: 'bar'});
		t.equal(res.length, 1, 'result.length');
		t.equal(res[0], lets.x, 'exact match');
		t.end();
	});
})();
