import type { MachineFeature } from '@/lib/models/machine';

export interface LogisticInterface {
	id: string;
	type: 'item' | 'fluid';
	speed: number;
	// todo e.g belt stacking
	features?: MachineFeature[];
}

export interface ConveyorSaturation extends LogisticInterface {
	saturation: number;
}

export class Logistic {
	id: string;
	type: 'item' | 'fluid';
	speed: number;
	features?: MachineFeature[];

	constructor(logistic: LogisticInterface) {
		this.id = logistic.id;
		this.type = logistic.type;
		this.speed = logistic.speed;
		this.features = logistic.features;
	}

	getDisplayName(): string {
		return this.id
			.split('-')
			.map(w => w[0].toUpperCase() + w.slice(1))
			.join(' ');
	}

	getSaturation(multiplier: number, usedAmount: number): ConveyorSaturation {
		const capacity = this.speed * multiplier;
		const saturation = capacity > 0 ? usedAmount / capacity : 0;
		return {
			...this,
			saturation,
		};
	}
}
