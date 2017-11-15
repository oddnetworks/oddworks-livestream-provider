'use strict';

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
	}

	getVod(args) {
		args = args || {};

		const accountId = this.accountId;
		const eventId = args.eventId;
		const videoId = args.videoId;

		if (!eventId || typeof eventId !== `string`) {
			throw new Error(
				`Missing required "eventId" parameter in Livestream Provider#getVod()`
			);
		}
		if (!videoId || typeof videoId !== `string`) {
			throw new Error(
				`Missing required "videoId" parameter in Livestream Provider#getVod()`
			);
		}

		return this.client(`/accounts/${accountId}/events/${eventId}/videos/${videoId}`);
	}

	getLiveVideo(args) {
		args = args || {};

		const accountId = this.accountId;
		const eventId = args.eventId;

		if (!eventId || typeof eventId !== `string`) {
			throw new Error(
				`Missing required "eventId" parameter in Livestream Provider#getLiveVideo()`
			);
		}

		return this.client(`/accounts/${accountId}/events/${eventId}`);
	}

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
