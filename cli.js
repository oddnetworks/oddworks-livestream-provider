/* eslint-disable no-console */
const yargs = require(`yargs`);
const Provider = require(`./index`);

const ENVIRONMENT_VARIABLES = [
	`LIVESTREAM_SECRET_KEY`,
	`LIVESTREAM_ACCOUNT_ID`
];

const REQUEST_METHODS = Object.freeze({
	getAccounts: `{}`,
	genericRequest: `{"path": "STRING"}`,
	getEvent: `{"eventId": "STRING"}`,
	getVod: `{"eventId": "STRING", "videoId": "STRING"}`,
	getLiveVideo: `{"eventId": "STRING"}`,
	getEventVideosPage: `{"eventId": "STRING", "older": NUMBER, "newer": NUMBER, "offset": NUMBER}`,
	getAllEventVideos: `{"eventId": "STRING"}`,
	getAsset: `{THE CURSOR OBJECT}`
});

function parseCommandLineArguments() {
	return yargs
		.usage(`Usage: $0 <command> [options]`)
		.command(`req`, `Make an API client request`, {
			method: {
				alias: `m`,
				type: `string`,
				demand: true,
				describe: `Use the "list" command to see available methods`
			},
			args: {
				alias: `a`,
				default: `{}`,
				describe: `Arguments object as a JSON string`
			},
			secretKey: {
				describe: `Defaults to env var LIVESTREAM_SECRET_KEY`,
				type: `string`
			},
			accountId: {
				describe: `Defaults to env var LIVESTREAM_ACCOUNT_ID`,
				type: `string`
			}
		})
		.command(`list`, `List client methods`)
		.command(`sign-url`, `Sign a URL`, {
			url: {
				alias: `u`,
				demand: true,
				describe: `The URL string to sign`
			},
			secretKey: {
				describe: `Defaults to env var LIVESTREAM_SECRET_KEY`,
				type: `string`
			},
			clientId: {
				describe: `The Livestream client ID to use`,
				demand: true,
				type: `string`
			}
		})
		.help()
		.argv;
}

function listCommand() {
	console.log(`Request methods:`);
	console.log(``);

	console.log(`\tgetAccounts --args '{}'`);

	Object.getOwnPropertyNames(Provider.prototype).forEach(key => {
		if (REQUEST_METHODS[key] && key !== `constructor`) {
			console.log(`\t${key} --args '${REQUEST_METHODS[key]}'`);
		}
	});

	console.log(`\nEnvironment Variables:\n`);
	ENVIRONMENT_VARIABLES.forEach(key => {
		console.log(`\t`, key);
	});

	return Promise.resolve(0);
}

function requestCommand(args) {
	const secretKey = args.secretKey;
	const accountId = args.accountId;
	const method = args.method;

	if (!method) {
		console.error(`An method is required (--method)`);
		return Promise.resolve(1);
	}

	if (!secretKey) {
		console.error(`An secretKey is required (--secretKey)`);
		return Promise.resolve(1);
	}

	let params;
	try {
		params = JSON.parse(args.args);
	} catch (err) {
		console.error(`--args JSON parsing error:`);
		console.error(err.message);
		return Promise.resolve(1);
	}

	if (method === `getAccounts`) {
		return Provider.getAccounts({secretKey}).then(res => {
			console.log(JSON.stringify(res, null, 2));
			return null;
		});
	}

	if (!accountId) {
		console.error(`An accountId is required (--accountId)`);
		return Promise.resolve(0);
	}

	const provider = Provider.create({
		accountId,
		secretKey
	});

	if (typeof provider[method] !== `function`) {
		console.error(`Invalid method "${method}": Provider#${method} is not a function.`);
		return Promise.resolve(0);
	}

	return provider[method](params).then(res => {
		console.log(JSON.stringify(res, null, 2));
		return 0;
	});
}

function signUrlCommand(args) {
	const url = args.url;
	const secretKey = args.secretKey;
	const clientId = args.clientId;

	console.log(``);
	console.log(`URL:`);
	console.log(``);
	console.log(Provider.signUrl({secretKey, clientId}, url));
	return Promise.resolve(0);
}

exports.main = function () {
	const argv = parseCommandLineArguments();
	const command = argv._[0];

	switch (command) {
		case `list`:
			return listCommand();
		case `req`:
			return requestCommand({
				accountId: argv.accountId || process.env.LIVESTREAM_ACCOUNT_ID,
				secretKey: argv.secretKey || process.env.LIVESTREAM_SECRET_KEY,
				method: argv.method,
				args: argv.args
			});
		case `sign-url`:
			return signUrlCommand({
				url: argv.url,
				secretKey: argv.secretKey || process.env.LIVESTREAM_SECRET_KEY,
				clientId: argv.clientId
			});
		default:
			console.error(`A command argument is required.`);
			console.error(`Use the --help flag to print out help.`);
			return Promise.resolve(0);
	}
};

