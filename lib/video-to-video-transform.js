const lib = require(`./library`);

const deepFreeze = lib.deepFreeze;
const composeImages = lib.composeImages;

module.exports = function videoToVideoTransform(channel, accountId, source) { // eslint-disable-line func-names
	if (!accountId) {
		throw new Error(
			`Livstream provider videoToVideoTransform() missing expected accountId property`
		);
	}
	if (!source.id) {
		throw new Error(
			`Livstream provider videoToVideoTransform() missing expected source.id property`
		);
	}
	if (!source.eventId) {
		throw new Error(
			`Livstream provider videoToVideoTransform() missing expected source.eventId property`
		);
	}
	if (!source.m3u8) {
		throw new Error(
			`Livstream provider videoToVideoTransform() missing expected source.m3u8 property`
		);
	}

	const eventId = source.eventId;
	const videoId = source.id;

	let imageUrl;
	if (source.thumbnailUrl) {
		imageUrl = source.thumbnailUrl;
	} else if (source.thumbnailUrlSmall) {
		imageUrl = source.thumbnailUrlSmall;
	}

	const images = imageUrl ? composeImages(imageUrl) : [];

	const sources = [{
		container: `hls`,
		mimeType: `application/x-mpegURL`,
		sourceType: `VOD`,
		broadcasting: true,
		height: null,
		width: null,
		maxBitrate: 0,
		label: `videoOnDemand`,
		url: source.m3u8
	}];

	return deepFreeze({
		type: `video`,
		id: `${channel}-livestream-video-${accountId}-${eventId}-${videoId}`,
		attributes: {
			title: source.caption || `Untitled Video`,
			description: source.description || source.caption || `Video on demand.`,
			images,
			sources,
			duration: Number.isInteger(source.duration) || 0,
			genres: [],
			tags: Array.isArray(source.tags) ? source.tags : [],
			cast: [],
			releaseDate: source.publishAt || source.createdAt,
			channel
		},
		source: {
			providerLabel: `livestream`,
			assetType: `video`,
			args: {
				eventId: eventId.toString(),
				videoId: videoId.toString()
			}
		}
	});
};
