const {deepFreeze} = require(`./library`);

module.exports = function vodToVideoTransform(source) { // eslint-disable-line func-names
	if (!source.id) {
		throw new Error(
			`Livstream provider vodToVideoTransform() missing expected source.id property`
		);
	}
	if (!source.eventId) {
		throw new Error(
			`Livstream provider vodToVideoTransform() missing expected source.eventId property`
		);
	}
	if (!source.m3u8) {
		throw new Error(
			`Livstream provider vodToVideoTransform() missing expected source.m3u8 property`
		);
	}

	const images = [];

	// Convert this:
	//   "http://img.new.livestream.com/events/00625bc1/ae58-27e0a8312512.png"
	// to this:
	//   "https://img.new.livestream.com/events/00625bc1/ae58-27e0a8312512_320x180.png"

	let imageUrl;
	if (source.thumbnailUrl) {
		imageUrl = source.thumbnailUrl;
	} else if (source.thumbnailUrlSmall) {
		imageUrl = source.thumbnailUrlSmall;
	}

	if (imageUrl) {
		const url = imageUrl.replace(/^http:/, `https:`).replace(/_[\d]+x[\d]+./, `.`);
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
		url: source.m3u8,
		container: `hls`,
		mimeType: `application/x-mpegURL`,
		sourceType: `VOD`,
		broadcasting: true,
		height: null,
		width: null,
		maxBitrate: 0,
		label: `hls`
	}];

	return deepFreeze({
		id: `event-${source.eventId}-vod-${source.id}`,
		type: `video`,
		attributes: {
			title: source.caption || `Untitled Video`,
			description: source.description || source.caption || `Video on demand.`,
			images,
			sources,
			cast: [],
			duration: source.duration || 0,
			genres: [],
			releaseDate: source.publishAt || source.createdAt,
			tags: Array.isArray(source.tags) || [],
			isLive: true
		}
	});
};
