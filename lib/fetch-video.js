'use strict';

const Promise = require('bluebird');

module.exports = (bus, client, transform) => {
	return args => {
		const channel = args.channel;
		const secrets = channel.secrets || {};
		const spec = args.spec;
		const event = spec.event;
		const video = spec.video;

		const creds = Object.create(null);
		if (secrets.livestream && secrets.livestream.apiKey && secrets.livestream.accountId) {
			creds.apiKey = secrets.livestream.apiKey;
			creds.accountId = secrets.livestream.accountId;
		}

		const params = Object.assign({id: event.id}, creds);

		let promise = client.getEvent(params);
		if (video && video.id) {
			promise = client.getEventVideos(params);
		}

		return promise
			.then(result => {
				if (result && result.vods) {
					result = result.vods.data.find(datum => {
						return datum.data.id.toString() === video.id;
					});

					if (result) {
						result.accountId = creds.accountId;
						return transform(spec, result.data);
					}
				} else if (result) {
					result.accountId = creds.accountId;
					return transform(spec, result);
				}

				const error = new Error(`Video not found for event id "${event.id}", video id "${(video) ? video.id : null}"`);
				error.code = 'VIDEO_NOT_FOUND';

				bus.broadcast({level: 'error'}, {
					spec,
					error,
					code: error.code,
					message: 'video not found'
				});

				return Promise.reject(error);
			});
	};
};
