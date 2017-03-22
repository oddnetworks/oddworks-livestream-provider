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
exports.getAllEventVideos = function (client, creds, id, maxItems) {
	maxItems = maxItems || 10;

	const defaults = Object.assign({}, creds, {id, older: maxItems});

	const videos = [];

	function fetchPage() {
		const params = Object.assign({}, defaults);

		if (offset) {
			params.offset = offset;
		}

		return client.getEventVideos(params).then(res => {
		});
	}
};
