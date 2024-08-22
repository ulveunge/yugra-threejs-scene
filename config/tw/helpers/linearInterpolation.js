export default function (x1, y1, x2, y2) {
	const m = (y2 - y1) / (parseInt(x2, 10) - 1 - parseInt(x1, 10));
	const b = y1 - m * parseInt(x1, 10);
	const sign = b < 0 ? '-' : '+';

	return `calc(${m * 100}vw ${sign} ${Math.abs(b)}px)`;
}
