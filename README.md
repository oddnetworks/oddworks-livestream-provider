# Oddworks Livestream Provider

A Livestream provider plugin for the Oddworks content server.

[![Build Status](https://travis-ci.org/oddnetworks/oddworks-livestream-provider.svg?branch=master)](https://travis-ci.org/oddnetworks/oddworks-livestream-provider)

Installation
------------
Install the npm package as a Node.js library:

    npm install --save oddworks-livestream-provider

For full Livestream API documentation see [https://livestream.com/developers/docs/api//](https://livestream.com/developers/docs/api//).

Oddworks Server Integration
---------------------------
The Oddworks Livestream provider is designed to be integrated with an Oddworks server [catalog](https://github.com/oddnetworks/oddworks/tree/master/lib/services/catalog), specifically as a [provider](https://github.com/oddnetworks/oddworks/tree/master/lib/services/catalog#providers). To initialize the plugin in your server:

```JavaScript
const livestreamProvider = require('oddworks-livestream-provider');

// See https://github.com/oddnetworks/oddworks/tree/master/lib/services/catalog#patterns
// for more information regarding an Oddcast Bus.
const bus = createMyOddcastBus();

const options = {
    bus: bus,
    apiKey: process.env.LIVESTREAM_API_KEY,
    clientId: process.env.LIVESTREAM_CLIENT_ID
};

livestreamProvider.initialize(options).then(provider => {
    console.log('Initialized provider "%s"', provider.name);
}).catch(err => {
    console.error(err.stack || err.message || err);
});
```

The initialization process will attach Oddcast listeners for the following queries:

- `bus.query({role: 'provider', cmd: 'get', source: 'livestream-video'})`
- `bus.query({role: 'provider', cmd: 'get', source: 'livestream-collection'})`

To use them you send Oddcast commands to save a specification object:

```JavaScript
// To create a collection based on a Livestream title:
bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, {
    channel: 'abc',
    type: 'collectionSpec',
    source: 'livestream-collection',
    collection: {id: '50931'}
});

// To create a video based on a Livestream title:
bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, {
    channel: 'abc',
    type: 'videoSpec',
    source: 'livestream-video',
    video: {id: '50955'}
});
```

#### Transform Functions
This library provides a default transform function for collections and assets. It is fine to use the default, but you can provide your own like this:

```JavaScript
const livestreamProvider = require('oddworks-livestream-provider');
const bus = createMyOddcastBus();

const options = {
    bus: bus,
    collectionTransform: myCollectionTransform,
    videoTransform: myVideoTransform
};

livestreamProvider.initialize(options).then(provider => {
    console.log('Initialized provider "%s"', provider.name);
}).catch(err => {
    console.error(err.stack || err.message || err);
});
```

Your transform functions `myCollectionTransform` and `myVideoTransform` will be called when the `livestream-collection` and `livestream-video` have respectively received a response from the Livestream API.

The `myCollectionTransform` and `myVideoTransform` functions will each be called with 2 arguments: The spec object and the Livestream API response object for an album or video, respectively.

See `lib/default-collection-transform` and `lib/default-video-transform` for more info.

Livestream API Client
-----------------
You can create a stand-alone API client outside of the Oddworks provider:

```JavaScript
const livestreamProvider = require('oddworks-livestream-provider');

const client = livestreamProvider.createClient({
    bus: bus,
    apiKey: process.env.LIVESTREAM_API_KEY,
    clientId: process.env.LIVESTREAM_CLIENT_ID
});
```

### Client Methods
All methods return a Promise.

- `client.lookupGenre({genreId})`
- `client.lookupTheme({themeId})`
- `client.getTitle({titleId})`
- `client.getTitleGenres({titleId})`
- `client.getTitleReleases({titleId})`
- `client.getTitleThemes({titleId})`
- `client.getTitleVideos({titleId})`
- `client.getVideoStreams({videoId})`

Command Line Interface
----------------------
You can interact with the Livestream client using the CLI tool. To get started, run:

    bin/cli --help

To authenticate the API you'll need to export the following environment variables:

- `LIVESTREAM_API_KEY` The Livestream API key
- `LIVESTREAM_CLIENT_ID` The Livestream Partner key

To get help with commands:

    bin/cli list --help
    bin/cli req --help

License
-------
Apache 2.0 © [Odd Networks](http://oddnetworks.com)
