'use strict';

var utils = require('./utils');

function Action(spec) {
	Object.defineProperties(this, {
		id: {
			enumerable: true,
			value: spec.id || Action.uniqueId()
		},
		pattern: {
			enumerable: true,
			value: spec.pattern
		},
		payload: {
			enumerable: true,
			value: spec.payload
		},
		error: {
			enumerable: true,
			value: spec.error || null
		},
		result: {
			enumerable: true,
			value: spec.result
		}
	});
}

module.exports = Action;

utils.extend(Action.prototype, {
	toJSON: function () {
		if (this.error) {
			var self = this;
			return Object.keys(self).reduce(function (obj, key) {
				if (key === 'error') {
					obj[key] = Action.errorToJSON(self[key]);
				} else {
					obj[key] = self[key];
				}
				return obj;
			}, Object.create(null));
		}
		return this;
	}
});

Action.create = function (pattern, payload) {
	return new Action({
		pattern: pattern,
		payload: payload
	});
};

Action.withResult = function (spec, res) {
	spec.result = res;
	return new Action(spec);
};

Action.withError = function (spec, err) {
	spec.error = err;
	return new Action(spec);
};

Action.uniqueId = function () {
	return Math.random().toString(36).slice(2, 8);
};

Action.errorToJSON = function (err) {
	var newError = Object.keys(err).reduce(function (obj, key) {
		obj[key] = err[key];
		return obj;
	}, Object.create(null));

	newError.name = err.name;
	newError.message = err.message;
	newError.code = err.code;
	newError.stack = err.stack;
	return newError;
};
