<script lang="ts">
	import SearchInput from '@/lib/components/shared/Search.svelte';
	import active from '@/lib/stores/active.svelte';
	import { HammerIcon } from '@lucide/svelte';

	let searchQuery = $state('');

	const filteredMachines = $derived(
		active.profile?.machines.filter(
			x =>
				x.getDisplayName().toLowerCase().includes(searchQuery.toLowerCase()) ||
				x.recipeCategories.some(x => x.includes(searchQuery.toLowerCase())),
		) ?? [],
	);
</script>

<SearchInput bind:value={searchQuery} />

<ul class="list">
	{#each filteredMachines as machine (machine.id)}
		<li class="list-row p-0">
			<details
				class="collapse-arrow list-col-grow collapse"
				name="accordion-machine-overview"
			>
				<summary class="collapse-title select-none">
					<div class="flex">
						<HammerIcon size="24" class="m-2" />

						<div>
							<div>{machine.getDisplayName()}</div>
							<div class="text-xs font-semibold uppercase opacity-60">
								{machine.recipeCategories}
							</div>
						</div>
					</div>
				</summary>

				<div class="collapse-content">
					<ul class="px-2">
						<li>
							<span class="text-base-content/50 text-xs uppercase">
								Required Power:
							</span>
							<span class="font-mono text-sm">{machine.requiredPower ?? 'N/A'}</span>
						</li>
						<li>
							<span class="text-base-content/50 text-xs uppercase">Features:</span>
							<span class="font-mono text-sm">
								{machine.features.map(x => x.id).join(', ') ?? 'N/A'}
							</span>
						</li>
					</ul>
				</div>
			</details>
		</li>
	{:else}
		<p class="p-4">No machines found.</p>
	{/each}
</ul>
