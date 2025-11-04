export interface Modifier {
	id: string;
	name?: string;
	value: number;
	modifiable: boolean;
	onlyOutputScales?: boolean;
	/** @defaults to linear scaling */
	valueScaling?: 'exponential';
}

export default interface EffectModule {
	id: string;
	name?: string;
	modifiers: Modifier[];
	perSlot: boolean;
}
