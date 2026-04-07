<script lang="ts">
	import { calculateEdges, getRecipeChain, getResourceInputs } from '@/lib/factory/factory';
	import active from '@/stores/active.svelte';
	import factory from '@/stores/factory.svelte';

	async function calculate() {
		if (!active.profile) return;

		const out = [
			{ id: 'nuclear-fuel-rod', amount: 10 },
			{ id: 'iron-rod', amount: 10 },
			{ id: 'advanced-circuit', amount: 10 },
		];

		factory.outputs = Object.fromEntries(out.map(item => [item.id, item]));

		const recipeChain = getRecipeChain(
			active.profile,
			out.map(x => x.id),
		);

		factory.recipeNodes = Object.fromEntries(recipeChain.map(x => [x.id, x]));
		factory.inputs = getResourceInputs(active.profile, recipeChain);

		factory.edges = calculateEdges(
			active.profile,
			Object.values(factory.recipeNodes),
			Object.values(factory.inputs),
			Object.values(factory.outputs),
		);
	}
</script>

<div
	class="fixed top-24 bottom-4 left-4 z-10 h-fit max-h-[calc(100%-var(--spacing)*28)] w-80 overflow-auto"
>
	<div class="rounded-box bg-base-200 p-2">
		<h2 class="text-xl font-bold">Calculate Factory</h2>

		<div class="flex flex-row-reverse gap-2 pt-2">
			<button onclick={calculate} class="btn btn-primary btn-soft">Calculate</button>
		</div>
	</div>
</div>
