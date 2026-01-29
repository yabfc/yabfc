export interface BaseModifier {
	id: 'speed' | 'power' | 'consumption' | 'productivity' | 'pollution' | 'quality';
	name?: string;
	onlyOutputScales?: boolean;
	/** @defaults to linear scaling */
	valueScaling?: 'exponential';
}

export interface FixedModifier extends BaseModifier {
	modifiable: false;
	value: number;
}

export interface VariableModifier extends BaseModifier {
	modifiable: true;
	minValue: number;
	maxValue: number;
}

export type ModifierInterface = FixedModifier | VariableModifier;

export interface EffectConfiguration {
	id: string;
	effectId: string;
	scaling: number;
}

export class Modifier {
	id: string;
	name?: string;
	value?: number;
	modifiable: boolean;
	onlyOutputScales?: boolean;
	valueScaling?: 'exponential';
	minValue?: number;
	maxValue?: number;

	constructor(modifier: ModifierInterface) {
		this.id = modifier.id;
		this.name = modifier.name;
		this.modifiable = modifier.modifiable;
		this.onlyOutputScales = modifier.onlyOutputScales;
		this.valueScaling = modifier.valueScaling;

		if (modifier.modifiable) {
			this.minValue = modifier.minValue;
			this.maxValue = modifier.maxValue;
		} else {
			this.value = modifier.value;
		}
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

	getAllModifierIds(): string[] {
		return this.modifiers.map(x => x.id);
	}
}
