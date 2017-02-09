'use strict';

const oddcast = require('oddcast');

exports.createBus = () => {
	const bus = oddcast.bus();
	bus.requests.use({}, oddcast.inprocessTransport());
	bus.commands.use({}, oddcast.inprocessTransport());
	bus.events.use({}, oddcast.inprocessTransport());
	return bus;
};
