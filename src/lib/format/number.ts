const POWER_FACTORS = {
	PW: 1_000_000_000_000_000,
	TW: 1_000_000_000_000,
	GW: 1_000_000_000,
	MW: 1_000_000,
	kW: 1_000,
	W: 1,
} as const;

type PowerUnit = keyof typeof POWER_FACTORS;

type PowerParts = {
	value: string;
	unit: string;
	formatted: string;
};

export class NumberFormatter {
	private formatter: Intl.NumberFormat;

	constructor(locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions) {
		this.formatter = new Intl.NumberFormat(locales, options);
	}

	format(value: number): string {
		return this.formatter.format(value);
	}

	getPowerUnit(watts: number): PowerUnit {
		const units: PowerUnit[] = ['PW', 'TW', 'GW', 'MW', 'kW', 'W'];
		const absWatts = Math.abs(watts);
		return units.find(unit => absWatts >= POWER_FACTORS[unit]) ?? 'W';
	}

	getPowerParts(watts: number): PowerParts {
		const unit = this.getPowerUnit(watts);
		const value = this.format(watts / POWER_FACTORS[unit]);

		return {
			value,
			unit,
			formatted: `${value} ${unit}`,
		};
	}

	formatPower(watts: number): string {
		return this.getPowerParts(watts).formatted;
	}
}
