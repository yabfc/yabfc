export interface EffectNameOverride {
	speed: string;
	productivity: string;
}

export default interface SettingInterface {
	defaultDuration: number;
	allRecipesUnlocked: boolean;
	limitations?: string[];
	effectNameOverride?: EffectNameOverride;
}
