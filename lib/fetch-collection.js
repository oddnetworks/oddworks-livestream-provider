'use strict';

const Promise = require('bluebird');

module.exports = (bus, client, transform) => {
	return args => {
		const channel = args.channel;
		const secrets = (channel.secrets || {}).livestream || {};
		const apiKey = secrets.apiKey;
		const accountId = secrets.accountId;
		const clientId = secrets.clientId;
		const spec = args.spec;
		const event = spec.event;

		if (!apiKey || !accountId || !clientId) {
			bus.broadcast({level: 'warn'}, {
				message: `Skipping Livestream fetchVideo due to missing credentials in channel ${channel.id}`
			});
			return Promise.resolve(null);
		}

		if (!event.id) {
			bus.broadcast({level: 'error'}, {
				message: `Livestream fetchCollection requires an event ID. channel: ${channel.id}`
			});
			return Promise.resolve(null);
		}

		const creds = {apiKey, accountId, clientId};
		const params = Object.assign({id: event.id}, creds);
		let resource;

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
			.then(result => {
				resource.relationships = resource.relationships || {};
				resource.relationships.entities = resource.relationships.entities || {};
				resource.relationships.entities.data = resource.relationships.entities.data || [];

				let videos = [];

				// If there is a live video for this collection, push it onto relationships.
				if (result && result.live) {
					videos.push(result.live);
				}

				// If there are any VODs for this collection, push them onto relationships.
				if (result && result.vods && Array.isArray(result.vods.data)) {
					videos = videos.concat(result.vods.data.filter(vod => vod.type === 'video').map(vod => {
						return vod.data;
					}));
				}

				// Run all the child video specs through the system.
				return Promise.all(videos.map(video => {
					const id = `livestream-video-${channel.id}-${event.id}-${video.id}`;

					const spec = {
						id: `spec-${id}`,
						channel: channel.id,
						type: `videoSpec`,
						source: `livestream-video`,
						event: {id: `${event.id}`},
						video: {id: `${video.id}`}
					};

					resource.relationships.entities.data.push({
						id: `res-${id}`,
						type: 'video'
					});

					return bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, spec);
				}));
			})
			.then(() => {
				return transform(spec, resource);
			});
	};
};
