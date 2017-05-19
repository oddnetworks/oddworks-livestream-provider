'use strict';

// Convert a season or episode tag to a proper key
//
// ex: "S-1" => "s-001"
exports.tagToKey = function (tag) {
	const parts = tag.split('-');
	const letter = parts[0].toLowerCase();
	const num = exports.pad(parts[1], 3, '0');
	return `${letter}-${num}`;
};

exports.pad = function (n, width, z) {
	z = (z || 0).toString();
	n = (n || '').toString();
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};

// client - Livestream HTTP Client
// creds.apiKey
// creds.accountId
// creds.clientId
// id *required
// maxItems - default=10
exports.getAllEventVods = function (client, creds, id, maxItems) {
	maxItems = maxItems || 10;

	const defaults = Object.assign({}, creds, {id, older: maxItems});

	function fetchPage(videos, offset) {
		const params = Object.assign({}, defaults);

		if (offset) {
			params.offset = offset;
		}

		return client.getEventVideos(params).then(res => {
			// Collect VODs for this collection.
			if (res && res.vods && Array.isArray(res.vods.data)) {
				// If we started with an offset, we need to shift it off the inclusive
				// result set.
				if (offset) {
					res.vods.data.shift();
				}

				res.vods.data.filter(item => item.type === 'video').forEach(item => {
					videos.push(item.data);
				});
			}

			// Check to see if this is all the results, or is there another page?
			if (res && res.vods && Array.isArray(res.vods.data) && res.vods.data.length >= maxItems) {
				// Set the new offset and request the next page.
				offset = res.vods.data[res.vods.data.length - 1].data.id;
				return fetchPage(videos, offset);
			}

			return videos;
		});
	}

	return fetchPage([]);
};
