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
let createLiveVideoHandlerSpy;
let createCollectionHandlerSpy;
let queryHandlerSpy;

function liveVideoHandler() {}
function videoHandler() {}
function collectionHandler() {}
function seriesHandler() {}
function seasonHandler() {}

test.before(() => {
	bus = helpers.createBus();

	createVideoHandlerSpy = sinon.stub(provider, 'createVideoHandler').returns(videoHandler);
	createLiveVideoHandlerSpy = sinon.stub(provider, 'createLiveVideoHandler').returns(liveVideoHandler);
	createCollectionHandlerSpy = sinon.stub(provider, 'createCollectionHandler').returns(collectionHandler);
	sinon.stub(provider, 'createSeriesHandler').returns(seriesHandler);
	sinon.stub(provider, 'createSeasonHandler').returns(seasonHandler);
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

test('calls createLiveVideoHandler', t => {
	t.plan(2);

	t.true(createLiveVideoHandlerSpy.calledOnce);
	t.true(createLiveVideoHandlerSpy.calledWith(bus, sinon.match.func, result.client, defaultVideoTransform));
});

test('calls createCollectionHandler', t => {
	t.plan(2);

	t.true(createCollectionHandlerSpy.calledOnce);
	t.true(createCollectionHandlerSpy.calledWith(bus, sinon.match.func, result.client, defaultCollectionTransform));
});

test('calls bus.queryHandler', t => {
	t.plan(6);

	t.is(queryHandlerSpy.callCount, 5);
	t.deepEqual(queryHandlerSpy.firstCall.args, [
		{role: 'provider', cmd: 'get', source: 'livestream-collection'},
		collectionHandler
	]);
	t.deepEqual(queryHandlerSpy.secondCall.args, [
		{role: 'provider', cmd: 'get', source: 'odd-livestream-series'},
		seriesHandler
	]);
	t.deepEqual(queryHandlerSpy.thirdCall.args, [
		{role: 'provider', cmd: 'get', source: 'odd-livestream-season'},
		seasonHandler
	]);
	t.deepEqual(queryHandlerSpy.args[3], [
		{role: 'provider', cmd: 'get', source: 'livestream-video'},
		videoHandler
	]);
	t.deepEqual(queryHandlerSpy.args[4], [
		{role: 'provider', cmd: 'get', source: 'livestream-live-video'},
		liveVideoHandler
	]);
});
