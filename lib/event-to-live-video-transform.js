const {deepFreeze} = require(`./library`);

module.exports = function eventToLiveVideoTransform(source) { // eslint-disable-line func-names
	if (!source.id) {
		throw new Error(
			`Livstream provider eventToLiveVideoTransform() missing expected source.id property`
		);
	}
	if (!source.ownerAccountId) {
		throw new Error(
			`Livstream provider eventToLiveVideoTransform() missing expected source.ownerAccountId property`
		);
	}

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

	const sources = [{
		url: `https://livestreamapis.com/v3/accounts/${source.ownerAccountId}/events/${source.id}/master.m3u8`,
		container: `hls`,
		mimeType: `application/x-mpegURL`,
		sourceType: `LINEAR`,
		broadcasting: Boolean(source.isLive),
		height: null,
		width: null,
		maxBitrate: 0,
		label: `hls`
	}];

	return deepFreeze({
		id: `event-${source.id}-live`,
		type: `video`,
		attributes: {
			title: source.fullName || source.shortName || `Untitled Live Stream`,
			description: source.description || `Live video.`,
			images,
			sources,
			cast: [],
			duration: 0,
			genres: [],
			releaseDate: source.startTime || source.createdAt,
			tags: Array.isArray(source.tags) || [],
			isLive: Boolean(source.isLive)
		}
	});
};
