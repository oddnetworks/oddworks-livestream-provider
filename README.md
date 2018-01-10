Oddworks Livestream Provider
============================

A Livestream provider plugin for the Oddworks content server.

Installation
------------
Install the npm package as a Node.js library:

    npm install --save oddworks-livestream-provider

Command Line
------------
If you've installed oddworks-livestream-provider in a project, you'll find the command line tool at:

```
$ ./node_modules/.bin/livestream
```

If you're using the command line tool from this repository you'll find it at:

```
$ ./bin/cli
```

Either way, to get started simply run one of the commands above with the `--help` flag. __Example:__

```
$ ./bin/cli --help
Usage: cli <command> [options]

Commands:
  cli req       Make an API client request
  cli list      List client methods
  cli sign-url  Sign a URL

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
```

There are really only 2 main functions of the command line tool:

1. Make API requests using `req`.
2. Sign stream URLs with `sign-url`.

### Making Requests with the Command Line Tool
Get started by getting help:

```
$ bin/cli req --help
cli req

Make an API client request

Options:
  --version     Show version number                                    [boolean]
  --help        Show help                                              [boolean]
  --method, -m  Use the "list" command to see available methods
                                                             [string] [required]
  --args, -a    Arguments object as a JSON string                [default: "{}"]
  --secretKey   Defaults to env var LIVESTREAM_SECRET_KEY               [string]
  --accountId   Defaults to env var LIVESTREAM_ACCOUNT_ID               [string]
```

List the API request commands you can make:

```
$ bin/cli list
Request methods:

  getAccounts --args '{}'
  genericRequest --args '{"path": "STRING", "query": {QUERY OBJECT}}'
  getEventsByType --args '{"eventType": "past_events | upcoming_events | draft_events | private_events"}'
  getEvent --args '{"eventId": "STRING"}'
  getVideo --args '{"eventId": "STRING", "videoId": "STRING"}'
  getEventVideosPage --args '{"eventId": "STRING", "older": NUMBER, "newer": NUMBER, "offset": NUMBER}'
  getAllEventVideos --args '{"eventId": "STRING"}'
  getAsset --args '{"type": "event | video", "channel": "CHANNEL_ID", "args": {}}'

Environment Variables:

     LIVESTREAM_SECRET_KEY
     LIVESTREAM_ACCOUNT_ID
```

First you'll need to get an account ID before you can begin making useful requests:

```
$ export LIVESTREAM_SECRET_KEY=foobarbazmylivestreamsecretkey
$
$ bin/cli req --method getAccounts --args '{}'
[
  {
    "id": 21827644,
    "description": null,
    "email": "paul@oddnetworks.com",
    "timezone": "America/New_York",
    "picture": null,
    "followers": {
      "total": 0
    },
    "following": {
      "total": 0
    },
    "fullName": "Odd Networks",
    "shortName": "oddnetworks",
    "createdAt": "2015-09-22T22:38:18.832Z",
    "draftEvents": {
      "total": 1
    },
    "privateEvents": {
      "total": 0
    },
    "upcomingEvents": {
      "total": 4
    },
    "pastEvents": {
      "total": 12
    }
  }
]
```

Grab the account number as the `"id"` and set it as an evironment variable:

```
$ export LIVESTREAM_ACCOUNT_ID=21827644
```

Now you're ready to make more request commands.

License
-------
Apache 2.0 © [Odd Networks](http://oddnetworks.com)
