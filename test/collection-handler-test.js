'use strict';

const test = require('ava');
const nock = require('nock');
const Promise = require('bluebird');

const provider = require('../');
const collectionTransform = require('../lib/default-collection-transform');
const eventResponseOffline = require('./fixtures/event-response-offline');
const eventVideosResponseOffline = require('./fixtures/event-videos-response-offline');
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
let collectionHandler = null;
let SPECS = [];

test.before(() => {
	nock('https://livestreamapis.com').get(`/v2/accounts/${accountId}/events/offline/videos?older=10&newer=0`).twice().reply(200, eventVideosResponseOffline);
	nock('https://livestreamapis.com').get(`/v2/accounts/${accountId}/events/1`).reply(404);
	nock('https://livestreamapis.com').get(`/v2/accounts/${accountId}/events/offline`).thrice().reply(200, eventResponseOffline);
});

test.beforeEach(() => {
	SPECS = [];
	bus = helpers.createBus();

	bus.commandHandler({role: 'catalog', cmd: 'setItemSpec'}, spec => {
		SPECS.push(spec);
		spec.resource = spec.id.replace(/^spec/, 'res');
		return Promise.resolve(spec);
	});

	const client = provider.createClient({apiKey: 'foo', accountId: 'bar'});

	collectionHandler = provider.createCollectionHandler(bus, getChannel, client, collectionTransform);
});

test('when event not found', t => {
	const spec = {
		channel: 'abc',
		type: 'collectionSpec',
		id: 'spec-livestream-collection-1',
		event: {id: '1'}
	};

	const obs = new Promise(resolve => {
		bus.observe({level: 'error'}, payload => {
			resolve(payload);
		});
	});

	return collectionHandler({spec}).catch(err => {
		// test error condition
		t.is(err.message, `Collection not found for event id "${spec.event.id}"`);

		// test bus event
		return obs.then(event => {
			t.is(event.code, 'COLLECTION_NOT_FOUND');
			t.deepEqual(event.spec, spec);
			t.is(event.message, 'collection not found');
			return null;
		});
	}).catch(err => {
		console.error('ERROR', err.stack);
		return Promise.reject(err);
	});
});

test('when collection of videos is found', t => {
	t.plan(12);

	const spec = {
		channel: 'abc',
		type: 'collectionSpec',
		id: `spec-livestream-collection-offline`,
		event: {id: 'offline'}
	};

	return collectionHandler({spec})
		.then(res => {
			const videoId = eventVideosResponseOffline.vods.data[0].data.id;
			const eventId = eventVideosResponseOffline.vods.data[0].data.eventId;

			t.deepEqual(Object.keys(res), [
				'id',
				'title',
				'description',
				'genres',
				'tags',
				'images',
				'relationships',
				'meta'
			]);

			t.is(res.id, `res-livestream-collection-${eventResponseOffline.id}`);
			t.is(res.title, eventResponseOffline.fullName);
			t.is(res.description, eventResponseOffline.description);
			t.is(res.images.length, 2);
			t.is(res.images[0].url, eventResponseOffline.logo.url);
			t.is(res.images[1].url, eventResponseOffline.logo.smallUrl);
			t.is(res.relationships.entities.data.length, eventVideosResponseOffline.vods.data.length + 1);

			// The first video is the live stream
			t.is(res.relationships.entities.data[0].id, `res-livestream-live-video-abc-${eventId}`);
			t.is(res.relationships.entities.data[0].type, 'video');

			// Videos > index 0 are VOD
			t.is(res.relationships.entities.data[1].id, `res-livestream-video-abc-${eventId}-${videoId}`);
			t.is(res.relationships.entities.data[1].type, 'video');
			return null;
		}).catch(err => {
			console.error('ERROR', err.stack);
			return Promise.reject(err);
		});
});
