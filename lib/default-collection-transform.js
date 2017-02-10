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
	return {
		id: `res-livestream-collection-${collection.id}`,
		title: collection.fullName || collection.shortName,
		description: collection.description,
		genres: [],
		tags: collection.tags,
		images: formatImages(collection),
		relationships: collection.relationships,
		meta: {
			maxAge: 0
		}
	};
};
