import type { MachineFeature } from '@/lib/models/machine';

export interface ConveyorInterface {
	id: string;
	speed: number;
	// e.g belt stacking
	features?: MachineFeature[];
}

export class Conveyor {
	id: string;
	speed: number;
	features?: MachineFeature[];

	constructor(conveyor: ConveyorInterface) {
		this.id = conveyor.id;
		this.speed = conveyor.speed;
		this.features = conveyor.features;
	}

	getDisplayName(): string {
		return this.id
			.split('-')
			.map(w => w[0].toUpperCase() + w.slice(1))
			.join(' ');
	}
}
