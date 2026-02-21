export function formatPower(
	watts: number,
	decimals: number = 2,
): { value: string; unit: string; rawNumber: number; formattedString: string } {
	if (watts === 0) return { value: '0', unit: 'W', rawNumber: 0, formattedString: '0W' };

	const userLocale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

	const units = [
		{ value: 1e12, label: 'terawatt', short: 'TW' },
		{ value: 1e9, label: 'gigawatt', short: 'GW' },
		{ value: 1e6, label: 'megawatt', short: 'MW' },
		{ value: 1e3, label: 'kilowatt', short: 'kW' },
		{ value: 1, label: 'watt', short: 'W' },
	];

	const absWatts = Math.abs(watts);
	const match = units.find(u => absWatts >= u.value) || units[units.length - 1];
	const calculatedValue = watts / match.value;

	const formattedValue = new Intl.NumberFormat(userLocale, {
		maximumFractionDigits: decimals,
		minimumFractionDigits: 0,
	}).format(calculatedValue);

	return {
		value: formattedValue,
		unit: match.short,
		rawNumber: calculatedValue,
		formattedString: `${formattedValue} ${match.short}`,
	};
}
