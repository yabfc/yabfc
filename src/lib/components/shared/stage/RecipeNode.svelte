<script lang="ts">
	import type { RecipeNode } from '@/lib/models/node';
	import active from '@/lib/stores/active.svelte';
	import { FactoryIcon } from '@lucide/svelte';
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	let {
		data,
		targetPosition = Position.Left,
		sourcePosition = Position.Right,
	}: NodeProps & { data: { recipeNode: RecipeNode } } = $props();

	const recipe = active.profile?.getRecipeById(data.recipeNode.recipeId);
</script>

<Handle type="target" position={targetPosition} />

<div
	class="rounded-box bg-base-100 border-base-content/10 flex flex-col items-center gap-1 border p-3"
>
	<FactoryIcon size="28" class="text-secondary/70" />

	<span class="font-bold">{recipe?.getDisplayName()}</span>

	<ul class="text-base-content/80 flex flex-col gap-1 text-xs">
		{#snippet factory(name: string, amount: number, effectStrings: string[])}
			<li>
				<span class="text-base-content/50">{amount}x</span>
				{name}

				<p class="text-base-content/50 text-[0.5rem] font-semibold uppercase">
					{effectStrings.join(', ')}
				</p>
			</li>
		{/snippet}

		{#each data.recipeNode.machines as machine}
			{@render factory(
				active.profile?.getMachineById(machine.machineId)?.getDisplayName() ??
					'Unknown Machine',
				machine.amount,
				machine.usedEffects.map(x => {
					let s =
						active.profile?.getEffectModuleById(x.effectId)?.getDisplayName() ??
						'Unknown Effect';
					if (x.scaling !== 1) s += ` ${x.scaling}x`;

					return s;
				}),
			)}
		{/each}
	</ul>
</div>

<Handle type="source" position={sourcePosition} />
