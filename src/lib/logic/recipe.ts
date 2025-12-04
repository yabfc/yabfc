import type Recipe from '@/lib/models/recipe';
import type Profile from '@/lib/models/profile';

export function getRecipe(itemId: String, profile: Profile): Recipe[] {
	let recipes: Recipe[] = [];

	for (let recipe of profile.recipes) {
		for (let output of recipe.out) {
			if (output.id === itemId) {
				recipes.push(recipe);
			}
		}
	}
	return recipes;
}

const memo = new Map<string, Recipe[][]>();

export function getRecipeChain(
	itemId: string,
	profile: Profile,
	path: string[] = [],
	recursionLimit: number = 4,
): Recipe[][] {
	// avoid too deep recursion
	if (path.includes(itemId) || path.length > recursionLimit) {
		return [];
	}
	if (memo.has(itemId)) return memo.get(itemId)!;

	let chain: Recipe[][] = [];
	const nextPath = [...path, itemId];

	for (const recipe of getRecipe(itemId, profile)) {
		if (recipe.category === 'converter') {
			continue;
		}
		let inputCombos: Recipe[][] = [[]];

		for (const input of recipe.in) {
			let childchains = getRecipeChain(input.id, profile, nextPath, recursionLimit);

			if (childchains.length === 0) {
				inputCombos = [[]];
				break;
			}
			let newCombos: Recipe[][] = [];
			for (let combo of inputCombos) {
				for (let childchain of childchains) {
					newCombos.push([...combo, ...childchain]);
				}
			}
			inputCombos = newCombos;
		}

		for (const combo of inputCombos) {
			chain.push([recipe, ...combo]);
		}
	}
	memo.set(itemId, chain);
	return chain;
}
