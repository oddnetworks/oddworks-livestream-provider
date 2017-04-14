'use strict';

const Promise = require('bluebird');

module.exports = (bus, client, transform) => {
	//
	// Attached to the oddcast command handler for
	//  {role: 'provider', cmd: 'get', source: 'livestream-video'}
	//
	// Will recieve:
	// - args.spec - The specification object
	// - args.object - The resource object
	//
	// The specification object is expected to have 2 parts
	// - spec.event - A shell for a Livestream event object with minimally: `{id: "STRING"}`
	// - spec.video - Optionally used to check for VOD content: `{id: "STRING"}`
	//
	function fetchVideo(args) {
		const channel = args.channel;
		const secrets = (channel.secrets || {}).livestream || {};
		const apiKey = secrets.apiKey;
		const accountId = secrets.accountId;
		const clientId = secrets.clientId;
		const spec = args.spec;
		const event = spec.event || {};
		const video = spec.video || {};

		if (!apiKey || !accountId || !clientId) {
			bus.broadcast({level: 'warn'}, {
				message: `Skipping Livestream fetchVideo due to missing credentials in channel ${channel.id}`
			});
			return Promise.resolve(null);
		}

		if (!event.id) {
			bus.broadcast({level: 'error'}, {
				message: `Livestream fetchVideo requires an event ID. channel: ${channel.id}`
			});
			return Promise.resolve(null);
		}

		// If video and video.id are present, then the request is for a VOD,
		// not a live stream.
		if (video.id) {
			return fetchVodVideo(channel, spec, {
				apiKey, accountId, clientId,
				eventId: event.id,
				id: video.id
			});
		}

		// Request the live stream video instead.
		return fetchLiveVideo(channel, spec, {
			apiKey, accountId, clientId,
			id: event.id
		});
	}

	function fetchVodVideo(channel, spec, params) {
		return client.getVideo(params).then(res => {
			if (!res) {
				const message = `Video not found for event id "${params.eventId}" video id "${params.id}"`;
				bus.broadcast({level: 'error'}, {
					code: `VIDEO_NOT_FOUND`,
					message: `video not found`,
					spec
				});
				return Promise.reject(new Error(message));
			}

			// Credentials needs to be passed into the transform to sign the stream URL.
			res.creds = {apiKey: params.apiKey, accountId: params.accountId, clientId: params.clientId};
			return transform(spec, res);
		});
	}

	function fetchLiveVideo(channel, spec, params) {
		return client.getEventVideos(params).then(res => {
			if (!res) {
				const message = `Live video not found for event id "${params.id}"`;
				bus.broadcast({level: 'error'}, {
					code: `VIDEO_NOT_FOUND`,
					message: `video not found`,
					spec
				});
				return Promise.reject(new Error(message));
			}

			const videoData = res.live;

			if (!videoData) {
				const error = new Error(`No Livestream live stream for event ${params.id} in channel ${channel.id}`);
				error.code = 'VIDEO_NOT_FOUND';

				bus.broadcast({level: 'warn'}, {
					spec,
					error,
					code: error.code,
					message: error.message
				});

				return null;
			}

			// Credentials needs to be passed into the transform to sign the stream URL.
			videoData.creds = {apiKey: params.apiKey, accountId: params.accountId, clientId: params.clientId};
			return transform(spec, videoData);
		});
	}

	return fetchVideo;
};
