<script lang="ts">
	import SearchInput from '@/components/shared/Search.svelte';
	import active from '@/stores/active.svelte';
	import { AnvilIcon } from '@lucide/svelte';

	let searchQuery = $state('');

	const filteredConveyors = $derived(
		active.profile?.conveyors
			.filter(
				x =>
					x.getDisplayName().toLowerCase().includes(searchQuery.toLowerCase()) ||
					x.id.toLowerCase().includes(searchQuery.toLowerCase()),
			)
			.sort((a, b) => (a.speed < b.speed ? -1 : 1)),
	);
	const unit = active.profile ? active.profile.formatDefaultDuration() : 's';
	const multiplier = active.profile ? active.profile.settings.defaultDuration : 1;
</script>

<SearchInput bind:value={searchQuery} />

<ul class="list">
	{#each filteredConveyors as conveyor (conveyor.id)}
		<li class="list-row p-0">
			<details class=" list-col-grow collapse" name="accordion-item-overview">
				<summary class="collapse-title select-none">
					<div class="flex">
						<AnvilIcon size="24" class="m-2 shrink-0" />

						<div>
							<div>{conveyor.getDisplayName()}</div>
							<div class="text-xs font-semibold opacity-60">
								{conveyor.speed * multiplier} items / {unit}
							</div>
						</div>
					</div>
				</summary>
			</details>
		</li>
	{:else}
		<p class="p-4 text-center">No conveyors found.</p>
	{/each}
</ul>
