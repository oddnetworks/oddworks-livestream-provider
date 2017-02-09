'use strict';

const Promise = require('bluebird');
const Client = require('./lib/client');
const defaultVideoTransform = require('./lib/default-video-transform');
const defaultCollectionTransform = require('./lib/default-collection-transform');
const createChannelCache = require('./lib/create-channel-cache');
const fetchVideo = require('./lib/fetch-video');
const fetchCollection = require('./lib/fetch-collection');

const DEFAULTS = {
	collectionTransform: defaultCollectionTransform,
	videoTransform: defaultVideoTransform
};

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
				'livestream-collection-provider spec.event.id String is required'
			);
		}

		return getChannel(channelId).then(channel => {
			return getCollection({spec, channel, event});
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
				'livestream-video-provider spec.event.id String is required'
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
