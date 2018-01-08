const {deepFreeze} = require(`./library`);

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

	const images = [];

	// Convert this:
	//   "http://img.new.livestream.com/events/00625bc1/ae58-27e0a8312512.png"
	// to this:
	//   "https://img.new.livestream.com/events/00625bc1/ae58-27e0a8312512_320x180.png"

	if (source.logo && source.logo.url) {
		const url = source.logo.url.replace(/^http:/, `https:`).replace(/_[\d]+x[\d]+./, `.`);
		const parts = url.split(`.`);
		const i = parts.length - 2;
		// Make a copy of the Array of strings so we can safely mutate it.
		const thumbnailParts = parts.slice();
		thumbnailParts[i] = `${thumbnailParts[i]}_320x180`;
		images.push({
			label: `thumbnail`,
			url: thumbnailParts.join(`.`),
			width: 320,
			height: 180
		});
		images.push({
			label: `original`,
			url
		});
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

	if (vod) {
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
			duration: vod ? vod.duration : 0,
			genres: [],
			tags: Array.isArray(source.tags) || [],
			cast: [],
			releaseDate: source.startTime || source.createdAt,
			channel
		},
		source: {
			providerLabel: `livestream`,
			assetType: `event`,
			args: {
				eventId
			}
		}
	});
};
