import linearInterpolation from '../helpers/linearInterpolation';
import getMediaQuery from '../helpers/getMediaQuery';

export default function (screens, values, style) {
	const keys = Object.keys(values);

	return keys.reduce((current, key, index) => {
		if (index === 0) {
			return {
				[style]: linearInterpolation(
					screens[key],
					values[key][0],
					screens[keys[index + 1]],
					values[key][1]
				)
			};
		}
		if (index === keys.length - 1) {
			return {
				...current,
				[getMediaQuery(key)]: {
					[style]: linearInterpolation(screens[key], values[key][0], '1920px', values[key][1])
				}
			};
		}

		return {
			...current,
			[getMediaQuery(key)]: {
				[style]: linearInterpolation(
					screens[key],
					values[key][0],
					screens[keys[index + 1]],
					values[key][1]
				)
			}
		};
	}, {});
}
