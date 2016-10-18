'use strict';

const Bloomrun = require('bloomrun');

const utils = require('./utils');

const DEFAULT_INDEX_OPTIONS = {
	indexing: 'depth'
};

function createIndex(options) {
	return new Bloomrun(options);
}

function PatternMatcher(options) {
	this.options = Object.assign({}, options, DEFAULT_INDEX_OPTIONS);
	this.index = createIndex(options);
}

module.exports = PatternMatcher;

utils.extend(PatternMatcher.prototype, {
	add: function (pattern, object) {
		this.index.add(pattern, object);
	},

	find: function (pattern, options) {
		if (!pattern || Object.keys(pattern).length === 0) {
			return this.index.list(null, options) || [];
		}

		return this.index.list(pattern, options) || [];
	},

	exists: function (pattern) {
		return Boolean(this.index.lookup(pattern));
	},

	remove: function (pattern, object) {
		// remove all patterns
		if (!pattern || Object.keys(pattern).length === 0) {
			const matches = this.index.list(null, {patterns: true});
			this.index = createIndex(this.options);
			return Boolean(matches.length);
		}

		// remove all patterns of type
		if (typeof object === 'undefined') {
			if (this.index.list(pattern).length) {
				this.index.remove(pattern);
				return true;
			}
			return false;
		}

		// remove all patterns of type with payload
		if (this.index.list(pattern).length) {
			const matches = this.index.list(pattern);
			this.index.remove(pattern, object);
			const matchesAfter = this.index.list(pattern);
			return Boolean(matches.length - matchesAfter.length);
		}

		return false;
	}
});

PatternMatcher.create = function (options) {
	return new PatternMatcher(options);
};
