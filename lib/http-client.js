const http = require(`https`);

const DEFAULT_TIMEOUT = 10000;

exports.makeRequest = args => {
	const {protocol, hostname, method, path, headers} = args;

	const params = {
		protocol: protocol || `https:`,
		hostname,
		method: method || `GET`,
		path,
		headers,
		timeout: DEFAULT_TIMEOUT
	};

	return new Promise((resolve, reject) => {
		const req = http.request(params, res => {
			res.once(`error`, err => reject(err));

			res.setEncoding(`utf8`);

			let body = ``;
			res.on(`data`, chunk => {
				body += chunk;
			});

			res.on(`end`, () => {
				resolve({
					statusCode: res.statusCode,
					headers: res.headers,
					body
				});
			});
		});

		req.once(`error`, err => reject(err));

		req.end();
	});
};

