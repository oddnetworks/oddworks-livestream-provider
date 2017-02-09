'use strict';

const Promise = require('bluebird');

const MINUTE = 60 * 1000;

module.exports = bus => {
	const channels = Object.create(null);
	const pattern = {role: 'store', cmd: 'get', type: 'channel'};

	return id => {
		if (channels[id]) {
			return Promise.resolve(channels[id]);
		}

		return bus.query(pattern, {id}).then(channel => {
			channels[channel.id] = channel;

			// Break the cached channel after a timeout
			setTimeout(() => {
				delete channels[channel.id];
			}, MINUTE * 5);

			return channel;
		});
	};
};
