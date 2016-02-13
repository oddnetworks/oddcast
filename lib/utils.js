exports.extend = function (target, source) {
	return Object.keys(source).reduce(function (target, key) {
		target[key] = source[key];
		return target;
	}, target);
};

exports.notImplemented = function (message) {
	return function notImplemented() {
		throw new Error('Not Implemented: ' + message);
	};
};
