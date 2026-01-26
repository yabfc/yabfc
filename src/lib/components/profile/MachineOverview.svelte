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
	let expandedId = $state('');
	const toggleId = (id: string) => {
		expandedId = expandedId === id ? '' : id;
	};
</script>

<SearchInput bind:value={searchQuery} />
<ul class="list">
	{#each filteredMachines as machine (machine.id)}
		<li class="list-row">
			<div
				class="collapse-arrow list-col-grow collapse list-item"
				class:collapse-open={expandedId === machine.id}
			>
				<button
					class="collapse-title hover:bg-base-200 flex gap-4 p-0"
					onclick={() => toggleId(machine.id)}
				>
					<div class="">
						<HammerIcon size="24" class="m-2" />
					</div>
					<div class="text-left">
						<div>{machine.getDisplayName()}</div>
						<div class="text-xs font-semibold uppercase opacity-60">
							{machine.recipeCategories}
						</div>
					</div>
				</button>
				<div
					class="collapse-content bg-base-200 !p-2"
					class:hidden={expandedId !== machine.id}
				>
					<div class="border-base-200">
						<div>
							<span class="text-xs uppercase opacity-50">Required Power:</span>
							<span class="font-mono text-sm">{machine.requiredPower ?? 'N/A'}</span>
						</div>
						<div>
							<span class="text-xs uppercase opacity-50">Features:</span>
							<span class="font-mono text-sm"
								>{machine.features.map(x => x.id) ?? 'N/A'}</span
							>
						</div>
					</div>
				</div>
			</div>
		</li>
	{:else}
		<p class="p-4">No machines found for this profile.</p>
	{/each}
</ul>
