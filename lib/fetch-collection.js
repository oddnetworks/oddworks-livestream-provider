'use strict';

const Promise = require('bluebird');
// const debug = require('debug')('oddworks:provider:vimeo:fetch-vimeo-album');

// const PER_PAGE = 25;

module.exports = (bus, client, transform) => {
	return args => {
		const channel = args.channel;
		const secrets = channel.secrets || {};
		const spec = args.spec;
		const event = spec.event;

		const creds = Object.create(null);
		if (secrets.livestream && secrets.livestream.apiKey && secrets.livestream.accountId) {
			creds.apiKey = secrets.livestream.apiKey;
			creds.accountId = secrets.livestream.accountId;
		}

		let resource;

		const params = Object.assign({id: event.id}, creds);
		return client.getEvent(params)
			.then(result => {
				if (result) {
					resource = result;
					return client.getEventVideos(params);
				}

				const error = new Error(`Collection not found for event id "${event.id}"`);
				error.code = 'COLLECTION_NOT_FOUND';

				bus.broadcast({level: 'error'}, {
					spec,
					error,
					code: error.code,
					message: 'collection not found'
				});

				return Promise.reject(error);
			})
			.then(videos => {
				if (videos && videos.vods && Array.isArray(videos.vods.data)) {
					videos = videos.vods.data.filter(video => {
						return (video.type === 'video');
					});

					resource.relationships = resource.relationships || {};
					resource.relationships.entities = resource.relationships.entities || {};
					resource.relationships.entities.data = resource.relationships.entities.data || [];

					return Promise.all(videos.map(video => {
						const spec = {
							id: `spec-livestream-video-${video.id}`,
							channel: channel.id,
							type: `videoSpec`,
							source: `livestream-video`,
							event: {id: `${event.id}`},
							video: {id: `${video.id}`}
						};

						resource.relationships.entities.data.push({
							id: `res-livestream-video-${video.id}`,
							type: 'video'
						});

						return bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, spec);
					}));
				}
			})
			.then(() => {
				return transform(spec, resource);
			});
	};
};
