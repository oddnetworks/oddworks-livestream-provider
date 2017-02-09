'use strict';

const test = require('ava');
const sinon = require('sinon');

const provider = require('../');
const defaultVideoTransform = require('../lib/default-video-transform');
const defaultCollectionTransform = require('../lib/default-collection-transform');
const helpers = require('./helpers');

let bus;
let result = null;

let createVideoHandlerSpy;
let createCollectionHandlerSpy;
let queryHandlerSpy;

function videoHandler() {}
function albumHandler() {}

test.before(() => {
	bus = helpers.createBus();

	createVideoHandlerSpy = sinon.stub(provider, 'createVideoHandler').returns(videoHandler);
	createCollectionHandlerSpy = sinon.stub(provider, 'createCollectionHandler').returns(albumHandler);
	queryHandlerSpy = sinon.spy(bus, 'queryHandler');

	const options = {
		bus,
		apiKey: 'foo',
		accountId: 'bar'
	};

	return provider.initialize(options).then(res => {
		result = res;
		return null;
	});
});

test('creates client', t => {
	t.plan(3);

	t.truthy(result.client);
	t.is(result.client.apiKey, 'foo');
	t.is(result.client.accountId, 'bar');
});

test('calls createVideoHandler', t => {
	t.plan(2);

	t.true(createVideoHandlerSpy.calledOnce);
	t.true(createVideoHandlerSpy.calledWith(bus, sinon.match.func, result.client, defaultVideoTransform));
});

test('calls createCollectionHandler', t => {
	t.plan(2);

	t.true(createCollectionHandlerSpy.calledOnce);
	t.true(createCollectionHandlerSpy.calledWith(bus, sinon.match.func, result.client, defaultCollectionTransform));
});

test('calls bus.queryHandler', t => {
	t.plan(3);

	t.true(queryHandlerSpy.calledTwice);
	t.deepEqual(queryHandlerSpy.firstCall.args, [
		{role: 'provider', cmd: 'get', source: 'livestream-collection'},
		albumHandler
	]);
	t.deepEqual(queryHandlerSpy.secondCall.args, [
		{role: 'provider', cmd: 'get', source: 'livestream-video'},
		videoHandler
	]);
});
