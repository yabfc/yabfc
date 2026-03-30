import { type Edge, type ItemIo, type RecipeNode } from '@/lib/factory/recipeNode';

const factory = $state<{
	inputs: { [key: string]: ItemIo };
	outputs: { [key: string]: ItemIo };
	recipeNodes: { [key: string]: RecipeNode };
	edges: Edge[];
}>({
	inputs: {},
	outputs: {},
	recipeNodes: {},
	edges: [],
});

export default factory;
