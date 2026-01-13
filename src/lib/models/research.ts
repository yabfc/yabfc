interface UnlockRecipe {
	type: 'recipe';
	ids: string[];
}

type Unlock = UnlockRecipe;

export interface ResearchInterface {
	id: string;
	name?: string;
	unlocks: Unlock[];
	prerequisites?: string[];
}

export default class Research {
	id: string;
	name?: string;
	unlocks: Unlock[];
	prerequisites?: string[];

	constructor(research: ResearchInterface) {
		this.id = research.id;
		this.name = research.name;
		this.unlocks = research.unlocks;
		this.prerequisites = research.prerequisites;
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
