<script lang="ts">
	import SearchInput from '@/lib/components/shared/Search.svelte';
	import Profile from '@/lib/models/profile';
	import { ArrowBigRightDashIcon, DrillIcon } from '@lucide/svelte';

	let { profile }: { profile: Profile } = $props();
	let searchQuery = $state('');

	const filteredRecipes = $derived(
		profile.recipes.filter(
			x =>
				x.craftable !== false &&
				(x.getDisplayName().toLowerCase().includes(searchQuery.toLowerCase()) ||
					x.category.includes(searchQuery.toLowerCase())),
		),
	);
</script>

<SearchInput bind:value={searchQuery} />

<ul class="list">
	{#each filteredRecipes as recipe (recipe.id)}
		<li class="list-row p-0">
			<details class="collapse-arrow list-col-grow collapse" name="accordion-recipe-overview">
				<summary class="collapse-title select-none">
					<div class="flex">
						<DrillIcon size="24" class="m-2" />

						<div>
							<div>{recipe.getDisplayName()}</div>
							<div class="text-xs font-semibold uppercase opacity-60">
								<ArrowBigRightDashIcon size="16" class="inline" />
								{recipe.out
									.map(x => profile.getItemById(x.id)?.name ?? x.id)
									.join(', ')}
							</div>
						</div>
					</div>
				</summary>

				<div class="collapse-content">
					<ul class="px-2">
						<li>
							<span class="text-base-content/50 text-xs uppercase">Category:</span>
							<span class="font-mono text-sm">{recipe.category ?? 'N/A'}</span>
						</li>
						<li>
							<span class="text-base-content/50 text-xs uppercase">Duration:</span>
							<span class="font-mono text-sm">{recipe.duration ?? 'N/A'}</span>
						</li>
						<li>
							<span class="text-base-content/50 text-xs uppercase">Limitations:</span>
							<span class="font-mono text-sm">
								{recipe.limitations?.join(', ') ?? 'N/A'}
							</span>
						</li>
					</ul>
				</div>
			</details>
		</li>
	{:else}
		<p class="p-4">No recipes found.</p>
	{/each}
</ul>
