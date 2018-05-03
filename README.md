# Oddworks Livestream Provider

A Livestream provider plugin for the Oddworks content server.

[![pipeline status](https://gitlab.com/oddnetworks/oddworks/livestream-provider/badges/master/pipeline.svg)](https://gitlab.com/oddnetworks/oddworks/livestream-provider/commits/master)

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

- `client.getPastEvents()`
- `client.getUpcomingEvents()`
- `client.getPriveateEvents()`
- `client.getEvent({id})`
- `client.getEventVideos({id})`

Command Line Interface
----------------------
You can interact with the Livestream client using the CLI tool. To get started, run:

    bin/cli --help

To authenticate the API you'll need to export the following environment variables:

- `LIVESTREAM_API_KEY` The Livestream API key
- `LIVESTREAM_ACCOUNT_ID` The Livestream Account ID
- `LIVESTREAM_CLIENT_ID` The Livestream Client ID

To get help with commands:

    bin/cli list --help
    bin/cli req --help

The Livestream Event Sequence
-----------------------------
Livestream has a particular way of broadcasting a live event. It's worth understanding how this provider normalizes that sequence to Collections and Video objects.

When an event is drafted, but not yet published, it looks like this:

```json
{
  "id": 7268989,
  "logo": {
    "url": "http://img.new.livestream.com/events/00000000006eea7d/ebe85599-6889-42b7-96dd-9a4de797c1d5.jpg",
    "thumbnailUrl": "http://img.new.livestream.com/events/00000000006eea7d/ebe85599-6889-42b7-96dd-9a4de797c1d5_50x28.jpg",
    "smallUrl": "http://img.new.livestream.com/events/00000000006eea7d/ebe85599-6889-42b7-96dd-9a4de797c1d5_170x95.jpg"
  },
  "description": null,
  "draft": true,
  "likes": {
    "total": 0
  },
  "fullName": "Test Live Event",
  "shortName": null,
  "ownerAccountId": 21627744,
  "viewerCount": 1,
  "createdAt": "2017-04-14T11:50:09.543Z",
  "startTime": "2017-04-14T11:49:00.000Z",
  "endTime": "2017-04-14T12:49:00.000Z",
  "tags": [],
  "isLive": false
}
```

After publishing, `"draft": true` is flipped to `"draft": false`. As soon as the event is being streamed to, it is considered published and "draft" is set to false and `"isLive": true`. Before going live the videos from the event will look like this:

Calling `client.getEventVideos()`:

```
{
  "vods": {
    "total": 0,
    "data": []
  },
  "live": null
}
```

After going live, the videos from the event will look like this:

Calling `client.getEventVideos()`:

```
{
  "vods": {
    "total": 0,
    "data": []
  },
  "live": {
    "id": 154135441,
    "draft": true,
    "views": 0,
    "likes": {
      "total": 0
    },
    "comments": {
      "total": 0
    },
    "caption": "Video on Odd's iPhone event",
    "description": null,
    "duration": 0,
    "eventId": 7269024,
    "createdAt": "2017-04-14T12:03:41.627Z",
    "publishAt": null,
    "tags": [],
    "thumbnailUrl": null,
    "thumbnailUrlSmall": null,
    "m3u8": "https://livestreamapis.com/v2/accounts/21627744/events/7269024/master.m3u8"
  }
}
```

When an event is finished, the Livestream user will usually "post" the video, or post additional videos of the event as Livestream "Posts".

Calling `client.getEventVideos()`:

```json
{
  "vods": {
    "total": 1,
    "data": [
      {
        "type": "video",
        "data": {
          "id": 154135441,
          "draft": false,
          "views": 3,
          "likes": {
            "total": 0
          },
          "comments": {
            "total": 0
          },
          "caption": "A test live video to VOD",
          "description": null,
          "duration": 402841,
          "eventId": 7269024,
          "createdAt": "2017-04-14T12:03:41.627Z",
          "publishAt": "2017-04-14T12:10:56.269Z",
          "tags": [],
          "thumbnailUrl": "http://img.new.livestream.com/events/00000000006eeaa0/9f0d3438-7cac-4fb0-a7e2-23c89fc3fa7a_120.jpg",
          "thumbnailUrlSmall": "http://img.new.livestream.com/events/00000000006eeaa0/9f0d3438-7cac-4fb0-a7e2-23c89fc3fa7a_120_150x84.jpg",
          "m3u8": "https://livestreamapis.com/v2/accounts/21627744/events/7269024/videos/154135441.m3u8"
        }
      }
    ]
  },
  "live": null
}
```

This Oddworks provider treats these posts as Video on Demand objects. In fact, they are listed in that Livestream API response as "vods", indicating this intention.

### Translating the Livestream Pattern to Oddworks

A typical oddworks Video object looks like this from the API:

```json
{
  "data": {
    "id": "res-livestream-video-6766058-144918727",
    "type": "video",
    "attributes": {
      "title": "Tuesday Night's Special",
      "description": "Lorem ipsum",
      "images": [
        {
          "url": "http://img.new.livestream.com/foo.jpg",
          "width": 960,
          "height": 540,
          "label": "thumbnail"
        },
        {
          "url": "http://img.new.livestream.com/bar.jpg",
          "width": 960,
          "height": 540,
          "label": "thumbnail-small"
        }
      ],
      "sources": [
        {
          "url": "https://livestreamapis.com/v2/accounts/13909691/events/6766058/videos/144918727.m3u8?client_id=foo&timestamp=bar&token=baz",
          "container": "hls",
          "mimeType": "application/x-mpegURL",
          "sourceType": "vod",
          "broadcasting": false,
          "height": null,
          "width": null,
          "maxBitrate": 0,
          "label": "hls"
        }
      ],
      "duration": 1735711,
      "position": 0,
      "complete": false,
      "genres": [],
      "cast": [],
      "releaseDate": "2016-12-20T20:59:19.784Z"
    },
    "relationships": {}
  }
}
```

When a Livestream event appears on the API, but is not yet published (draft: true), this provider will ignore it. When it is published or goes live, a new Oddworks Collection and Video object will be created for it.

If the event is published, but is not yet live, the Oddworks Video object representing the event will have a single stream source with "sourceType" set to `"linear"` and "broadcasting" set to `false`.

```json
      "sources": [
        {
          "url": null,
          "sourceType": "linear",
          "broadcasting": false
          "label": "hls"
        }
      ],
```

When the event is live and has a stream, there will be at least one source object with "sourceType" set to `"linear"` and "broadcasting" set to `true` like this:

```json
      "sources": [
        {
          "url": "https://livestreamapis.com/v2/accounts/13909691/events/6766058/videos/144918727.m3u8?client_id=foo&timestamp=bar&token=baz",
          "container": "hls",
          "mimeType": "application/x-mpegURL",
          "sourceType": "linear",
          "broadcasting": true,
          "height": null,
          "width": null,
          "maxBitrate": 0,
          "label": "hls"
        }
      ],
```

When the event is over "broadcasting" will be set to `false` again.

Handling Livestream Video on Demand
-----------------------------------
If the "vods" Array within a Livestream event contains videos with the tags "s-01" or "e-01" (fitting the pattern: "s-n", "e-n"), then this provider will split the event into a collection (which holds all event posts as videos), and tree of nested collections containing the appropriate season and episodes collections based on the tagging scheme.

License
-------
Apache 2.0 © [Odd Networks](http://oddnetworks.com)
