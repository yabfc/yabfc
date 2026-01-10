import Machine from '@/lib/models/machine';
import Item from '@/lib/models/item';
import Recipe from '@/lib/models/recipe';
import EffectModule from '@/lib/models/effect';
import type Research from '@/lib/models/research';

export interface ProfileInterface {
	id: string;
	name: string;
	items: Item[];
	recipes: Recipe[];
	machines: Machine[];
	machineEffects: EffectModule[];
	research: Research[];
}

export default class Profile {
	id: string;
	name: string;

	items: Item[];
	recipes: Recipe[];
	machines: Machine[];
	machineEffects: EffectModule[];
	research: Research[];

	constructor(profile: ProfileInterface) {
		this.id = profile.id;
		this.name = profile.name;

		this.items = profile.items.map(x => new Item(x));
		this.recipes = profile.recipes.map(x => new Recipe(x));
		this.machines = profile.machines.map(x => new Machine(x));
		this.machineEffects = profile.machineEffects.map(x => new EffectModule(x));
		this.research = profile.research;
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
