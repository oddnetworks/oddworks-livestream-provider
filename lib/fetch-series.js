'use strict';

const Promise = require('bluebird');
const provider = require('../');
const lib = require('./');

module.exports = (bus, client, transform) => {
	// args.spec.images - Array
	// args.spec.channel - String
	// args.spec.event - {id: "String"}
	function fetchSeries(args) {
		const spec = args.spec || {};
		const event = spec.event || {};
		const channel = args.channel || {};
		const secrets = (channel.secrets || {}).livestream || {};
		const apiKey = secrets.apiKey;
		const accountId = secrets.accountId;
		const clientId = secrets.clientId;

		if (!apiKey || !accountId || !clientId) {
			bus.broadcast({level: 'warn'}, {
				message: `Skipping Livestream fetchSeries due to missing credentials in channel ${channel.id}`
			});
			return Promise.resolve(null);
		}

		if (!event.id) {
			bus.broadcast({level: 'error'}, {
				message: `Livestream fetchSeries requires an event ID. channel: ${channel.id}`
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
					if (!res) {
						const message = `Event not found for event id "${params.id}"`;
						bus.broadcast({level: 'error'}, {
							code: `COLLECTION_NOT_FOUND`,
							message: `event season not found`,
							spec
						});
						return Promise.reject(new Error(message));
					}

					eventMetadata = res;
					return null;
				});
			})
			// Get the Livestream event videos metadata.
			.then(() => {
				const creds = {apiKey, accountId, clientId};

				return lib.getAllEventVods(client, creds, event.id).then(videos => {
					if (!videos) {
						const message = `Event videos not found for event id "${event.id}"`;
						bus.broadcast({level: 'error'}, {
							code: `VIDEOS_NOT_FOUND`,
							message: `videos not found`,
							spec
						});
						return Promise.reject(new Error(message));
					}

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
		videos = videos.filter(filterNested);
		const seasons = Object.create(null);
		let episodes = [];

		// Check all videos for season and episode tags.
		videos.forEach(video => {
			video.tags.forEach(tag => {
				if (provider.SEASON_TAG_PATTERN.test(tag)) {
					tag = lib.tagToKey(tag);
					video.season = tag;

					if (!seasons[tag]) {
						seasons[tag] = [];
					}
					seasons[tag].push(video);
				}

				if (provider.EPISODE_TAG_PATTERN.test(tag)) {
					video.episode = lib.tagToKey(tag);
					episodes.push(video);
				}
			});
		});

		const seasonKeys = Object.keys(seasons);

		if (seasonKeys.length > 0) {
			return Promise.all(seasonKeys.slice().sort().map(season => {
				return mapSeason(parent, season);
			})).then(seasonIds => {
				return seasonIds.map(id => {
					return {id, type: 'collection'};
				});
			});
		}

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

	function mapSeason(parent, season) {
		const id = provider.composeSeasonId(parent.channel, parent.event.id, season);

		const spec = {
			id: `spec-${id}`,
			channel: parent.channel,
			type: 'collectionSpec',
			source: 'odd-livestream-season',
			event: parent.event,
			season
		};

		// Set the season collection which will trigger a fetch within Oddworks.
		return bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, spec).then(() => {
			return `res-${id}`;
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

	return fetchSeries;
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
