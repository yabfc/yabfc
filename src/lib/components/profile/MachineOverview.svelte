<script lang="ts">
	import Profile from '@/lib/models/profile';
	import { HammerIcon } from '@lucide/svelte';
	import SearchInput from '@/lib/components/shared/Search.svelte';

	let { profile }: { profile: Profile } = $props();
	let searchQuery = $state('');

	const filteredMachines = $derived(
		profile.machines.filter(
			x =>
				x.getDisplayName().toLowerCase().includes(searchQuery.toLowerCase()) ||
				x.recipeCategories.some(x => x.includes(searchQuery.toLowerCase())),
		),
	);
</script>

<SearchInput bind:value={searchQuery} />
<ul class="list">
	{#each filteredMachines as machine (machine.id)}
		<li class="list-row">
			<div class="">
				<HammerIcon size="24" class="m-2" />
			</div>
			<div>
				<div>{machine.getDisplayName()}</div>
				<div class="text-xs font-semibold uppercase opacity-60">
					{machine.recipeCategories}
				</div>
			</div>
		</li>
	{:else}
		<p class="p-4">No machines found for this profile.</p>
	{/each}
</ul>
