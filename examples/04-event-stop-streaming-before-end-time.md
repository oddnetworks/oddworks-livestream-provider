# Stop Streaming Before The Start or End Time

Notice that createdAt, startTime, endTime have all remained constant, but isLive is now false.

The Livestream player on the Livestream dashboard switched back to the countdown timer.

```json
{
  "id": 7958375,
  "logo": {
    "url": "http://img.new.livestream.com/events/0000000000796f67/305f7d56-f200-4317-b4c1-1a5a47608c2d.jpg",
    "thumbnailUrl": "http://img.new.livestream.com/events/0000000000796f67/305f7d56-f200-4317-b4c1-1a5a47608c2d_50x28.jpg",
    "smallUrl": "http://img.new.livestream.com/events/0000000000796f67/305f7d56-f200-4317-b4c1-1a5a47608c2d_170x96.jpg"
  },
  "description": null,
  "draft": false,
  "likes": {
    "total": 0
  },
  "fullName": "Live Event Workflow 1",
  "shortName": null,
  "ownerAccountId": 21224744,
  "viewerCount": 2,
  "createdAt": "2017-11-30T10:40:09.620Z",
  "startTime": "2017-11-30T13:00:00.000Z",
  "endTime": "2017-11-30T14:00:00.000Z",
  "tags": [],
  "isPublic": true,
  "isSearchable": true,
  "viewerCountVisible": true,
  "postCommentsEnabled": true,
  "liveChatEnabled": true,
  "isEmbeddable": true,
  "isPasswordProtected": false,
  "isWhiteLabeled": false,
  "embedRestriction": "off",
  "embedRestrictionWhitelist": [
    "*.livestream.com/*"
  ],
  "embedRestrictionBlacklist": null,
  "isLive": false
}
```

### Get All Event Videos
After stopping the stream, we create a post out of it:

```json
[
  {
    "id": 166606522,
    "draft": false,
    "views": 2,
    "likes": {
      "total": 0
    },
    "comments": {
      "total": 0
    },
    "caption": "Post 1",
    "description": "Very dark recording",
    "duration": 280934,
    "eventId": 7958375,
    "createdAt": "2017-11-30T11:31:37.822Z",
    "publishAt": "2017-11-30T11:36:59.698Z",
    "tags": [],
    "thumbnailUrl": "http://img.new.livestream.com/events/0000000000796f67/7c6a81e2-8d9b-4400-af59-63ec09b58587_60.jpg",
    "thumbnailUrlSmall": "http://img.new.livestream.com/events/0000000000796f67/7c6a81e2-8d9b-4400-af59-63ec09b58587_60_150x84.jpg",
    "m3u8": "https://livestreamapis.com/v3/accounts/21627744/events/7958375/videos/166606522.m3u8"
  }
]
```
