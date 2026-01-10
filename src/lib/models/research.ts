interface UnlockRecipe {
	type: 'recipe';
	ids: string[];
}

type Unlock = UnlockRecipe;

export default interface Research {
	id: string;
	unlocks: Unlock[];
	prerequisites?: string[];
}
