import linearInterpolation from './linearInterpolation';

export default function (values, screen, maxScreen, screenKey) {
	return Object.keys(values).reduce(
		(current, key) => ({
			...current,
			[`--${key}`]: linearInterpolation(
				screen,
				values[key][screenKey][0],
				maxScreen,
				values[key][screenKey][1]
			)
		}),
		{}
	);
}
