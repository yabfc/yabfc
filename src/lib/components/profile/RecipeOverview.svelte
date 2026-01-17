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
</script>

<SearchInput bind:value={searchQuery} />
<ul class="list">
	{#each filteredRecipes as recipe (recipe.id)}
		<li class="list-row">
			<div class="">
				<DrillIcon size="24" class="m-2" />
			</div>
			<div>
				<div>{recipe.getDisplayName()}</div>
				<div class="text-xs font-semibold uppercase opacity-60">
					<ArrowBigRightDashIcon size="16" class="inline" />
					{recipe.out.map(x => profile.getItemById(x.id)?.name ?? x.id).join(', ')}
				</div>
			</div>
		</li>
	{:else}
		<p class="p-4">No recipes found for this profile.</p>
	{/each}
</ul>
