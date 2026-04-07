<script lang="ts">
	import { calculateInput, calculateOutput, getRecipes } from '@/lib/factory/factory';
	import type { MachineConfiguration, RecipeNode } from '@/lib/factory/recipeNode';
	import active from '@/stores/active.svelte';
	import factory from '@/stores/factory.svelte';
	import { FactoryIcon, PlusIcon } from '@lucide/svelte';
	import { Handle, Position, type Node, type NodeProps } from '@xyflow/svelte';

	let {
		data,
		targetPosition = Position.Left,
		sourcePosition = Position.Right,
	}: NodeProps<Node<{ recipeNode: RecipeNode }>> = $props();

	let recipe = $derived(active.profile?.getRecipeById(data.recipeNode.recipeId));

	let node = $derived<RecipeNode | undefined>(factory.recipeNodes[data.recipeNode.id]);

	let inputs = $derived(calculateInput(active.profile, node)),
		outputs = $derived(calculateOutput(active.profile, node));

	const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 });

	let machine = $state<string>();
	const addMachine = () => {
		if (!machine) return;

		node?.machines.push({ machineId: machine, machineCount: 1, productivity: 1, speed: 1 });
	};

	let alternatives = $derived.by(() => {
		if (!active.profile) return undefined;

		// we don't show alternatives if more than one output is generated
		if (!recipe || recipe.out.length !== 1) return undefined;

		return getRecipes(active.profile, recipe.out[0].id);
	});
</script>

<Handle
	type="target"
	position={targetPosition}
	class="border-base-content/50 rounded-full border [--xy-handle-background-color:color-mix(in_oklab,var(--color-base-content)_50%,transparent)]"
/>

<div
	class="rounded-box bg-base-100 border-base-content/10 flex w-56 flex-col items-center gap-1 border p-4"
	class:pt-10={alternatives}
>
	<FactoryIcon size="32" class="text-secondary/70" />

	<span class="w-full overflow-hidden text-center text-lg font-bold text-ellipsis">
		{recipe?.getDisplayName() || data.recipeNode.recipeId}
	</span>

	{#if alternatives}
		<div class="absolute top-2 right-2 ml-2">
			<p class="sr-only">Select recipe alternative</p>

			<select class="select select-xs">
				<option disabled selected>Select alternative</option>

				{#each alternatives as r}
					<option>
						{r.getDisplayName()}
					</option>
				{/each}
			</select>
		</div>
	{/if}

	<div class="flex w-full justify-between gap-2 p-2 text-xs">
		<div>
			<p class="text-base-content/50 font-bold uppercase">Input</p>

			<ul>
				{#each Object.entries(inputs) as input}
					<li class="text-base-content/80">
						{active.profile?.getItemById(input[0])?.getDisplayName()}:
						{formatter.format(input[1])}
					</li>
				{:else}
					<li class="text-base-content/80">No input available</li>
				{/each}
			</ul>
		</div>

		<div>
			<p class="text-base-content/50 font-bold uppercase">Output</p>

			<ul>
				{#each Object.entries(outputs) as output}
					<li class="text-base-content/80">
						{active.profile?.getItemById(output[0])?.getDisplayName()}:
						{formatter.format(output[1])}
					</li>
				{:else}
					<li class="text-base-content/80">No output available</li>
				{/each}
			</ul>
		</div>
	</div>

	<ul class="text-base-content/80 flex w-full flex-col gap-1 text-sm">
		{#snippet factory(name: string, config: MachineConfiguration)}
			<li>
				<p class="truncate py-2">{name}</p>

				<div class="flex gap-2">
					<label class="floating-label">
						<span>Amount</span>
						<input
							type="number"
							bind:value={config.machineCount}
							step="1"
							class="input input-sm"
						/>
					</label>

					<label class="floating-label">
						<span>{active.profile?.getSpeedOverrideName()}</span>
						<input
							type="number"
							bind:value={config.speed}
							step="0.1"
							class="input input-sm"
						/>
					</label>

					<label class="floating-label">
						<span>{active.profile?.getProductivityOverrideName()}</span>
						<input
							type="number"
							bind:value={config.productivity}
							step="0.1"
							class="input input-sm"
						/>
					</label>
				</div>
			</li>
		{/snippet}

		{#each node?.machines || [] as machine}
			{@render factory(
				active.profile?.getMachineById(machine.machineId)?.getDisplayName() ??
					'Unknown Machine',
				machine,
			)}
		{:else}
			<p class="text-xs text-center text-base-content/60">No machines added</p>
		{/each}
	</ul>

	<div class="join w-full pt-4">
		<select bind:value={machine} class="select select-xs join-item">
			{#each active.profile?.getMachinesByRecipe(recipe?.category || '') as machine}
				<option value={machine.id}>{machine.getDisplayName()}</option>
			{:else}
				<option disabled value={undefined}>No machine available</option>
			{/each}
		</select>

		<button onclick={addMachine} class="btn btn-xs btn-soft join-item"
			><PlusIcon size="13" />
		</button>
	</div>
</div>

<Handle
	type="source"
	position={sourcePosition}
	class="border-base-content/50 rounded-full border [--xy-handle-background-color:color-mix(in_oklab,var(--color-base-content)_50%,transparent)]"
/>
