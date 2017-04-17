'use strict';

const Promise = require('bluebird');

module.exports = (bus, client, transform) => {
	//
	// Attached to the oddcast command handler for
	//  {role: 'provider', cmd: 'get', source: 'livestream-live-video'}
	//
	// Will recieve:
	// - args.channel - The channel object
	// - args.spec - The specification object
	// - args.object - The resource object
	//
	// The specification object is expected to have 1 part
	// - spec.event - A shell for a Livestream event object with minimally: `{id: "STRING"}`
	function fetchLiveVideo(args) {
		const channel = args.channel;
		const secrets = (channel.secrets || {}).livestream || {};
		const apiKey = secrets.apiKey;
		const accountId = secrets.accountId;
		const clientId = secrets.clientId;
		const spec = args.spec;
		const event = spec.event || {};

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

		const params = {
			apiKey, accountId, clientId,
			id: event.id
		};

		return client.getEvent(params).then(event => {
			if (!event) {
				const error = new Error(`Event "${params.id}" does not exist to fetch live video`);
				error.code = `EVENT_NOT_FOUND`;
				bus.broadcast({level: 'error'}, {
					code: error.code,
					message: error.message,
					spec
				});
				return Promise.reject(error);
			}

			const videoData = {
				isLive: event.isLive,
				draft: event.draft,
				caption: event.shortName || event.fullName,
				description: event.description,
				duration: 0,
				eventId: event.id,
				createdAt: event.createdAt,
				startTime: event.startTime,
				endTime: event.endTime,
				tags: event.tags,
				logo: event.logo,
				m3u8: `https://livestreamapis.com/v2/accounts/${accountId}/events/${event.id}/master.m3u8`
			};

			// Credentials needs to be passed into the transform to sign the stream URL.
			videoData.creds = {apiKey: params.apiKey, accountId: params.accountId, clientId: params.clientId};
			return transform(spec, videoData);
		});
	}

	return fetchLiveVideo;
};
