<!--
@component
-->

<script lang="ts">
	import Dialog from '@/components/shared/Dialog.svelte';
	import type { Edge } from '@/lib/models/factory';
	import active from '@/stores/active.svelte';
	import { TriangleAlertIcon, CheckIcon } from '@lucide/svelte';

	type Props = {
		dialog?: HTMLDialogElement;
		edge?: Edge;
	};

	let { dialog = $bindable(), edge = $bindable() }: Props = $props();
	let item = $derived.by(() => {
		if (!edge || !active.profile) return;
		return active.profile.getItemById(edge.itemId);
	});

	const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

	const conveyors = $derived.by(() => {
		if (!edge || !active.profile) return;
		const multiplier = active.profile ? active.profile.settings.defaultDuration : 1;
		const conveyors = active.profile.conveyors.map(conveyor =>
			conveyor.getSaturation(multiplier, edge.actualAmount),
		);
		return conveyors.sort((a, b) => (a.speed < b.speed ? -1 : 1));
	});
</script>

<Dialog bind:dialog extraClass="max-w-xs">
	{#if edge}
		<h3 class="text-lg font-bold">Edge information</h3>

		<div class="text-base-content/60 pt-1 text-sm">
			{#if item}
				{item.getDisplayName()}
			{:else}
				{edge.itemId}
			{/if}
		</div>
		<div
			class="text-base-content/80 grid flex-1 grid-cols-[auto_1fr] items-center gap-x-2 text-xs"
		>
			<p>Throughput:</p>
			<div class="text-right">
				{edge.actualAmount}
			</div>
		</div>
		{#if conveyors}
			<p class="text-base-content/60 pt-1 text-sm uppercase">Conveyor Saturation</p>

			<ul>
				{#each conveyors as conveyor}
					<li
						class="text-base-content/80 grid grid-cols-[auto_1fr_auto] items-center gap-2 text-xs"
					>
						<span>
							{active.profile?.getConveyorById(conveyor.id)?.getDisplayName() ??
								conveyor.id}:
						</span>
						<span class="text-right"
							>{formatter.format(conveyor.saturation * 100)}%</span
						>

						{#if conveyor.saturation <= 1}
							<div class="badge badge-success badge-xs h-3 min-h-3 px-1">
								<CheckIcon size="10" />
							</div>
						{:else}
							<div class="badge badge-warning badge-xs h-3 min-h-3 px-1">
								<TriangleAlertIcon size="10" />
							</div>
						{/if}
					</li>
				{:else}
					<li class="text-base-content/80">No conveyors available</li>
				{/each}
			</ul>
		{/if}
	{/if}
</Dialog>
