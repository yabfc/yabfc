<script lang="ts">
	import Profile from '@/lib/models/profile';
	import { ArrowBigRightDashIcon, DrillIcon } from '@lucide/svelte';
	import SearchInput from '@/lib/components/shared/Search.svelte';

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
	let expandedId = $state('');
	const toggleId = (id: string) => {
		expandedId = expandedId === id ? '' : id;
	};
</script>

<SearchInput bind:value={searchQuery} />
<ul class="list">
	{#each filteredRecipes as recipe (recipe.id)}
		<li class="list-row">
			<div
				class="collapse-arrow list-col-grow collapse list-item"
				class:collapse-open={expandedId === recipe.id}
			>
				<button
					class="collapse-title hover:bg-base-200 flex gap-4 p-0"
					onclick={() => toggleId(recipe.id)}
				>
					<div class="">
						<DrillIcon size="24" class="m-2" />
					</div>
					<div class="text-left">
						<div>{recipe.getDisplayName()}</div>
						<div class="text-xs font-semibold uppercase opacity-60">
							<ArrowBigRightDashIcon size="16" class="inline" />
							{recipe.out
								.map(x => profile.getItemById(x.id)?.name ?? x.id)
								.join(', ')}
						</div>
					</div>
				</button>
				<div
					class="collapse-content bg-base-200 !p-2"
					class:hidden={expandedId !== recipe.id}
				>
					<div class="border-base-200">
						<div>
							<span class="text-xs uppercase opacity-50">Category:</span>
							<span class="font-mono text-sm">{recipe.category ?? 'N/A'}</span>
						</div>
						<div>
							<span class="text-xs uppercase opacity-50">Duration:</span>
							<span class="font-mono text-sm">{recipe.duration ?? 'N/A'}</span>
						</div>
						<div>
							<span class="text-xs uppercase opacity-50">Limitations:</span>
							<span class="font-mono text-sm">{recipe.limitations ?? 'N/A'}</span>
						</div>
					</div>
				</div>
			</div>
		</li>
	{:else}
		<p class="p-4">No recipes found for this profile.</p>
	{/each}
</ul>
