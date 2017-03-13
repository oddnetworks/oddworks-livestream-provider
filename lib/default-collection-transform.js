'use strict';

const formatImages = collection => {
	return [{
		url: collection.logo.url,
		width: (collection.logo.url.substring('poster') === -1) ? 1589 : 170,
		height: (collection.logo.url.substring('poster') === -1) ? 886 : 255,
		label: 'thumbnail'
	}, {
		url: collection.logo.smallUrl,
		width: (collection.logo.smallUrl.substring('poster') === -1) ? 1589 : 170,
		height: (collection.logo.smallUrl.substring('poster') === -1) ? 170 : 95,
		label: 'thumbnail-small'
	}];
};

module.exports = (spec, collection) => {
	let images = Array.isArray(spec.images) ? spec.images : [];
	images = images.concat(formatImages(collection));

	return {
		id: spec.id.replace(/^spec/, 'res'),
		title: collection.fullName || collection.shortName,
		description: collection.description,
		genres: [],
		tags: collection.tags,
		images,
		relationships: collection.relationships,
		meta: {
			maxAge: 0
		}
	};
};
