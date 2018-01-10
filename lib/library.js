exports.delay = function (ms) {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
};

exports.deepFreeze = function deepFreeze(obj) {
	Object.freeze(obj);
	Object.getOwnPropertyNames(obj).forEach(key => {
		if (typeof obj === `function` &&
			(key === `arguments` || key === `caller` || key === `callee` || key === `prototype`)) {
			return;
		}

		const prop = obj[key];
		if (prop !== null && (typeof prop === `object` || typeof prop === `function`)) {
			deepFreeze(prop);
		}
	});

	return obj;
};

// Convert this:
//   "http://img.new.livestream.com/events/00625bc1/ae58-27e0a8312512_120.png"
// or this:
//   "https://img.new.livestream.com/events/00625bc1/ae58-27e0a8312512_120_800x450.png"
//
// To this:
// ```
// [
// 	{
// 		label: `original`,
// 		url: `https://img.new.livestream.com/events/00625bc1/ae58-27e0a8312512_120.png`
// 	},
// 	{
// 		label: `small`,
// 		width: 320,
// 		height: 180,
// 		url: `https://img.new.livestream.com/events/00625bc1/ae58-27e0a8312512_120_320x180.png`
// 	},
// 	{
// 		label: `thumbnail`,
// 		width: 320,
// 		height: 180,
// 		url: `https://img.new.livestream.com/events/00625bc1/ae58-27e0a8312512_120_640x360.png`
// 	}
// ]
// ```

function composeImages(urlString) {
	const url = urlString.replace(/^http:/, `https:`).replace(/_[\d]+x[\d]+./, `.`);

	// Make a copy of the Array of strings so we can safely mutate it.
	const parts = url.split(`.`);
	const i = parts.length - 2;
	const thumbnailParts = parts.slice();
	thumbnailParts[i] = `${thumbnailParts[i]}_640x360`;
	const smallParts = parts.slice();
	smallParts[i] = `${smallParts[i]}_320x180`;

	return [
		{
			label: `original`,
			url
		},
		{
			label: `small`,
			url: smallParts.join(`.`),
			width: 320,
			height: 180
		},
		{
			label: `thumbnail`,
			url: thumbnailParts.join(`.`),
			width: 640,
			height: 360
		}
	];
}

exports.composeImages = composeImages;
