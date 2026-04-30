export interface nameOverride {
	quality: string | undefined;
}

export default interface SettingInterface {
	defaultDuration: number;
	allRecipesUnlocked: boolean;
	limitations?: string[];
	nameOverride?: nameOverride;
}
