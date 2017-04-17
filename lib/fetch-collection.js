'use strict';

const Promise = require('bluebird');
const provider = require('../');
const lib = require('./');

module.exports = (bus, client, transform) => {
	// args.spec.images - Array
	// args.spec.channel - Object
	// args.spec.event - {id: "String"}
	function fetchCollection(args) {
		const spec = args.spec || {};
		const event = spec.event || {};
		const channel = args.channel || {};
		const secrets = (channel.secrets || {}).livestream || {};
		const apiKey = secrets.apiKey;
		const accountId = secrets.accountId;
		const clientId = secrets.clientId;

		if (!apiKey || !accountId || !clientId) {
			bus.broadcast({level: 'warn'}, {
				message: `Skipping Livestream fetchCollection due to missing credentials in channel ${channel.id}`
			});
			return Promise.resolve(null);
		}

		if (!event.id) {
			bus.broadcast({level: 'error'}, {
				message: `Livestream fetchCollection requires an event ID. spec: ${spec.id}`
			});
			return Promise.resolve(null);
		}

		let eventMetadata;
		let liveVideoSpec;
		let eventVideos;

		return Promise.resolve(null)
			// Get the Livestream Event metadata.
			.then(() => {
				const params = {apiKey, accountId, clientId, id: event.id};

				return client.getEvent(params).then(res => {
					if (!res) {
						const message = `Collection not found for event id "${params.id}"`;
						bus.broadcast({level: 'error'}, {
							code: `COLLECTION_NOT_FOUND`,
							message: `collection not found`,
							spec
						});
						return Promise.reject(new Error(message));
					}

					eventMetadata = res;
					return null;
				});
			})
			// Compose the live stream video
			.then(() => {
				const id = provider.composeLiveVideoId(channel.id, eventMetadata.id);

				const spec = {
					type: 'videoSpec',
					id: `spec-${id}`,
					source: 'livestream-live-video',
					event: eventMetadata
				};

				return bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, spec).then(res => {
					liveVideoSpec = res;
					return null;
				});
			})
			// Get the Livestream event videos metadata.
			.then(() => {
				const creds = {apiKey, accountId, clientId};

				return lib.getAllEventVods(client, creds, event.id).then(videos => {
					eventVideos = videos;
					return null;
				});
			})
			// Set the child relationships, if there are any.
			.then(() => {
				// A video within an event could be tagged with a season or episode
				// number. Here, we filter those videos out to create "synthetic"
				// Odd Networks collections for the Series and Seasons.
				const nestedVideos = eventVideos.filter(filterNested);

				if (nestedVideos.length > 0) {
					// If there are season episodes in these videos, we remove them from
					// this collection.
					eventVideos = eventVideos.filter(video => {
						return nestedVideos.indexOf(video) < 0;
					});

					// Create the synthetic Series and Season Odd Networks collections.
					return composeSeries(spec);
				}

				return null;
			})
			.then(() => {
				// If, after filtering out the Seasons Episodes, there are still VODs,
				// we fetch them and add them as relationships.
				return Promise.all(eventVideos.map(video => {
					return mapVideo(spec, video);
				})).then(entities => {
					eventMetadata.relationships = {entities: {
						data: entities.map(id => {
							return {id, type: 'video'};
						})
					}};

					// Lastly, push on the live video for this event.
					eventMetadata.relationships.entities.data.unshift({
						type: 'video',
						id: liveVideoSpec.resource
					});

					return null;
				});
			})
			.then(() => {
				return transform(spec, eventMetadata);
			});
	}

	function composeSeries(parent) {
		const id = provider.composeSeriesId(parent.channel, parent.event.id);

		const spec = {
			id: `spec-${id}`,
			channel: parent.channel,
			type: 'collectionSpec',
			source: 'odd-livestream-series',
			event: parent.event,
			images: parent.images
		};

		// Set the series collection which will trigger a fetch within Oddworks.
		return bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, spec).then(() => {
			return `res-${id}`;
		});
	}

	function mapVideo(parent, video) {
		const id = provider.composeVideoId(parent.channel, parent.event.id, video.id);

		// Create the video spec.
		const spec = {
			id: `spec-${id}`,
			channel: parent.channel,
			type: `videoSpec`,
			source: `livestream-video`,
			event: {id: `${parent.event.id}`},
			video: {id: `${video.id}`}
		};

		// Set the episode video which will trigger a fetch within Oddworks.
		return bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, spec).then(() => {
			return `res-${id}`;
		});
	}

	return fetchCollection;
};

function filterNested(video) {
	if (!Array.isArray(video.tags)) {
		return false;
	}

	let episode = false;

	video.tags.forEach(tag => {
		if (provider.EPISODE_TAG_PATTERN.test(tag.toLowerCase())) {
			episode = true;
		}
	});

	return episode;
}
