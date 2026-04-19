export function formattedLimitations(limitations: string[]): string[] {
	const groups: Record<string, string[]> = {};

	// make first letter uppercase
	const pretty = (value: string) => value.replace(/\b\w/g, c => c.toUpperCase());

	limitations.forEach(limit => {
		const [type = '', exact = ''] = limit.split(':', 2);
		if (!type) return;

		const value = exact ? pretty(exact) : '';

		if (!groups[type]) groups[type] = [];
		if (value) groups[type].push(value);
	});

	return Object.entries(groups).map(([type, values]) => {
		let title = 'Allowed ';
		title += values.length > 1 ? `${pretty(type)}s` : pretty(type);
		return values.length ? `${title}: ${values.join(', ')}` : title;
	});
}
