'use strict';

var test = require('tape');

var oddcast = require('../');

var lets = Object.create(null);

test('before all', function (t) {
	lets.x = {x: 1};
	lets.y = {y: 2};
	lets.z = {z: 3};
	lets.multiMatcher = oddcast.createMultiMatcher();

	Object.freeze(lets);

	lets.multiMatcher.add({foo: 'bar'}, lets.x);
	lets.multiMatcher.add({baz: 'zee'}, lets.y);
	lets.multiMatcher.add({foo: 'bar', baz: 'zee'}, lets.z);
	t.end();
});

test('finds by increasing specificity', function (t) {
	var res = lets.multiMatcher.find({foo: 'bar', baz: 'zee'});
	t.equal(res.length, 1, 'one result');
	t.equal(res[0], lets.z, 'expected result');
	t.end();
});
