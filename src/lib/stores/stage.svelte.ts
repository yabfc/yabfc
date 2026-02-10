import type { RecipeEdge, RecipeNode } from '@/lib/models/node';

export let stage = $state<{ nodes: RecipeNode[]; edges: RecipeEdge[] }>({
	nodes: [],
	edges: [],
});
