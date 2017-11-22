'use strict';

const crypto = require(`crypto`);
const APIClient = require(`./lib/api-client`);
const vodToVideoTransform = require(`./lib/vod-to-video-transform`);
const eventToLiveVideoTransform = require(`./lib/event-to-live-video-transform`);

class Provider {
	constructor(spec) {
		this.accountId = spec.accountId;

		this.client = APIClient.createClient({
			secretKey: spec.secretKey,
			requestInterval: spec.requestInterval
		});

		// Make sure methods keep the correct `this` throughout chained async calls.
		this.getVod = this.getVod.bind(this);
		this.getLiveVideo = this.getLiveVideo.bind(this);
		this.getEventVideosPage = this.getEventVideosPage.bind(this);
		this.getAllEventVideos = this.getAllEventVideos.bind(this);
	}

	genericRequest(path, query) {
		const accountId = this.accountId;
		return this.client(`/accounts/${accountId}${path}`, query);
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

	getVod(args) {
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

	getLiveVideo(args) {
		args = args || {};

		const eventId = args.eventId;

		if (!eventId || (typeof eventId !== `string` && typeof eventId !== `number`)) {
			throw new Error(
				`Missing required "eventId" parameter in Livestream Provider#getLiveVideo()`
			);
		}

		return this.getEvent(args);
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
	getAsset(args) {
		args = args || {};
		const subProvider = args.subProvider;
		args = args.args;

		switch (subProvider) {
			case `vod`:
				return this.getVod(args).then(res => {
					const video = vodToVideoTransform(res);
					return {
						data: video,
						provider: `livestream`,
						subProvider: `vod`,
						args: {eventId: res.eventId, videoId: res.id},
						source: res
					};
				});
			case `live-video`:
				return this.getLiveVideo(args).then(res => {
					const video = eventToLiveVideoTransform(res);
					return {
						data: video,
						provider: `livestream`,
						subProvider: `live-video`,
						args: {eventId: res.id},
						source: res
					};
				});
			default:
				throw new Error(`No Livestream Provider method for subProvider "${subProvider}"`);
		}
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
