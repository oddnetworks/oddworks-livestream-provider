'use strict';

const Promise = require('bluebird');
const provider = require('../');
const lib = require('./');

module.exports = (bus, client, transform) => {
	// args.spec.images - Array
	// args.spec.channel - String
	// args.spec.event - {id: "String"}
	function fetchSeason(args) {
		const spec = args.spec || {};
		const event = spec.event || {};
		const channel = args.channel || {};
		const secrets = (channel.secrets || {}).livestream || {};
		const apiKey = secrets.apiKey;
		const accountId = secrets.accountId;
		const clientId = secrets.clientId;

		if (!apiKey || !accountId || !clientId) {
			bus.broadcast({level: 'warn'}, {
				message: `Skipping Livestream fetchSeason due to missing credentials in channel ${channel.id}`
			});
			return Promise.resolve(null);
		}

		if (!event.id) {
			bus.broadcast({level: 'error'}, {
				message: `Livestream fetchSeason requires an event ID. channel: ${channel.id}`
			});
			return Promise.resolve(null);
		}

		let eventMetadata;
		let eventVideos;

		return Promise.resolve(null)
			// Get the Livestream Event metadata.
			.then(() => {
				const params = {apiKey, accountId, clientId, id: event.id};

				return client.getEvent(params).then(res => {
					eventMetadata = res;
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
			// Set the child relationships. This could be a list of Seasons, or a
			// a list of episodes.
			.then(() => {
				return composeChildren(spec, eventVideos).then(entities => {
					eventMetadata.relationships = {entities: {data: entities}};
					return null;
				});
			})
			.then(() => {
				return transform(spec, eventMetadata);
			});
	}

	function composeChildren(parent, videos) {
		if (!parent.season) {
			throw new Error(`A Livestream season spec must have spec.season. id: ${parent.id}`);
		}

		let episodes = videos
			// Tag the videos by season and episode
			.map(video => {
				video.tags.forEach(tag => {
					if (provider.SEASON_TAG_PATTERN.test(tag)) {
						tag = lib.tagToKey(tag);
						video.season = tag;
					}

					if (provider.EPISODE_TAG_PATTERN.test(tag)) {
						video.episode = lib.tagToKey(tag);
					}
				});

				return video;
			})
			// Only use the videos for this season.
			.filter(video => {
				return video.season === parent.season;
			});

		// Sort videos by episode order.
		episodes = episodes.slice().sort((a, b) => {
			if (a.episode === b.episode) {
				return 0;
			}

			return a.episode > b.episode ? 1 : -1;
		});

		return Promise.all(episodes.map(video => {
			return mapEpisode(parent, video);
		})).then(videoIds => {
			return videoIds.map(id => {
				return {id, type: 'video'};
			});
		});
	}

	function mapEpisode(parent, video) {
		const id = provider.composeVideoId(parent.channel, parent.event.id, video.id);

		// Create the video spec.
		const spec = {
			id: `spec-${id}`,
			channel: parent.channel,
			type: `videoSpec`,
			source: `livestream-video`,
			event: {id: `${parent.event.id}`},
			video: {id: `${video.id}`},
			season: video.season,
			episode: video.episode
		};

		// Set the episode video which will trigger a fetch within Oddworks.
		return bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, spec).then(() => {
			return `res-${id}`;
		});
	}

	return fetchSeason;
};
