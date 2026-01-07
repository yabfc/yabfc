<script lang="ts">
	import type Recipe from '@/lib/models/recipe';
	import { ArrowBigRightDashIcon, DrillIcon } from '@lucide/svelte';

	let { recipes }: { recipes: Recipe[] } = $props();
</script>

<ul class="list">
	{#each recipes as recipe (recipe.id)}
		<li class="list-row">
			<div class="">
				<DrillIcon size="24" class="m-2" />
			</div>
			<div>
				<div>{recipe.name || recipe.id}</div>
				<div class="text-xs font-semibold uppercase opacity-60">
					<!-- TODO we want names, not id's here -->
					<ArrowBigRightDashIcon size="16" class="inline" />
					{recipe.out.map(x => x.id).join(', ')}
				</div>
			</div>
		</li>
	{:else}
		<p class="p-4">No recipes found for this profile.</p>
	{/each}
</ul>
