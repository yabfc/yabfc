export interface EffectChoice {
	id: string;
	effectId: string;
	scaling?: number;
}

export interface ModifierInterface {
	id: 'speed' | 'power' | 'consumption' | 'productivity' | 'pollution' | 'quality';
	name?: string;
	/** @defaults to linear scaling */
	valueScaling?: 'exponential';
	value: number;
}

export class Modifier {
	id: string;
	name?: string;
	value: number;
	valueScaling?: 'exponential';

	constructor(modifier: ModifierInterface) {
		this.id = modifier.id;
		this.name = modifier.name;
		this.valueScaling = modifier.valueScaling;
		this.value = modifier.value;
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

	updatePowerConsumption(power: number, scaling: number): number {
		if (!['consumption', 'power'].includes(this.id)) return power;

		if (this.valueScaling === 'exponential') {
			power *= Math.pow(scaling, this.value);
			return power;
		}
		return power * this.value * scaling;
	}
}

interface EffectModuleBase {
	id: string;
	name?: string;
	available: boolean;
	modifiers: ModifierInterface[];
	hidden?: boolean;
	singleUse?: boolean;
}

// standard factorio effects
export interface FixedEffectModuleInterface extends EffectModuleBase {
	type: 'fixed';
}

// satisfactory summerslooping
export interface SteppedEffectModuleInterface extends EffectModuleBase {
	type: 'stepped';
	minValue: number;
	maxValue: number;
	step: number;
}

// satisfactory over/underclocking
export interface ModifiableEffectModuleInterface extends EffectModuleBase {
	type: 'modifiable';
	minValue: number;
	maxValue: number;
}

// limit factorio modifiers
export interface LimitedEffectModule extends EffectModuleBase {
	type: 'limited';
	minValue: number | undefined;
	maxValue: number | undefined;
}

export type EffectModuleInterface =
	| FixedEffectModuleInterface
	| SteppedEffectModuleInterface
	| ModifiableEffectModuleInterface
	| LimitedEffectModule;

export default class EffectModule {
	id: string;
	name?: string;
	available: boolean;
	modifiers: Modifier[];
	type: 'fixed' | 'stepped' | 'modifiable' | 'limited';
	minValue?: number;
	maxValue?: number;
	step?: number;
	hidden?: boolean;
	singleUse?: boolean;

	constructor(data: EffectModuleInterface) {
		this.id = data.id;
		this.name = data.name;
		this.available = data.available;
		this.modifiers = data.modifiers.map(modifier => new Modifier(modifier));
		this.type = data.type;
		this.hidden = data.hidden;
		this.singleUse = data.singleUse;

		if (data.type === 'modifiable' || data.type === 'stepped' || data.type === 'limited') {
			this.minValue = data.minValue;
			this.maxValue = data.maxValue;
		}

		if (data.type === 'stepped') {
			this.step = data.step;
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

	getAllModifierIds(): string[] {
		return this.modifiers.map(x => x.id);
	}

	/** @returns power consumption with applied effect */
	updatePowerConsumption(power: number, scaling: number): number {
		if (this.type !== 'fixed' && scaling === 1) return power;
		this.modifiers.forEach(modifier => {
			power = modifier.updatePowerConsumption(power, scaling);
		});
		return power;
	}
}
