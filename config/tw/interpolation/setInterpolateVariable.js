import getMediaQuery from '../helpers/getMediaQuery';
import createVariables from '../helpers/createVariables';

export default function (screens, values) {
	const keys = Object.keys(screens);

	return keys.reduce((current, key, index) => {
		if (index === 0) {
			return {
				...current,
				...createVariables(values, screens[key], screens[keys[index + 1]], key)
			};
		}
		if (index === keys.length - 1) {
			return {
				...current,
				[getMediaQuery(key)]: createVariables(values, screens[key], '1920px', key)
			};
		}

		return {
			...current,
			[getMediaQuery(key)]: createVariables(values, screens[key], screens[keys[index + 1]], key)
		};
	}, {});
}
