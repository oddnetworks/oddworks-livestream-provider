const lib = require(`./library`);

const deepFreeze = lib.deepFreeze;
const composeImages = lib.composeImages;

module.exports = function eventToEventTransform(channel, source, vod) { // eslint-disable-line func-names
	if (!channel) {
		throw new Error(
			`Livstream provider eventToEventTransform() missing expected channel argument`
		);
	}
	if (!source.id) {
		throw new Error(
			`Livstream provider eventToEventTransform() missing expected source.id property`
		);
	}
	if (!source.ownerAccountId) {
		throw new Error(
			`Livstream provider eventToEventTransform() missing expected source.ownerAccountId property`
		);
	}

	const eventId = source.id.toString();
	const accountId = source.ownerAccountId.toString();

	const nowISO = new Date().toISOString();
	const isPreLive = nowISO < source.startTime;
	const isPostLive = nowISO > source.endTime;
	const isLive = source.isLive;

	let images = [];
	if (source.logo && source.logo.url) {
		images = composeImages(source.logo.url);
	}

	const sources = [
		{
			container: `hls`,
			mimeType: `application/x-mpegURL`,
			sourceType: `LINEAR`,
			broadcasting: Boolean(source.isLive),
			height: null,
			width: null,
			maxBitrate: 0,
			label: `liveStream`,
			url: `https://livestreamapis.com/v3/accounts/${accountId}/events/${eventId}/master.m3u8`
		}
	];

	if (vod && vod.m3u8) {
		sources.push({
			container: `hls`,
			mimeType: `application/x-mpegURL`,
			sourceType: `VOD`,
			broadcasting: Boolean(source.isLive),
			height: null,
			width: null,
			maxBitrate: 0,
			label: `videoOnDemand`,
			url: vod.m3u8
		});
	}

	return deepFreeze({
		type: `event`,
		id: `${channel}-livestream-event-${accountId}-${eventId}`,
		attributes: {
			title: source.fullName || source.shortName || `Untitled Live Stream`,
			description: source.description || `Live video.`,
			images,
			sources,
			isLive,
			isPreLive,
			isPostLive,
			duration: Number.isInteger(vod && vod.duration) ? vod.duration : 0,
			genres: [],
			tags: Array.isArray(source.tags) ? source.tags : [],
			cast: [],
			releaseDate: source.startTime || source.createdAt,
			endDate: source.endTime || new Date().toISOString(),
			channel
		},
		source: {
			providerLabel: `livestream`,
			assetType: `event`,
			args: {
				eventId: eventId.toString()
			}
		}
	});
};
