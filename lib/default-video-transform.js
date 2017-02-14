'use strict';

const crypto = require('crypto');

const formatImages = video => {
	let thumbnail = {
		url: video.thumbnailUrl,
		width: 960,
		height: 540,
		label: 'thumbnail'
	};
	if (video.logo) {
		thumbnail = {
			url: video.logo.url,
			width: (video.logo.url.substring('poster') === -1) ? 1589 : 170,
			height: (video.logo.url.substring('poster') === -1) ? 886 : 255,
			label: 'thumbnail'
		};
	}

	let thumbnailSmall = {
		url: video.thumbnailUrlSmall,
		width: 960,
		height: 540,
		label: 'thumbnail-small'
	};
	if (video.logo) {
		thumbnailSmall = {
			url: video.logo.smallUrl,
			width: (video.logo.smallUrl.substring('poster') === -1) ? 1589 : 170,
			height: (video.logo.smallUrl.substring('poster') === -1) ? 170 : 95,
			label: 'thumbnail-small'
		};
	}

	return [thumbnail, thumbnailSmall];
};

const formatSources = video => {
	const ts = Date.now();
	const hmac = crypto.createHmac('md5', video.creds.apiKey);
	let token = `${video.creds.apiKey}:playback:${ts}`;
	token = hmac.update(token).digest('hex');

	let url = video.m3u8;
	if (!url) {
		url = `https://livestreamapis.com/v2/accounts/${video.creds.accountId}/events/${video.id}/master.m3u8`;
	}

	url += `?client_id=${video.creds.clientId}&timestamp=${ts}&token=${token}`;

	const sources = [{
		url,
		container: 'hls',
		mimeType: 'application/x-mpegURL',
		height: null,
		width: null,
		maxBitrate: 0,
		label: ''
	}];

	return sources;
};

module.exports = (spec, video) => {
	return {
		id: `res-livestream-video-${video.id}`,
		title: video.fullName || video.shortName || video.caption,
		description: video.description,
		images: formatImages(video),
		sources: formatSources(video),
		duration: video.duration,
		genres: [],
		tags: video.tags,
		cast: [],
		releaseDate: video.publishAt || video.startTime,
		meta: {
			maxAge: 0
		}
	};
};
