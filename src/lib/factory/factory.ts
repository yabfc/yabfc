import { type Edge, type Factory, type RecipeNode } from '@/lib/models/factory';
import type Profile from '@/lib/models/profile';
import type Recipe from '@/lib/models/recipe';
import { nanoid } from 'nanoid';
import { connectEdges, recalculateEdgeAmounts } from '@/lib/factory/edge';

/** Get all recipes (sorted by priority) based on the given item */
export function getRecipes(profile: Profile, itemOutput: string): Recipe[] {
	let recipes = profile.getRecipesByItemOutputId(itemOutput);
	recipes.sort((a, b) => (a.priority < b.priority ? -1 : 1));
	return recipes;
}

/** @todo this is in early stage and subject to change */
export function getRecipeChain(
	profile: Profile,
	itemOutputs: string[],
	inputs: string[],
	seenRecipes = new Set<string>(),
): RecipeNode[] {
	return itemOutputs.flatMap(itemOutput => {
		const recipe = getRecipes(profile, itemOutput)[0];

		if (!recipe) return []; // TODO do we need to handle this?
		//if (recipe.in.length === 0) return [];
		if (seenRecipes.has(recipe.id)) return [];

		seenRecipes.add(recipe.id);

		return [
			{
				id: nanoid(),
				recipeId: recipe.id,
				machines: profile.getDefaultMachineConfiguration(recipe.category),
			},
			...getRecipeChain(
				profile,
				recipe.in.filter(x => !inputs.includes(x.id)).map(x => x.id),
				inputs,
				seenRecipes,
			),
		];
	});
}

/** Rebuild the factory with the updated recipe */
export function rebuildFactory(
	profile: Profile,
	factory: Factory,
	nodeId: string,
	newRecipeId: string,
) {
	const oldRecipeNodes = factory.recipeNodes;
	const oldEdges = factory.edges;

	const changedNode = oldRecipeNodes[nodeId];
	if (!changedNode) return;

	const newRecipe = profile.getRecipeById(newRecipeId);
	if (!newRecipe) return;

	const availableMachines = profile.getMachinesByRecipe(newRecipe.category).map(x => x.id);
	changedNode.machines = changedNode.machines.filter(x =>
		availableMachines.includes(x.machineId),
	);

	// readd a default machine
	if (changedNode.machines.length === 0)
		changedNode.machines = profile.getDefaultMachineConfiguration(newRecipe.category);

	changedNode.recipeId = newRecipeId;

	const prunableNodeIds = collectPrunableNodeIds(nodeId, oldEdges);
	const prunedRecipeNodes = Object.fromEntries(
		Object.entries(oldRecipeNodes).filter(([key]) => !prunableNodeIds.has(key)),
	);

	const updatedRecipeChain = [
		...Object.values(prunedRecipeNodes),
		...getRecipeChain(
			profile,
			newRecipe.in.map(x => x.id),
			Object.values(factory.inputs).map(x => x.id),
			new Set(Object.values(prunedRecipeNodes).map(x => x.recipeId)),
		),
	];

	// make sure that each recipe only exists once. Such a case exists
	// when e.g switching the Uranium Processing recipe to Kovarex
	// and then back to normal Uranium Processing (factorio)
	const seenRecipes = new Set<string>();
	const uniqueRecipeNodes = updatedRecipeChain.filter(node => {
		if (seenRecipes.has(node.recipeId)) return false;
		seenRecipes.add(node.recipeId);
		return true;
	});

	factory.edges = [];
	factory.recipeNodes = Object.fromEntries(uniqueRecipeNodes.map(x => [x.id, x]));
	factory.edges = connectEdges(
		profile,
		Object.values(factory.recipeNodes),
		Object.values(factory.inputs),
		Object.values(factory.outputs),
	);
	recalculateEdgeAmounts(profile, factory);
}

/** Get all Node IDs that can be safely deleted due to the recipe change */
export function collectPrunableNodeIds(startNodeId: string, edges: Edge[]): Set<string> {
	const upstreamIds = new Set<string>();
	const stack = [startNodeId];

	// this can contain nodes that are actually still needed e.g
	// wire is required by the cable and stator recipe. If the cable recipe
	// would be changed to the quickwire alternate, this would prune wire
	// node and its upstreams even though they are still required for stators.
	while (stack.length) {
		const current = stack.pop()!;

		for (const edge of edges) {
			if (edge.to !== current) continue;

			if (!upstreamIds.has(edge.from)) {
				upstreamIds.add(edge.from);
				stack.push(edge.from);
			}
		}
	}

	// find the cases where a node is actually still needed due to other dependencies downstream
	const protectedIds = new Set<string>();
	for (const nodeId of upstreamIds) {
		const hasOutgoingOutsideSubtree = edges.some(edge => {
			return edge.from === nodeId && edge.to !== startNodeId && !upstreamIds.has(edge.to);
		});

		if (hasOutgoingOutsideSubtree) {
			protectedIds.add(nodeId);
		}
	}

	// mark the upstream nodes of these protected nodes as also protected
	const protectedStack = [...protectedIds];
	while (protectedStack.length) {
		const current = protectedStack.pop()!;

		for (const edge of edges) {
			if (edge.to !== current) continue;
			if (!upstreamIds.has(edge.from)) continue;
			if (protectedIds.has(edge.from)) continue;

			protectedIds.add(edge.from);
			protectedStack.push(edge.from);
		}
	}

	return new Set([...upstreamIds].filter(x => !protectedIds.has(x)));
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

	const outputModifier = node.machines.reduce((sum, m) => {
		return sum + m.machineCount * m.speed * m.productivity;
	}, 0);
	const inputModifier = node.machines.reduce((sum, m) => {
		return sum + m.machineCount * m.speed;
	}, 0);

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
