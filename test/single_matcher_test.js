'use strict';

var test = require('tape');

var oddcast = require('../');

var lets = Object.create(null);

test('before all', function (t) {
	lets.a = {a: 0};
	lets.x = {x: 1};
	lets.y = {y: 2};
	lets.z = {z: 3};
	lets.multiMatcher = oddcast.createSingleMatcher();

	Object.freeze(lets);

	lets.multiMatcher.add({foo: 'bar'}, lets.a);
	lets.multiMatcher.add({foo: 'bar'}, lets.x);
	lets.multiMatcher.add({baz: 'zee'}, lets.y);
	lets.multiMatcher.add({foo: 'bar', baz: 'zee'}, lets.z);
	t.end();
});

test('adding to the same pattern overwrites', function (t) {
	var res = lets.multiMatcher.find({foo: 'bar'});
	t.equal(res, lets.x, 'result');
	t.end();
});

test('a more specific pattern does not overwrite', function (t) {
	// The {foo: 'bar', baz: 'zee'} pattern did not overwrite.
	var res = lets.multiMatcher.find({baz: 'zee'});
	t.equal(res, lets.y, 'result');
	t.end();
});

test('a more specific pattern is ... more specific', function (t) {
	var res = lets.multiMatcher.find({foo: 'bar', baz: 'zee'});
	t.equal(res, lets.z, 'result');
	t.end();
});
