import type { Edge, ItemIo, RecipeNode } from '@/lib/factory/recipeNode';
import type Profile from '@/lib/models/profile';
import type Recipe from '@/lib/models/recipe';
import { nanoid } from 'nanoid';

export function calculateEdges(
	profile: Profile,
	recipeNodes: RecipeNode[],
	inputs: ItemIo[],
	outputs: ItemIo[],
) {
	let edges: Edge[] = [];

	// connect inputs to recipe nodes
	inputs.forEach(input => {
		recipeNodes
			.filter(x => profile.getRecipeById(x.recipeId)?.in.some(y => y.id === input.id))
			.forEach(recipeNode => {
				// TODO if item is sent to multiple recipe nodes, amount is wrong
				edges.push({ from: input.id, to: recipeNode.id, amount: input.amount });
			});
	});

	// connect recipe node outputs
	recipeNodes.forEach(outputRecipeNode => {
		const recipe = profile.getRecipeById(outputRecipeNode.recipeId);

		if (!recipe) return;

		// TODO amount
		const outputModifier = calculateRecipeNodeModifier(profile, outputRecipeNode).output;

		recipe.out.forEach(output => {
			recipeNodes
				.filter(x => profile.getRecipeById(x.recipeId)?.in.some(y => y.id === output.id))
				.forEach(inputNode => {
					edges.push({
						from: outputRecipeNode.id,
						to: inputNode.id,
						amount: output.amount * outputModifier,
					});
				});

			outputs
				.filter(x => x.id === output.id)
				.forEach(outputNode => {
					edges.push({
						from: outputRecipeNode.id,
						to: outputNode.id,
						amount: output.amount * outputModifier,
					});
				});
		});
	});

	return edges;
}

/** Get all recipes (sorted by priority) based on the given item */
export function getRecipes(profile: Profile, itemOutput: string): Recipe[] {
	let recipes = profile.getRecipesByItemOutputId(itemOutput);
	recipes.sort((a, b) => (a.priority < b.priority ? -1 : 1));
	return recipes;
}

/** @todo this is in early stage and subject to change */
export function getRecipeChain(profile: Profile, itemOutput: string): RecipeNode[] {
	const recipe = getRecipes(profile, itemOutput)[0];

	if (!recipe) return []; // TODO do we need to handle this?

	if (recipe.in.length === 0) return [];

	return [
		{
			id: nanoid(),
			recipeId: recipe.id,
			machines: [],
		},
		...getRecipeChain(profile, recipe.in[0].id),
	];
}

export function calculateRecipeNodeModifier(
	profile: Profile | undefined,
	node: RecipeNode | undefined,
) {
	let modifier = { input: 0, output: 0 };
	if (!profile || !node) return modifier;

	const recipe = profile.getRecipeById(node.recipeId);
	if (!recipe) return modifier;

	const runs = profile.settings.defaultDuration / recipe.duration;

	const outputModifier = node.machines.reduce((sum, m) => sum + m.speed * m.efficiency, 0);
	const inputModifier = node.machines.reduce((sum, m) => sum + m.speed, 0);

	modifier.output = outputModifier * runs;
	modifier.input = inputModifier * runs;

	return modifier;
}

/** Calculates the output for each output of a RecipeNode */
export function calculateOutput(profile: Profile | undefined, node: RecipeNode | undefined) {
	let outputs: { [key: string]: number } = {};
	if (!profile || !node) return outputs;

	const recipe = profile.getRecipeById(node.recipeId);
	if (!recipe) return outputs;

	const outputModifier = calculateRecipeNodeModifier(profile, node).output;

	recipe.out.forEach(output => {
		outputs[output.id] = output.amount * outputModifier;
	});

	return outputs;
}

/** Calculates the input for each input of a RecipeNode */
export function calculateInput(profile: Profile | undefined, node: RecipeNode | undefined) {
	let inputs: { [key: string]: number } = {};
	if (!profile || !node) return inputs;

	const recipe = profile.getRecipeById(node.recipeId);
	if (!recipe) return inputs;

	const inputModifier = calculateRecipeNodeModifier(profile, node).input;

	recipe.in.forEach(input => {
		inputs[input.id] = input.amount * inputModifier;
	});

	return inputs;
}
