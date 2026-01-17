<script lang="ts">
	import Profile from '@/lib/models/profile';
	import { AnvilIcon } from '@lucide/svelte';
	import SearchInput from '@/lib/components/shared/Search.svelte';

	let { profile }: { profile: Profile } = $props();
	let searchQuery = $state('');

	const filteredItems = $derived(
		profile.items.filter(
			x =>
				x.getDisplayName().toLowerCase().includes(searchQuery.toLowerCase()) ||
				x.category.includes(searchQuery.toLowerCase()),
		),
	);
</script>

<SearchInput bind:value={searchQuery} />
<ul class="list">
	{#each filteredItems as item (item.id)}
		<li class="list-row">
			<div class="">
				<AnvilIcon size="24" class="m-2" />
			</div>
			<div>
				<div>{item.getDisplayName()}</div>
				<div class="text-xs font-semibold uppercase opacity-60">
					{item.category}
				</div>
			</div>
		</li>
	{:else}
		<p class="p-4">No items found for this profile.</p>
	{/each}
</ul>
