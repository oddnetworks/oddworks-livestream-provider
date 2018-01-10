const QS = require(`querystring`);
const {delay} = require(`./library`);
const httpClient = require(`./http-client`);

// The API will allow about 600 requests per minute.
//   See: https://livestream.com/developers/docs/api/?ref=nav#rate-limits
const DEFAULT_REQUEST_INTERVAL = 120;
const DEFAULT_HOSTNAME = `livestreamapis.com`;

// A queue is necessary to stay under the rate limiting threshholds.
//
// This queue works by creating pushing Promise wrappers (closure functions) onto an
// Array and poping them off in order for execution. A preconfigured request interval
// determines how often this wrapped executables are popped off and executed.
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
		return req();
	}

	function onComplete() {
		return delay(requestInterval).then(() => { // eslint-disable-line no-use-extend-native/no-use-extend-native
			requestInProgress = false;
			nextRequest();
			return null;
		});
	}

	function queueRequest(req) {
		return new Promise((resolve, reject) => {
			// Create a closure function around the request and push it onto the queue.
			queue.push(() => {
				return req().then(res => {
					onComplete();
					resolve(res);
					return null;
				}).catch(err => {
					onComplete();
					reject(err);
					return null;
				});
			});

			nextRequest();
		});
	}

	return queueRequest;
}

exports.createClient = function (options) {
	options = options || {};
	const {secretKey} = options;
	const hostname = options.hostname || DEFAULT_HOSTNAME;
	const requestInterval = Number.isInteger(options.requestInterval) ? options.requestInterval : DEFAULT_REQUEST_INTERVAL;

	if (typeof secretKey !== `string` || secretKey.length < 1) {
		throw new Error(`Invalid options.secretKey passed to createClient().`);
	}

	const queue = createQueue(requestInterval);

	function makeRequest(path, params) {
		const requestParams = {
			hostname,
			path: `/v3${path}`,
			headers: {
				// API Authentication:
				//   https://livestream.com/developers/docs/api/?ref=nav#api-keys
				Authorization: `Basic ${Buffer.from(secretKey).toString(`base64`)}`,
				Accept: `*/*`
			},
			auth: `${secretKey}:`
		};

		// Create and append the query String if query params are passed in.
		if (params) {
			requestParams.path = `${requestParams.path}?${QS.stringify(params)}`;
		}

		// Queue the request as an anonymous encapsulated function.
		return queue(() => {
			return httpClient.makeRequest(requestParams).then(res => {
				let body;
				try {
					body = JSON.parse(res.body);
				} catch (err) {
					const e = new Error(
						`Unexpected non JSON or invalid JSON Livestream API response. Check stderr and error.responseBody for details.`
					);
					e.responseBody = res.body;
					console.error( // eslint-disable-line no-console
							`Unexpected Livestream API response for "https://${hostname}${requestParams.path}"
  status code: ${res.statusCode}
  body:
${res.body}
`
					);
					return Promise.reject(e);
				}

				let err;
				switch (res.statusCode) {
					case 200:
						return body;
					// We get a statusCode: 403 when the API rate limit is hit.
					case 403:
						err = new Error(
							`Rate limiting error in Livestream API. Check error.responseBody for details.`
						);
						err.code = 403;
						err.responseBody = body;
						return Promise.reject(err);
					default:
						err = new Error(
							`Unexpected status code ${res.statusCode} in Livestream API response for "https://${hostname}${requestParams.path}". Check error.responseBody for details.`
						);
						err.code = res.statusCode;
						err.responseBody = body;
						return Promise.reject(err);
				}
			});
		});
	}

	return makeRequest;
};

// When rate limit is hit:
//
// statusCode: 403
// headers: {
//   "content-type": "application/json",
//   "x-cloud-trace-context": "20be63d46002e893f0eaa09dae133dee",
//   "date": "Tue, 14 Nov 2017 16:39:14 GMT",
//   "server": "Google Frontend",
//   "content-length": "77",
//   "connection": "close"
// }
// {
//   "code": 403,
//   "message": "account [ACCOUNT_NUMBER] has exceeded read per second limit."
// }

// Invalid API key:
//
// statusCode: 401
// headers: {
//   "content-type": "application/json",
//   "x-cloud-trace-context": "6cbf58f995c0333366b9af71a054248d",
//   "date": "Tue, 14 Nov 2017 16:42:46 GMT",
//   "server": "Google Frontend",
//   "content-length": "102",
//   "connection": "close"
// }
// {
//   "code": 401,
//   "message": "Your API request is passing invalid \"APISECRETKEY\" in Authorization Header."
// }

// Missing Authorization header:
//
// statusCode: 401
// headers: {
//   "content-type": "application/json",
//   "x-cloud-trace-context": "5c7f1188450644b019e66d41186270f8",
//   "date": "Tue, 14 Nov 2017 16:43:46 GMT",
//   "server": "Google Frontend",
//   "content-length": "105",
//   "connection": "close"
// }
// {
//   "code": 401,
//   "message": "Your API request is missing Authentication, please follow the API documentation."
// }

