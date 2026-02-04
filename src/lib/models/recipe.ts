import type { EffectConfiguration } from '@/lib/models/effect';

export interface BaseItemIo {
	id: string;
	type: 'item' | 'fluid';
	amount: number;
}

export interface RequestedBaseItemIo extends BaseItemIo {
	exact: boolean;
}

export interface RecipeVariant {
	id: string;
	recipeId: string;
	recipePriority: number;
	machineId: string;
	in: BaseItemIo[];
	out: BaseItemIo[];
	requiredPower: number;
	usedEffectModuleIds: EffectConfiguration[];
	amount?: number;
}

export interface RecipeInterface {
	id: string;
	name?: string;
	available: boolean;
	in: BaseItemIo[];
	out: BaseItemIo[];
	duration: number;
	category: string;
	priority: number;
	limitations?: string[];
	craftable?: boolean;
}

export default class Recipe {
	id: string;
	name?: string;
	available: boolean;
	in: BaseItemIo[];
	out: BaseItemIo[];
	duration: number;
	category: string;
	priority: number;
	limitations?: string[];
	craftable?: boolean;

	constructor(recipe: RecipeInterface) {
		this.id = recipe.id;
		this.name = recipe.name;
		this.available = recipe.available;
		this.in = recipe.in;
		this.out = recipe.out;
		this.duration = recipe.duration;
		this.category = recipe.category;
		this.priority = recipe.priority;
		this.limitations = recipe.limitations;
		this.craftable = recipe.craftable;
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
