'use strict';
var utils = require('./utils');

function Action(spec) {
	Object.defineProperties(this, {
		id: {
			enumerable: true,
			value: Action.uniqueId()
		},
		pattern: {
			enumerable: true,
			value: spec.pattern
		},
		payload: {
			enumerable: true,
			value: spec.payload
		}
	});
}

module.exports = Action;

utils.extend(Action.prototype, {
	withResult: function (res) {
		var action = new Action(this);
		Object.defineProperties(action, {
			error: {
				enumerable: true,
				value: null
			},
			result: {
				enumerable: true,
				value: res
			}
		});
		return action;
	},

	withError: function (err) {
		var action = new Action(this);
		Object.defineProperties(action, {
			error: {
				enumerable: true,
				value: err
			},
			result: {
				enumerable: true,
				value: null
			}
		});
		return action;
	}
});

Action.create = function (pattern, payload) {
	return new Action({
		pattern: pattern,
		payload: payload
	});
};

Action.uniqueId = function () {
	return Math.random().toString(36).slice(2, 8);
};
