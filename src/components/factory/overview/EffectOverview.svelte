<script lang="ts">
	import SearchInput from '@/components/shared/Search.svelte';
	import active from '@/stores/active.svelte';
	import { HammerIcon } from '@lucide/svelte';

	let searchQuery = $state('');

	const filteredEffects = $derived(
		active.profile?.machineEffects.filter(
			x =>
				!x.hidden &&
				(x.getDisplayName().toLowerCase().includes(searchQuery.toLowerCase()) ||
					x.id.toLowerCase().includes(searchQuery.toLowerCase())),
		) ?? [],
	);
</script>

<SearchInput bind:value={searchQuery} />

<ul class="list">
	{#each filteredEffects as effect (effect.id)}
		<li class="list-row p-0">
			<details
				class="collapse-arrow list-col-grow collapse"
				name="accordion-machine-overview"
			>
				<summary class="collapse-title select-none">
					<div class="flex">
						<HammerIcon size="24" class="m-2 shrink-0" />

						<div>
							<div>{effect.getDisplayName()}</div>
							<div class="text-xs font-semibold uppercase opacity-60">
								{effect.getAllModifierIds().join(', ')}
							</div>
						</div>
					</div>
				</summary>

				<div class="collapse-content">
					<ul class="px-2">
						{#each effect.modifiers as modifier (modifier.id)}
							<li class="grid grid-cols-[1fr_auto] items-center gap-x-4">
								<span class="text-base-content/50 text-xs uppercase">
									{modifier.getDisplayName()}
								</span>
								<span class="text-right font-mono text-sm">
									{#if modifier.valueScaling === 'exponential'}
										x<sup>{modifier.value}</sup>
									{:else if modifier.modifiable}
										{modifier.minValue} - {modifier.maxValue}
									{:else}
										{modifier.value}
									{/if}
								</span>
							</li>
						{/each}
					</ul>
				</div>
			</details>
		</li>
	{:else}
		<p class="p-4">No effects found.</p>
	{/each}
</ul>
