'use strict';

const Promise = require('bluebird');
const yargs = require('yargs');
const Client = require('./lib/client');

const REQUEST_METHODS = Object.create(null);
REQUEST_METHODS.makeRequest = '{"path": "STRING"}';
REQUEST_METHODS.getPastEvents = '{"id": "STRING"}';
REQUEST_METHODS.getUpcomingEvents = '{"id": "STRING"}';
REQUEST_METHODS.getEvent = '{"id": "STRING"}';
REQUEST_METHODS.getEventVideos = '{"id": "STRING"}';

const listCommand = () => {
	console.log('Request methods:');
	console.log('');

	Object.getOwnPropertyNames(Client.prototype).forEach(key => {
		if (REQUEST_METHODS[key]) {
			console.log(`\t${key} --args ${REQUEST_METHODS[key]}`);
		}
	});

	return Promise.resolve(null);
};

const requestCommand = args => {
	const apiKey = args.apiKey;
	const accountId = args.accountId;
	const method = args.method;

	if (!apiKey) {
		console.error('An apiKey is required (--apiKey)');
		return Promise.resolve(null);
	}

	if (!accountId) {
		console.error('An accountId is required (--accountId)');
		return Promise.resolve(null);
	}

	let params;
	try {
		params = JSON.parse(args.args);
	} catch (err) {
		console.error('--args JSON parsing error:');
		console.error(err.message);
		return Promise.resolve(null);
	}

	const client = new Client({apiKey, accountId});

	return client[method](params).then(res => {
		console.log(JSON.stringify(res, null, 2));
		return null;
	});
};

exports.main = () => {
	const args = yargs
					.usage('Usage: $0 <command> [options]')
					.command('req', 'Make a client request', {
						method: {
							alias: 'm',
							default: 'makeRequest',
							describe: 'Use the "list" command to see available methods'
						},
						args: {
							alias: 'a',
							default: '{}',
							describe: 'Arguments object as a JSON string'
						},
						apiKey: {
							describe: 'Defaults to env var LIVESTREAM_API_KEY'
						},
						accountId: {
							describe: 'Defaults to env var LIVESTREAM_ACCOUNT_ID'
						}
					})
					.command('list', 'List client methods')
					.help();

	const argv = args.argv;
	const command = argv._[0];

	switch (command) {
		case 'list':
			return listCommand();
		case 'req':
			return requestCommand({
				apiKey: argv.apiKey || process.env.LIVESTREAM_API_KEY,
				accountId: argv.accountId || process.env.LIVESTREAM_CLIENT_ID,
				method: argv.method,
				args: argv.args
			});
		default:
			console.error('A command argument is required.');
			console.error('Use the --help flag to print out help.');
			return Promise.resolve(null);
	}
};
