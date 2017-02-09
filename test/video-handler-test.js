'use strict';

const test = require('ava');
const nock = require('nock');
const Promise = require('bluebird');

const provider = require('../');
const videoTransform = require('../lib/default-video-transform');
const eventResponseOnline = require('./fixtures/event-response-online');
const eventVideosResponseOnline = require('./fixtures/event-videos-response-online');
const helpers = require('./helpers');

const apiKey = 'foo';
const accountId = 'bar';

const getChannel = () => {
	return Promise.resolve({
		id: 'abc',
		secrets: {
			livestream: {
				apiKey,
				accountId
			}
		}
	});
};

let bus;
let videoHandler = null;

test.before(() => {
	nock('https://livestreamapis.com').get(`/v2/accounts/${accountId}/events/online/videos`).twice().reply(200, eventVideosResponseOnline);
	nock('https://livestreamapis.com').get(`/v2/accounts/${accountId}/events/1`).reply(404);
	nock('https://livestreamapis.com').get(`/v2/accounts/${accountId}/events/online`).thrice().reply(200, eventResponseOnline);
});

test.beforeEach(() => {
	bus = helpers.createBus();

	const client = provider.createClient({apiKey: 'foo', accountId: 'bar'});

	videoHandler = provider.createVideoHandler(bus, getChannel, client, videoTransform);
});

test('when live event not found', t => {
	const spec = {
		channel: 'abc',
		type: 'videoSpec',
		id: 'spec-livestream-video-1',
		event: {id: '1'}
	};

	const obs = new Promise(resolve => {
		bus.observe({level: 'error'}, payload => {
			resolve(payload);
		});
	});

	return videoHandler({spec}).catch(err => {
		// test error condition
		t.is(err.message, `Video not found for event id "${spec.event.id}", video id "null"`);

		// test bus event
		return obs.then(event => {
			t.deepEqual(event.error, {code: 'VIDEO_NOT_FOUND'});
			t.is(event.code, 'VIDEO_NOT_FOUND');
			t.deepEqual(event.spec, spec);
			t.is(event.message, 'video not found');
		});
	});
});

test('when live event found', t => {
	const spec = {
		channel: 'abc',
		type: 'videoSpec',
		id: `spec-livestream-video-online`,
		event: {id: 'online'}
	};

	return videoHandler({spec})
		.then(res => {
			t.deepEqual(Object.keys(res), [
				'id',
				'title',
				'description',
				'images',
				'sources',
				'duration',
				'genres',
				'tags',
				'cast',
				'releaseDate',
				'meta'
			]);
			t.is(res.id, `res-livestream-video-${eventResponseOnline.id}`);
			t.is(res.title, eventResponseOnline.fullName);
			t.is(res.description, eventResponseOnline.description);
			t.is(res.images.length, 2);
			t.is(res.images[0].url, eventResponseOnline.logo.url);
			t.is(res.images[1].url, eventResponseOnline.logo.smallUrl);
			t.is(res.sources.length, 1);

			t.is(res.sources[0].url, `https://livestreamapis.com/v2/accounts/${accountId}/events/${eventResponseOnline.id}/master.m3u8`);
			t.is(res.sources[0].label, '');
			t.is(res.sources[0].mimeType, 'application/x-mpegURL');
			t.is(res.sources[0].width, null);
			t.is(res.sources[0].height, null);
			t.is(res.sources[0].container, 'hls');
			t.is(res.sources[0].maxBitrate, 0);

			t.is(res.duration, eventResponseOnline.duration);
			t.is(res.releaseDate, eventResponseOnline.startTime);
		});
});

test('when vod not found', t => {
	const spec = {
		channel: 'abc',
		type: 'videoSpec',
		id: 'spec-livestream-video-1',
		event: {id: 'online'},
		video: {id: '1'}
	};

	const obs = new Promise(resolve => {
		bus.observe({level: 'error'}, payload => {
			resolve(payload);
		});
	});

	return videoHandler({spec}).catch(err => {
		// test error condition
		t.is(err.message, `Video not found for event id "${spec.event.id}", video id "1"`);

		// test bus event
		return obs.then(event => {
			t.deepEqual(event.error, {code: 'VIDEO_NOT_FOUND'});
			t.is(event.code, 'VIDEO_NOT_FOUND');
			t.deepEqual(event.spec, spec);
			t.is(event.message, 'video not found');
		});
	});
});

test('when vod found', t => {
	const spec = {
		channel: 'abc',
		type: 'videoSpec',
		id: `spec-livestream-video-online`,
		event: {id: 'online'},
		video: {id: '137760416'}
	};

	return videoHandler({spec})
		.then(res => {
			t.deepEqual(Object.keys(res), [
				'id',
				'title',
				'description',
				'images',
				'sources',
				'duration',
				'genres',
				'tags',
				'cast',
				'releaseDate',
				'meta'
			]);

			const vod = eventVideosResponseOnline.vods.data[0].data;

			t.is(res.id, `res-livestream-video-${vod.id}`);
			t.is(res.title, vod.caption);
			t.is(res.description, vod.description);
			t.is(res.images.length, 2);
			t.is(res.images[0].url, vod.thumbnailUrl);
			t.is(res.images[1].url, vod.thumbnailUrlSmall);
			t.is(res.sources.length, 1);

			t.is(res.sources[0].url, `https://livestreamapis.com/v2/accounts/${accountId}/events/${spec.event.id}/videos/${vod.id}.m3u8`);
			t.is(res.sources[0].label, '');
			t.is(res.sources[0].mimeType, 'application/x-mpegURL');
			t.is(res.sources[0].width, null);
			t.is(res.sources[0].height, null);
			t.is(res.sources[0].container, 'hls');
			t.is(res.sources[0].maxBitrate, 0);

			t.is(res.duration, vod.duration);
			t.is(res.releaseDate, vod.publishAt);
		});
});
