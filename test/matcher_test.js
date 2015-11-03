'use strict';

var test = require('tape');

var oddcast = require('../');

var lets = Object.create(null);

test('before all', function (t) {
	lets.a = {a: 0};
	lets.x = {x: 1};
	lets.y = {y: 2};
	lets.z = {z: 3};
	lets.matcher = oddcast.PatternMatcher.create();

	Object.freeze(lets);

	lets.matcher.add({foo: 'bar'}, lets.a);
	lets.matcher.add({foo: 'bar'}, lets.x);
	lets.matcher.add({baz: 'zee'}, lets.y);
	lets.matcher.add({foo: 'bar', baz: 'zee'}, lets.z);
	t.end();
});

test('registers many per pattern', function (t) {
	var res = lets.matcher.find({foo: 'bar'});
	t.equal(res.length, 2, 'result.length');
	t.ok(res.indexOf(lets.a) >= 0, '0 result');
	t.ok(res.indexOf(lets.x) >= 0, '1 result');
	t.end();
});

test('can register only one', function (t) {
	var res = lets.matcher.find({baz: 'zee'});
	t.equal(res.length, 1, 'result.length');
	t.equal(res[0], lets.y, 'exact match');
	t.end();
});

test('finds by decreasing specificity', function (t) {
	var res = lets.matcher.find({baz: 'zee', foo: 'bar'});
	t.ok(res.indexOf(lets.a) >= 0, '0 result');
	t.ok(res.indexOf(lets.x) >= 0, '1 result');
	t.ok(res.indexOf(lets.y) >= 0, '2 result');
	t.ok(res.indexOf(lets.z) >= 0, '3 result');
	t.end();
});

test('can remove by pattern', function (t) {
	lets.matcher.remove({foo: 'bar'}, lets.a);
	var res = lets.matcher.find({foo: 'bar'});
	t.equal(res.length, 1, 'result.length');
	t.equal(res[0], lets.x, 'exact match');
	t.end();
});
