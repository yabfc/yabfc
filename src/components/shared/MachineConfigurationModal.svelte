<!--
@component
-->

<script lang="ts">
	import Dialog from '@/components/shared/Dialog.svelte';
	import type { MachineConfiguration } from '@/lib/models/factory';
	import active from '@/stores/active.svelte';
	import { PlusIcon } from '@lucide/svelte';

	type Props = {
		dialog?: HTMLDialogElement;
		config?: MachineConfiguration;
		onChange: () => void;
	};

	let { dialog = $bindable(), config = $bindable(), onChange }: Props = $props();
	let effect = $state<string>();
	const machine = $derived(config ? active.profile?.getMachineById(config.machineId) : undefined);

	const selectableEffects = $derived.by(() => {
		if (!active.profile || !machine) return undefined;
		const effects = machine.getAllowedEffectMoules(active.profile.machineEffects);
		if (effects.length === 0) return undefined;
		return effects;
	});

	const usedEffects = $derived(config?.effects);

	const addEffect = () => {
		if (!machine || !active.profile || !config || !effect) return;
		const pickedEffect = active.profile.getEffectModuleById(effect);
		if (!pickedEffect) return;
		config.effects.push({ effect: pickedEffect });
	};
</script>

<Dialog bind:dialog extraClass="max-w-xs">
	{#if config}
		<h3 class="text-lg font-bold">Edit machine configuration</h3>

		<div class="text-base-content/60 pt-1 text-sm">
			{machine?.getDisplayName()}
		</div>

		<div class="flex flex-col gap-4 pt-4">
			<label class="floating-label">
				<span>Amount</span>
				<input
					type="number"
					bind:value={config.machineCount}
					onchange={onChange}
					min="1"
					step="1"
					class="input input-bordered w-full"
				/>
			</label>

			<label class="floating-label">
				<span>{active.profile?.getSpeedOverrideName()}</span>
				<input
					type="number"
					bind:value={config.speed}
					onchange={onChange}
					min="0"
					step="0.1"
					class="input input-bordered w-full"
				/>
			</label>

			<label class="floating-label">
				<span>{active.profile?.getProductivityOverrideName()}</span>
				<input
					type="number"
					bind:value={config.productivity}
					onchange={onChange}
					min="0"
					step="0.1"
					class="input input-bordered w-full"
				/>
			</label>

			<div class="w-full pt-4">
				<p class="text-base-content/60 pt-1 text-sm uppercase">Used Effects</p>
				<ul>
					{#each usedEffects as choice}
						<li
							class="text-base-content/80 grid grid-cols-[1fr_auto] items-center gap-x-4 text-xs"
						>
							<span>{choice.effect.getDisplayName()}</span>
							{#if choice.scaling}
								<span>scaling: {choice.scaling}</span>
							{/if}
						</li>
					{:else}
						<li class="text-base-content/80 text-xs">No effect used</li>
					{/each}
				</ul>
			</div>

			{#if selectableEffects}
				<div class="join w-full pt-4">
					<select bind:value={effect} class="select select-xs join-item w-full">
						<option disabled value="">Select effect</option>
						{#each selectableEffects as effect}
							<option value={effect.id}>{effect.getDisplayName()}</option>
						{/each}
					</select>

					<button onclick={addEffect} class="btn btn-xs btn-soft join-item"
						><PlusIcon size="13" />
					</button>
				</div>
			{/if}
		</div>
	{/if}
</Dialog>
