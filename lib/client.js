'use strict';

const Promise = require('bluebird');
const Boom = require('boom');
const request = require('request');
const debug = require('debug')('oddworks:provider:livestream:client');

function createQueue(requestInterval) {
	const queue = [];
	let requestInProgress = false;

	function nextRequest() {
		if (requestInProgress) {
			return null;
		}

		const req = queue.pop();
		if (!req) {
			return null;
		}

		requestInProgress = true;

		return req().then(res => {
			onComplete();
			return res;
		}).catch(err => {
			onComplete();
			return Promise.reject(err);
		});
	}

	function onComplete() {
		return Promise.delay(requestInterval).then(() => {
			requestInProgress = false;
			nextRequest();
			return null;
		});
	}

	function queueRequest(req) {
		return new Promise((resolve, reject) => {
			queue.push(() => {
				return req().then(resolve).catch(reject);
			});

			nextRequest();
		});
	}

	return queueRequest;
}

class Client {

	// spec.bus
	// spec.apiKey
	// spec.accountId
	// spec.clientId
	// spec.requestInterval
	constructor(spec) {
		this.bus = spec.bus || null;

		this.apiKey = spec.apiKey;
		this.accountId = spec.accountId;
		this.clientId = spec.clientId;

		this.getPastEvents = this.getPastEvents.bind(this);
		this.getUpcomingEvents = this.getUpcomingEvents.bind(this);
		this.getEvent = this.getEvent.bind(this);
		this.getEventVideos = this.getEventVideos.bind(this);

		this.queue = createQueue(spec.requestInterval || 200);
	}

	sendBusEvent(pattern, event) {
		if (this.bus) {
			this.bus.broadcast(pattern, event);
		}
	}

	getBasicAuthorization(apiKey) {
		const clientAuth = new Buffer(`${apiKey}:`);
		return `Basic ${clientAuth.toString('base64')}`;
	}

	// args.page
	// args.max_items
	getPastEvents(args) {
		args.path = `/past_events`;

		debug(`getPastEvents path: ${args.path}`);

		return this.makeRequest(args);
	}

	// args.page
	// args.max_items
	getUpcomingEvents(args) {
		args.path = `/upcoming_events`;

		debug(`getUpcomingEvents path: ${args.path}`);

		return this.makeRequest(args);
	}

	// args.id *required
	getEvent(args) {
		args = args || {};
		const id = args.id;

		if (!id) {
			throw new Error('An id is required to getEvent()');
		}

		args.path = `/events/${id}`;

		debug(`getEvent id: #{id} path: ${args.path}`);

		return this.makeRequest(args);
	}

	// args.id *required
	getEventVideos(args) {
		args = args || {};
		const id = args.id;

		if (!id) {
			throw new Error('An id is required to getEventVideos()');
		}

		args.path = `/events/${id}/videos`;

		debug(`getEventVideos id: #{id} path: ${args.path}`);

		return this.makeRequest(args);
	}

	// args.path *required
	// args.apiKey *required
	// args.accountId *required
	makeRequest(args) {
		const method = 'GET';
		const path = args.path;

		const baseUrl = args.baseUrl || Client.API_BASE_URL;

		const apiKey = args.apiKey || this.apiKey;
		const accountId = args.accountId || this.accountId;
		const clientId = args.clientId || this.clientId;

		if (!apiKey || typeof apiKey !== 'string') {
			throw new Error('An apiKey is required to makeRequest()');
		}
		if (!accountId || typeof accountId !== 'string') {
			throw new Error('An accountId is required to makeRequest()');
		}
		if (!clientId || typeof clientId !== 'string') {
			throw new Error('An clientId is required to makeRequest()');
		}
		if (!path || typeof path !== 'string') {
			throw new Error('A path is required to makeRequest()');
		}

		const headers = {
			authorization: this.getBasicAuthorization(apiKey)
		};
		const qs = Object.assign({}, args.query);
		const url = `${baseUrl}/accounts/${accountId}${path}`;

		debug(`makeRequest method: ${method} url: ${url} qs: ${JSON.stringify(qs)}`);

		function queuedRequest() {
			return Client.request({method, url, qs, headers});
		}

		return this.queue(queuedRequest);
	}

	static get API_BASE_URL() {
		return 'https://livestreamapis.com/v2';
	}

	static get CONTENT_TYPE_MATCHER() {
		return /^application\/json/;
	}

	static request(params) {
		return new Promise((resolve, reject) => {
			request(params, (err, res, body) => {
				if (err) {
					debug(`Client.request error: ${err}`);
					return reject(err);
				}

				if (res.statusCode === 404) {
					debug(`Client.request status: 404`);
					return resolve(null);
				}

				const isJson = Client.CONTENT_TYPE_MATCHER.test(res.headers['content-type']);

				if (isJson && typeof body === 'string') {
					try {
						body = JSON.parse(body);
					} catch (err) {
						debug(`Client.request error: JSON parsing error: ${err.message}`);
						return reject(new Error(
							`client JSON parsing error: ${err.message}`
						));
					}
				} else if (isJson) {
					debug(`Client.request error: received an empty json body`);
					return reject(new Error(
						`client received an empty json body`
					));
				} else {
					debug(`Client.request error: expects content-type to be application/*json`);
					return reject(new Error(
						`client expects content-type to be application/*json`
					));
				}

				if (res.statusCode !== 200) {
					debug(`Client.request status: ${res.statusCode} error: ${body.error} developer_message: ${body.developer_message}`);
					return reject(Boom.create(res.statusCode, res.statusMessage, body));
				}

				return resolve(body);
			});
		});
	}
}

module.exports = Client;
