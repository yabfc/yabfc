<script lang="ts">
	import Dialog from '@/components/shared/Dialog.svelte';
	import { type BaseItemIo } from '@/lib/models/recipe';
	import active from '@/stores/active.svelte';
	import { ArrowBigRightDashIcon, FactoryIcon, TestTubeDiagonalIcon } from '@lucide/svelte';

	let { dialog = $bindable(), recipeId }: { dialog?: HTMLDialogElement; recipeId?: string } =
		$props();

	let recipe = $derived(active.profile?.getRecipeById(recipeId ?? ''));
	let machines = $derived(
		recipe ? (active.profile?.getMachinesByRecipe(recipe.category) ?? []) : [],
	);
</script>

<Dialog bind:dialog>
	<h3 class="inline-block text-lg font-bold">
		<TestTubeDiagonalIcon class="mr-2 inline" size="20" />
		<span class="sr-only">Recipe</span>
		{recipe?.getDisplayName()}
	</h3>

	{#if recipe?.available}
		<span class="badge badge-sm badge-soft badge-success ml-2">Available</span>
	{:else}
		<span class="badge badge-sm badge-soft badge-error ml-2">Unavailable</span>
	{/if}

	<div class="py-1 text-xs">
		ID:
		<code class="bg-base-200 rounded-selector border-base-content/10 border p-1 font-mono">
			{recipe?.id}
		</code>
	</div>

	<div class="bg-base-200 rounded-box my-4 flex items-center justify-between gap-2 p-4">
		{#snippet itemIO(x: BaseItemIo)}
			{@const item = active.profile?.getItemById(x.id)}
			<li>
				<span class="text-base-content/50">{x.amount}x</span>
				<span class="font-bold">{item?.getDisplayName()}</span>
			</li>
		{/snippet}

		<div>
			<span class="sr-only">Inputs</span>

			<ul>
				{#each recipe?.in ?? [] as input (input.id)}
					{@render itemIO(input)}
				{/each}
			</ul>
		</div>

		<div>
			<span class="sr-only">to</span>
			<ArrowBigRightDashIcon />
		</div>

		<div>
			<span class="sr-only">Outputs</span>

			<ul>
				{#each recipe?.out ?? [] as output (output.id)}
					{@render itemIO(output)}
				{/each}
			</ul>
		</div>
	</div>

	<div class="py-1">
		<span class="sr-only">Machines</span>

		<ul>
			{#each machines as machine}
				<li class="text-sm">
					<FactoryIcon size="20" class="inline-block" />
					{machine.getDisplayName()}
				</li>
			{/each}
		</ul>
	</div>

	<div class="pt-3">
		<ul>
			{#snippet property(title: string, content?: any)}
				<li>
					<span class="text-base-content/50 text-xs uppercase">{title}:</span>
					<span class="font-mono text-sm">{content ?? 'N/A'}</span>
				</li>
			{/snippet}

			{@render property('Duration', recipe?.duration)}
			{@render property('Limitations', recipe?.limitations?.join(', '))}
		</ul>
	</div>
</Dialog>
