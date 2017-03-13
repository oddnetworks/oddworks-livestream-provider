'use strict';

const Promise = require('bluebird');
const Client = require('./lib/client');
const defaultVideoTransform = require('./lib/default-video-transform');
const defaultCollectionTransform = require('./lib/default-collection-transform');
const createChannelCache = require('./lib/create-channel-cache');
const fetchVideo = require('./lib/fetch-video');
const fetchCollection = require('./lib/fetch-collection');
const fetchSeries = require('./lib/fetch-series');
const fetchSeason = require('./lib/fetch-season');

const DEFAULTS = {
	collectionTransform: defaultCollectionTransform,
	videoTransform: defaultVideoTransform
};

exports.SEASON_TAG_PATTERN = /^[sS]{1}-[\d]+/;
exports.EPISODE_TAG_PATTERN = /^[eE]{1}-[\d]+/;

// options.bus
// options.accessToken
// options.collectionTransform
// options.videoTransform
exports.initialize = options => {
	options = Object.assign({}, DEFAULTS, options || {});

	const bus = options.bus;
	const apiKey = options.apiKey;
	const accountId = options.accountId;
	const role = 'provider';
	const cmd = 'get';

	if (!bus || typeof bus !== 'object') {
		throw new Error('oddworks-livestream-provider requires an Oddcast Bus');
	}

	const collectionTransform = options.collectionTransform;
	const videoTransform = options.videoTransform;

	const client = new Client({bus, apiKey, accountId});

	const getChannel = createChannelCache(bus);

	bus.queryHandler(
		{role, cmd, source: 'livestream-collection'},
		exports.createCollectionHandler(bus, getChannel, client, collectionTransform)
	);

	bus.queryHandler(
		{role, cmd, source: 'odd-livestream-series'},
		exports.createSeriesHandler(bus, getChannel, client, collectionTransform)
	);

	bus.queryHandler(
		{role, cmd, source: 'odd-livestream-season'},
		exports.createSeasonHandler(bus, getChannel, client, collectionTransform)
	);

	bus.queryHandler(
		{role, cmd, source: 'livestream-video'},
		exports.createVideoHandler(bus, getChannel, client, videoTransform)
	);

	return Promise.resolve({
		name: 'livestream-provider',
		client
	});
};

exports.createCollectionHandler = (bus, getChannel, client, transform) => {
	const getCollection = fetchCollection(bus, client, transform);

	// Called from Oddworks core via bus.query
	// Expects:
	//	args.spec.collection.id
	return args => {
		const spec = args.spec;
		const event = spec.event || {};
		const id = event.id;
		const channelId = spec.channel;

		if (!id || typeof id !== 'string') {
			throw new Error(
				'livestream-collection spec.event.id String is required'
			);
		}

		return getChannel(channelId).then(channel => {
			return getCollection({spec, channel, event});
		});
	};
};

exports.createSeriesHandler = (bus, getChannel, client, transform) => {
	const getSeries = fetchSeries(bus, client, transform);

	// Called from Oddworks core via bus.query
	// Expects:
	//	args.spec.collection.id
	return args => {
		const spec = args.spec;
		const event = spec.event || {};
		const id = event.id;
		const channelId = spec.channel;

		if (!id || typeof id !== 'string') {
			throw new Error(
				'odd-livestream-series spec.event.id String is required'
			);
		}

		return getChannel(channelId).then(channel => {
			return getSeries({spec, channel, event});
		});
	};
};

exports.createSeasonHandler = (bus, getChannel, client, transform) => {
	const getSeason = fetchSeason(bus, client, transform);

	// Called from Oddworks core via bus.query
	// Expects:
	//	args.spec.collection.id
	return args => {
		const spec = args.spec;
		const event = spec.event || {};
		const id = event.id;
		const channelId = spec.channel;

		if (!id || typeof id !== 'string') {
			throw new Error(
				'odd-livestream-season spec.event.id String is required'
			);
		}

		return getChannel(channelId).then(channel => {
			return getSeason({spec, channel, event});
		});
	};
};

exports.createVideoHandler = (bus, getChannel, client, transform) => {
	const getVideo = fetchVideo(bus, client, transform);

	// Called from Oddworks core via bus.query
	// Expects:
	// args.spec.event.id *required
	// args.spec.event.vod *optional id of the child VOD
	return args => {
		const spec = args.spec;
		const channelId = spec.channel;
		const event = spec.event || {};

		if (!event.id || typeof event.id !== 'string') {
			throw new Error(
				'livestream-video spec.event.id String is required'
			);
		}

		return getChannel(channelId).then(channel => {
			return getVideo({spec, channel, event});
		});
	};
};

// options.accessToken *required
// options.bus *optional
exports.createClient = options => {
	options = Object.assign({}, DEFAULTS, options || {});

	const bus = options.bus;
	const apiKey = options.apiKey;
	const accountId = options.accountId;

	if (!apiKey || typeof apiKey !== 'string') {
		throw new Error(
			'oddworks-livestream-provider requires an apiToken'
		);
	}
	if (!accountId || typeof accountId !== 'string') {
		throw new Error(
			'oddworks-livestream-provider requires an accountId'
		);
	}

	return new Client({bus, apiKey, accountId});
};

exports.composeVideoId = (channel, event, video) => {
	return `livestream-video-${channel}-${event}-${video}`;
};

exports.composeSeriesId = (channel, event) => {
	return `odd-livestream-series-${channel}-${event}`;
};

exports.composeSeasonId = (channel, event, season) => {
	return `odd-livestream-season-${channel}-${event}-${season.toLowerCase()}`;
};
