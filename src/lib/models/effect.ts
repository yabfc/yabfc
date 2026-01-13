export interface ModifierInterface {
	id: string;
	name?: string;
	value: number;
	modifiable: boolean;
	onlyOutputScales?: boolean;
	/** @defaults to linear scaling */
	valueScaling?: 'exponential';
}

export class Modifier {
	id: string;
	name?: string;
	value: number;
	modifiable: boolean;
	onlyOutputScales?: boolean;
	valueScaling?: 'exponential';

	constructor(modifier: ModifierInterface) {
		this.id = modifier.id;
		this.name = modifier.name;
		this.value = modifier.value;
		this.modifiable = modifier.modifiable;
		this.onlyOutputScales = modifier.onlyOutputScales;
		this.valueScaling = modifier.valueScaling;
	}

	getDisplayName(): string {
		return (
			this.name ??
			this.id
				.split('-')
				.map(w => w[0].toUpperCase() + w.slice(1))
				.join(' ')
		);
	}
}

export interface EffectModuleInterface {
	id: string;
	name?: string;
	available: boolean;
	modifiers: ModifierInterface[];
	perSlot: boolean;
}

export default class EffectModule {
	id: string;
	name?: string;
	available: boolean;
	modifiers: Modifier[];
	perSlot: boolean;

	constructor(item: EffectModuleInterface) {
		this.id = item.id;
		this.name = item.name;
		this.available = item.available;
		this.modifiers = item.modifiers.map(x => new Modifier(x));
		this.perSlot = item.perSlot;
	}

	getDisplayName(): string {
		return (
			this.name ??
			this.id
				.split('-')
				.map(w => w[0].toUpperCase() + w.slice(1))
				.join(' ')
		);
	}
}
