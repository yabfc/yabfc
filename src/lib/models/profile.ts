import type Machine from '@/lib/models/machine';
import type Item from '@/lib/models/item';
import type Recipe from '@/lib/models/recipe';
import type EffectModule from '@/lib/models/effect';

export interface ProfileInterface {
	id: string;
	name: string;
	items: Item[];
	recipes: Recipe[];
	machines: Machine[];
	machineEffects: EffectModule[];
}

export default class Profile {
	id: string;
	name: string;

	items: Item[];
	recipes: Recipe[];
	machines: Machine[];
	machineEffects: EffectModule[];

	constructor(profile: ProfileInterface) {
		this.id = profile.id;
		this.name = profile.name;

		this.items = profile.items;
		this.recipes = profile.recipes;
		this.machines = profile.machines;
		this.machineEffects = profile.machineEffects;
	}

	getItemById(id: string): Item | undefined {
		return this.items.find(x => x.id == id);
	}

	getRecipeById(id: string): Recipe | undefined {
		return this.recipes.find(x => x.id == id);
	}

	getRecipesByItemOutputId(id: string): Recipe[] {
		return this.recipes.filter(x => x.out.find(io => io.id == id));
	}

	getMachinesByRecipe(recipe: Recipe): Machine[] {
		return this.machines.filter(x => x.recipeCategories.includes(recipe.category));
	}
}
