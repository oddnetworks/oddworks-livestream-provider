'use strict';

const test = require('ava');
const nock = require('nock');
const Promise = require('bluebird');

const provider = require('../');
const videoTransform = require('../lib/default-video-transform');
const eventResponseOffline = require('./fixtures/event-response-offline');
const eventResponseOnline = require('./fixtures/event-response-online');
const helpers = require('./helpers');

const apiKey = 'foo';
const accountId = 'bar';
const clientId = 'baz';

const getChannel = () => {
	return Promise.resolve({
		id: 'abc',
		secrets: {
			livestream: {
				apiKey,
				accountId,
				clientId
			}
		}
	});
};

let bus;
let liveVideoHandler = null;

test.before(() => {
	nock('https://livestreamapis.com').get(`/v2/accounts/${accountId}/events/0`).reply(404);
	nock('https://livestreamapis.com').get(`/v2/accounts/${accountId}/events/offline`).reply(200, eventResponseOffline);
	nock('https://livestreamapis.com').get(`/v2/accounts/${accountId}/events/online`).reply(200, eventResponseOnline);
});

test.beforeEach(() => {
	bus = helpers.createBus();

	const client = provider.createClient({apiKey: 'foo', accountId: 'bar'});

	liveVideoHandler = provider.createLiveVideoHandler(bus, getChannel, client, videoTransform);
});

test('when live event not found', t => {
	t.plan(4);

	const spec = {
		channel: 'abc',
		type: 'videoSpec',
		id: 'spec-livestream-live-video-0',
		event: {id: 0}
	};

	const obs = new Promise(resolve => {
		bus.observe({level: 'error'}, payload => {
			resolve(payload);
		});
	});

	return liveVideoHandler({spec}).catch(err => {
		// test error condition
		t.is(err.message, `Event "${spec.event.id}" does not exist to fetch live video`);

		// test bus event
		return obs.then(event => {
			t.is(event.code, 'EVENT_NOT_FOUND');
			t.deepEqual(event.spec, spec);
			t.is(event.message, `Event "${spec.event.id}" does not exist to fetch live video`);
			return null;
		});
	}).catch(err => {
		console.error('ERROR', err.stack);
		return Promise.reject(err);
	});
});

test('when live event not broadcasting', t => {
	t.plan(7);

	const spec = {
		channel: 'abc',
		type: 'videoSpec',
		id: 'spec-livestream-live-video-offline',
		event: {id: 'offline'}
	};

	return liveVideoHandler({spec}).then(video => {
		t.is(video.channel, 'abc');
		t.is(video.id, `res-livestream-live-video-offline`);
		t.is(video.title, 'Odd Office');
		t.is(video.images[0].url, 'http://cdn.livestream.com/newlivestream/poster-default.jpeg');
		t.is(video.sources.length, 1);
		const source = video.sources[0];
		t.is(source.sourceType, 'linear');
		t.is(source.broadcasting, false);

		return null;
	}).catch(err => {
		console.error('ERROR', err.stack);
		return Promise.reject(err);
	});
});

test('when live event is broadcasting', t => {
	t.plan(7);

	const spec = {
		channel: 'abc',
		type: 'videoSpec',
		id: 'spec-livestream-live-video-online',
		event: {id: 'online'}
	};

	return liveVideoHandler({spec}).then(video => {
		t.is(video.channel, 'abc');
		t.is(video.id, `res-livestream-live-video-online`);
		t.is(video.title, 'Watch Us Code');
		t.is(video.images[0].url, 'http://cdn.livestream.com/newlivestream/poster-default.jpeg');
		t.is(video.sources.length, 1);
		const source = video.sources[0];
		t.is(source.sourceType, 'linear');
		t.is(source.broadcasting, true);

		return null;
	}).catch(err => {
		console.error('ERROR', err.stack);
		return Promise.reject(err);
	});
});
