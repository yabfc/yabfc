import type { Edge, ItemIo, RecipeNode } from '@/lib/factory/recipeNode';
import type Profile from '@/lib/models/profile';

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

export function calculateRecipeNodeModifier(profile: Profile, node: RecipeNode) {
	let modifier = { input: 0, output: 0 };

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
export function calculateOutput(profile: Profile | undefined, node: RecipeNode) {
	let outputs: { [key: string]: number } = {};
	if (!profile) return outputs;

	const recipe = profile.getRecipeById(node.recipeId);
	if (!recipe) return outputs;

	const outputModifier = calculateRecipeNodeModifier(profile, node).output;

	recipe.out.forEach(output => {
		outputs[output.id] = output.amount * outputModifier;
	});

	return outputs;
}

/** Calculates the input for each input of a RecipeNode */
export function calculateInput(profile: Profile | undefined, node: RecipeNode) {
	let inputs: { [key: string]: number } = {};
	if (!profile) return inputs;

	const recipe = profile.getRecipeById(node.recipeId);
	if (!recipe) return inputs;

	const inputModifier = calculateRecipeNodeModifier(profile, node).input;

	recipe.in.forEach(input => {
		inputs[input.id] = input.amount * inputModifier;
	});

	return inputs;
}
