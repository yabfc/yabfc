import type Recipe from '@/lib/models/recipe';
import type Profile from '@/lib/models/profile';

function getRecipe(itemId: String, profile: Profile): Recipe[] {
	let recipes: Recipe[] = [];

	for (let recipe of profile.recipes) {
		for (let output of recipe.out) {
			if (output.id === itemId) {
				recipes.push(recipe);
			}
		}
	}
	// add another condition here so feeding output of a refinery / blender is more feasable
	for (let recipe of recipes) {
		if (recipe.category === 'extractor' || recipe.category === 'extractor-miner') {
			return [recipe];
		}
	}
	return recipes;
}

function getDefaultRecipe(itemId: String, profile: Profile): Recipe | null {
	for (let recipe of profile.recipes) {
		if (recipe.default === undefined) {
			continue;
		}
		for (let output of recipe.out) {
			if (output.id === itemId && recipe.default) {
				return recipe;
			}
		}
	}
	return null;
}

export function getDefaultRecipeChain(itemId: string, profile: Profile): Recipe[] | null {
	let chain: Recipe[] = [];
	let recipe = getDefaultRecipe(itemId, profile);
	if (recipe == null) {
		return null;
	}

	let childRecipes: Recipe[] = [];

	for (const input of recipe.in) {
		let childchains = getDefaultRecipeChain(input.id, profile);
		if (childchains == null) {
			return null;
		}

		if (childchains.length === 0) {
			childRecipes = [];
			break;
		}
		childRecipes = [...childRecipes, ...childchains];
	}

	return [recipe, ...childRecipes];
}

const memo = new Map<string, Recipe[][]>();

type NestedRecipeChain = Array<NestedRecipeChain | Recipe>;

export function getRecipeChain(
	itemId: string,
	profile: Profile,
	path: string[] = [],
): NestedRecipeChain {
	// avoid possible recursion?
	if (path.includes(itemId)) {
		return [];
	}

	let recipes: NestedRecipeChain = [];
	const nextPath = [...path, itemId];
	for (const recipe of getRecipe(itemId, profile)) {
		if (recipe.category === 'converter') {
			continue;
		}
		let tmp: NestedRecipeChain = [];
		for (const input of recipe.in) {
			let childRecipes = getRecipeChain(input.id, profile, nextPath);
			if (childRecipes.length === 0) {
				recipes.push([recipe]);
				break;
			}
			tmp.push([childRecipes]);
		}
		recipes.push([recipe, ...tmp]);
	}

	return recipes;
}
