'use strict';

const crypto = require(`crypto`);
const APIClient = require(`./lib/api-client`);
const eventToEventTransform = require(`./lib/event-to-event-transform`);
const videoToVideoTransform = require(`./lib/video-to-video-transform`);

const EVENT_TYPES = [
	`past_events`,
	`upcoming_events`,
	`draft_events`,
	`private_events`
];

class Provider {
	constructor(spec) {
		Object.defineProperties(this, {
			accountId: {
				value: spec.accountId
			},
			client: {
				value: APIClient.createClient({
					secretKey: spec.secretKey,
					requestInterval: spec.requestInterval
				})
			}
		});

		// Make sure methods keep the correct `this` throughout chained async calls.
		this.genericRequest = this.genericRequest.bind(this);
		this.getEventsByType = this.getEventsByType.bind(this);
		this.getEvent = this.getEvent.bind(this);
		this.getVideo = this.getVideo.bind(this);
		this.getEventVideosPage = this.getEventVideosPage.bind(this);
		this.getAllEventVideos = this.getAllEventVideos.bind(this);
		this.getAsset = this.getAsset.bind(this);
		this.getEventAsset = this.getEventAsset.bind(this);
		this.getVideoAsset = this.getVideoAsset.bind(this);
	}

	genericRequest(path, query) {
		const accountId = this.accountId;
		return this.client(`/accounts/${accountId}${path}`, query);
	}

	getEventsByType(args) {
		args = args || {};

		const accountId = this.accountId;
		const eventType = args.eventType;

		if (EVENT_TYPES.indexOf(eventType) === -1) {
			throw new Error(
				`Invalid "eventType" parameter "${eventType}" in Livestream Provider#getEventsByType()`
			);
		}

		function fetchPage(items, provider, page) {
			return provider.client(`/accounts/${accountId}/${eventType}`, {page}).then(res => {
				const {data} = res;
				if (data.length === 0) {
					return items;
				}
				items = items.concat(data);
				return fetchPage(items, provider, page + 1);
			});
		}

		return fetchPage([], this, 1);
	}

	getEvent(args) {
		args = args || {};

		const accountId = this.accountId;
		const eventId = args.eventId;

		if (!eventId || (typeof eventId !== `string` && typeof eventId !== `number`)) {
			throw new Error(
				`Missing required "eventId" parameter in Livestream Provider#getEvent()`
			);
		}

		return this.client(`/accounts/${accountId}/events/${eventId}`);
	}

	getVideo(args) {
		args = args || {};

		const accountId = this.accountId;
		const eventId = args.eventId;
		const videoId = args.videoId;

		if (!eventId || (typeof eventId !== `string` && typeof eventId !== `number`)) {
			throw new Error(
				`Missing required "eventId" parameter in Livestream Provider#getVod()`
			);
		}
		if (!videoId || (typeof videoId !== `string` && typeof videoId !== `number`)) {
			throw new Error(
				`Missing required "videoId" parameter in Livestream Provider#getVod()`
			);
		}

		return this.client(`/accounts/${accountId}/events/${eventId}/videos/${videoId}`);
	}

	getEventVideosPage(args) {
		args = args || {};

		const accountId = this.accountId;
		const eventId = args.eventId;

		if (!eventId || (typeof eventId !== `string` && typeof eventId !== `number`)) {
			throw new Error(
				`Missing required "eventId" parameter in Livestream Provider#getEventVideosPage()`
			);
		}

		const params = {
			older: args.older || 0,
			newer: args.newer || 0
		};

		if (args.offset) {
			params.offset_post_id = args.offset; // eslint-disable-line camelcase
		}

		return this.client(`/accounts/${accountId}/events/${eventId}/videos`, params);
	}

	getAllEventVideos(args) {
		args = args || {};

		const eventId = args.eventId;

		if (!eventId || (typeof eventId !== `string` && typeof eventId !== `number`)) {
			throw new Error(
				`Missing required "eventId" parameter in Livestream Provider#getAllEventVideos()`
			);
		}

		const maxItems = 20;
		const pageArgs = {eventId};

		function fetchPage(videos, provider, offset) {
			const params = Object.assign({}, pageArgs, {older: maxItems});
			if (offset) {
				params.offset = offset;
			}

			return provider.getEventVideosPage(params).then(res => {
				if (res && res.vods && Array.isArray(res.vods.data)) {
					// If we started with an offset, we need to shift it off the inclusive
					// result set.
					if (offset) {
						res.vods.data.shift();
					}
					videos = videos.concat(
						res.vods.data.filter(item => item.type === `video`).map(item => item.data)
					);
				}

				// Check to see if this is all the results, or is there another page?
				if (res && res.vods && Array.isArray(res.vods.data) && res.vods.data.length >= maxItems) {
					// Set the new offset and request the next page.
					offset = res.vods.data[res.vods.data.length - 1].data.id;
					return fetchPage(videos, provider, offset);
				}

				return videos;
			});
		}

		return fetchPage([], this);
	}

	// Standard method used by Oddworks applications to fetch a given asset.
	getAsset(type, channel, args) {
		args = args || {};

		switch (type) {
			case `event`:
				return this.getEventAsset(channel, args);
			case `video`:
				return this.getVideoAsset(channel, args);
			default:
				throw new Error(`No Livestream Provider method for asset type "${type}"`);
		}
	}

	getEventAsset(channel, args) {
		args = args || {};

		const eventId = args.eventId;

		if (!channel || typeof channel !== `string`) {
			throw new Error(
				`Missing required "channel" parameter in Livestream Provider#getEventAsset()`
			);
		}
		if (!eventId || (typeof eventId !== `string` && typeof eventId !== `number`)) {
			throw new Error(
				`Missing required "eventId" parameter in Livestream Provider#getEventAsset()`
			);
		}

		const promises = [
			this.getEvent({eventId}),
			this.getEventVideosPage({eventId, older: 1})
		];

		return Promise.all(promises).then(results => {
			const event = results[0];
			const videos = (results[1].vods || {}).data || [];
			const vod = videos[0] ? videos[0].data : null;
			return eventToEventTransform(channel, event, vod);
		});
	}

	getVideoAsset(channel, args) {
		args = args || {};

		const eventId = args.eventId;
		const videoId = args.videoId;
		const accountId = this.accountId;

		if (!channel || typeof channel !== `string`) {
			throw new Error(
				`Missing required "channel" parameter in Livestream Provider#getVideoAsset()`
			);
		}
		if (!eventId || (typeof eventId !== `string` && typeof eventId !== `number`)) {
			throw new Error(
				`Missing required "eventId" parameter in Livestream Provider#getVideoAsset()`
			);
		}
		if (!videoId || (typeof videoId !== `string` && typeof videoId !== `number`)) {
			throw new Error(
				`Missing required "videoId" parameter in Livestream Provider#getVideoAsset()`
			);
		}

		return this.getVideo({eventId, videoId}).then(video => {
			return videoToVideoTransform(channel, accountId, video);
		});
	}

	static eventToEventTransform(channel, source, vod) {
		return eventToEventTransform(channel, source, vod);
	}

	static videoToVideoTransform(channel, accountId, source) {
		return videoToVideoTransform(channel, accountId, source);
	}

	static signUrl(args, url) {
		const {secretKey, clientId} = args;
		const timestamp = Date.now();
		const hmac = crypto.createHmac(`md5`, secretKey);

		const str = `${secretKey}:playback:${timestamp}`;
		const token = hmac.update(str).digest(`hex`);

		return `${url}?clientId=${clientId}&timestamp=${timestamp}&token=${token}`;
	}

	// Returns an Array of Livestream accounts associated with the given secretKey.
	static getAccounts(args) {
		args = args || {};
		const secretKey = args.secretKey;

		if (!secretKey || typeof secretKey !== `string`) {
			throw new Error(
				`Missing required "secretKey" parameter in Livestream Provider.getAccounts()`
			);
		}

		const client = APIClient.createClient({secretKey});
		return client(`/accounts`);
	}

	static create(options) {
		options = options || {};
		const accountId = options.accountId;
		const secretKey = options.secretKey;
		const requestInterval = options.requestInterval;

		if (!accountId || typeof accountId !== `string`) {
			throw new Error(
				`Missing required "accountId" parameter in Livestream Provider.create()`
			);
		}
		if (!secretKey || typeof secretKey !== `string`) {
			throw new Error(
				`Missing required "secretKey" parameter in Livestream Provider.create()`
			);
		}

		return new Provider({
			accountId,
			secretKey,
			requestInterval
		});
	}
}

module.exports = Provider;
