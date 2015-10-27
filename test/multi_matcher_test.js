'use strict';

var test = require('tape');

var oddcast = require('../');

var lets = Object.create(null);

test('before all', function (t) {
	lets.a = {a: 0};
	lets.x = {x: 1};
	lets.y = {y: 2};
	lets.z = {z: 3};
	lets.multiMatcher = oddcast.createMultiMatcher();

	Object.freeze(lets);

	lets.multiMatcher.add({foo: 'bar'}, lets.a);
	lets.multiMatcher.add({foo: 'bar'}, lets.x);
	lets.multiMatcher.add({baz: 'zee'}, lets.y);
	lets.multiMatcher.add({foo: 'bar', baz: 'zee'}, lets.z);
	t.end();
});

test('registers many per pattern', function (t) {
	var res = lets.multiMatcher.find({foo: 'bar'});
	t.equal(res.length, 2, 'result.length');
	t.ok(res.indexOf(lets.a) >= 0, '0 result');
	t.ok(res.indexOf(lets.x) >= 0, '0 result');
	t.end();
});

test('can register only one', function (t) {
	var res = lets.multiMatcher.find({baz: 'zee'});
	t.equal(res.length, 1, 'result.length');
	t.equal(res[0], lets.y, 'exact match');
	t.end();
});

test('finds by increasing specificity', function (t) {
	var res = lets.multiMatcher.find({foo: 'bar', baz: 'zee'});
	t.equal(res.length, 1, 'one result');
	t.equal(res[0], lets.z, 'expected result');
	t.end();
});

test('can remove by pattern', function (t) {
	lets.multiMatcher.remove({foo: 'bar'}, lets.a);
	var res = lets.multiMatcher.find({foo: 'bar'});
	t.equal(res.length, 1, 'result.length');
	t.equal(res[0], lets.x, 'exact match');
	t.end();
});
