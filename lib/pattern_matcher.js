'use strict';
var utils = require('./utils');

function PatternMatcher() {
	this.index = Object.create(null);
}

module.exports = PatternMatcher;

utils.extend(PatternMatcher.prototype, {
	add: function (objectPattern, object) {
		var stringPattern = this.patternToString(objectPattern);
		var list = this.index[stringPattern];
		if (!list) {
			list = this.index[stringPattern] = [];
		}
		list.push(object);
	},

	find: function (objectPattern) {
		var stringPattern = this.patternToString(objectPattern);
		var index = this.index;

		return Object.keys(index).reduce(function (matches, pattern) {
			if (stringPattern === '' || stringPattern.indexOf(pattern) > -1) {
				matches = matches.concat(index[pattern]);
			}
			return matches;
		}, []);
	},

	exists: function (objectPattern) {
		var stringPattern = this.patternToString(objectPattern);
		return Boolean(this.index[stringPattern]);
	},

	remove: function (objectPattern, object) {
		var stringPattern = this.patternToString(objectPattern);
		var matches;
		var i;

		if (typeof object === 'undefined') {
			if (this.index[stringPattern]) {
				delete this.index[stringPattern];
				return true;
			}
			return false;
		}

		matches = this.index[stringPattern];
		i = matches.indexOf(object);
		if (i >= 0) {
			matches.splice(i, 1);
			return true;
		}

		return false;
	},

	patternToString: function (objectPattern) {
		var self = this;
		if (objectPattern && typeof objectPattern === 'object') {
			return Object.keys(objectPattern).sort().map(function (key) {
				return key + ':' + self.objectToString(objectPattern[key]);
			}).join();
		}
		return this.objectToString(objectPattern);
	},

	objectToString: function (object) {
		if (typeof object === 'string') {
			return object;
		}
		if (typeof object === 'boolean' || (typeof object === 'number' && !isNaN(object))) {
			return object.toString();
		}
		if (object && (typeof object === 'object' || typeof object === 'function')) {
			return Object.prototype.call(object);
		}
		if (object === null || typeof object === 'undefined' || isNaN(object)) {
			return 'null';
		}
		return Object.prototype.toString.call(object);
	}
});

PatternMatcher.create = function () {
	return new PatternMatcher();
};
