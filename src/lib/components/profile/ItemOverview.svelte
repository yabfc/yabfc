<script lang="ts">
	import SearchInput from '@/lib/components/shared/Search.svelte';
	import Profile from '@/lib/models/profile';
	import { AnvilIcon } from '@lucide/svelte';

	let { profile }: { profile: Profile } = $props();
	let searchQuery = $state('');

	const filteredItems = $derived(
		profile.items.filter(
			x =>
				x.getDisplayName().toLowerCase().includes(searchQuery.toLowerCase()) ||
				x.category.includes(searchQuery.toLowerCase()),
		),
	);

	let expandedId = $state('');
	const toggleId = (id: string) => {
		expandedId = expandedId === id ? '' : id;
	};
</script>

<SearchInput bind:value={searchQuery} />

<ul class="list">
	{#each filteredItems as item (item.id)}
		<li class="list-row">
			<div
				class="collapse-arrow list-col-grow collapse list-item"
				class:collapse-open={expandedId === item.id}
			>
				<button
					class="collapse-title hover:bg-base-200 flex gap-4 p-0"
					onclick={() => toggleId(item.id)}
				>
					<div class="">
						<AnvilIcon size="24" class="m-2" />
					</div>
					<div class="text-left">
						<div>{item.getDisplayName()}</div>
						<div class="text-xs font-semibold uppercase opacity-60">
							{item.category}
						</div>
					</div>
				</button>
				<div
					class="collapse-content bg-base-200 !p-2"
					class:hidden={expandedId !== item.id}
				>
					<div class="border-base-200">
						<div>
							<span class="text-xs uppercase opacity-50">Type:</span>
							<span class="font-mono text-sm">{item.type ?? 'N/A'}</span>
						</div>
						<div>
							<span class="text-xs uppercase opacity-50">Stack Size:</span>
							<span class="font-mono text-sm">{item.stackSize ?? 'N/A'}</span>
						</div>
					</div>
				</div>
			</div>
		</li>
	{:else}
		<p class="p-4 text-center">No items found.</p>
	{/each}
</ul>
