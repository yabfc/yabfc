<script lang="ts">
	import SearchInput from '@/components/shared/Search.svelte';
	import active from '@/stores/active.svelte';
	import { AnvilIcon } from '@lucide/svelte';

	let searchQuery = $state('');

	const filteredItems = $derived(
		active.profile?.items.filter(
			x =>
				x.getDisplayName().toLowerCase().includes(searchQuery.toLowerCase()) ||
				x.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
				x.category.includes(searchQuery.toLowerCase()),
		) ?? [],
	);
</script>

<SearchInput bind:value={searchQuery} />

<ul class="list">
	{#each filteredItems as item (item.id)}
		<li class="list-row p-0">
			<details class="collapse-arrow list-col-grow collapse" name="accordion-item-overview">
				<summary class="collapse-title select-none">
					<div class="flex">
						<AnvilIcon size="24" class="m-2 shrink-0" />

						<div>
							<div>{item.getDisplayName()}</div>
							<div class="text-xs font-semibold uppercase opacity-60">
								{item.category}
							</div>
						</div>
					</div>
				</summary>

				<div class="collapse-content">
					<ul class="px-2">
						<li>
							<span class="text-base-content/50 text-xs uppercase">Type:</span>
							<span class="font-mono text-sm">{item.type ?? 'N/A'}</span>
						</li>
						<li>
							<span class="text-base-content/50 text-xs uppercase">Stack Size:</span>
							<span class="font-mono text-sm">{item.stackSize ?? 'N/A'}</span>
						</li>
					</ul>
				</div>
			</details>
		</li>
	{:else}
		<p class="p-4 text-center">No items found.</p>
	{/each}
</ul>
