<!--
@component
-->

<script lang="ts">
	import Dialog from '@/components/shared/Dialog.svelte';
	import type { MachineConfiguration } from '@/lib/models/factory';
	import active from '@/stores/active.svelte';
	import alerts from '@/stores/alerts.svelte';
	import { PlusIcon, Trash2Icon } from '@lucide/svelte';
	import { nanoid } from 'nanoid';

	type Props = {
		dialog?: HTMLDialogElement;
		config?: MachineConfiguration;
		onChange: () => void;
	};

	let { dialog = $bindable(), config = $bindable(), onChange }: Props = $props();
	let effect = $state<string>();
	const machine = $derived(config ? active.profile?.getMachineById(config.machineId) : undefined);

	const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 });

	const [selectableEffects, slots] = $derived.by(() => {
		if (!active.profile || !machine) return [undefined, undefined];
		const effects = machine.getAllowedEffectModules(active.profile.machineEffects);
		if (effects.length === 0) return [undefined, undefined];
		const slots = machine.features.reduce((acc, x) => acc + x.itemSlots, 0);
		return [effects, slots];
	});

	const usedEffects = $derived(config?.effects);

	const [speedSum, productivitySum] = $derived.by(() => {
		if (!usedEffects || !machine || !active.profile) return [undefined, undefined];
		let speed = machine.getBaseCraftingSpeed(active.profile.machineEffects),
			productivity = 1;
		usedEffects.forEach(choice => {
			const scaling = choice.scaling ?? 1;
			choice.effect.modifiers.forEach(modifier => {
				if (modifier.id === 'speed') {
					speed *= (modifier.value ?? 1) * scaling;
				} else if (modifier.id === 'productivity') {
					productivity *= (modifier.value ?? 1) * scaling;
				}
			});
		});
		return [speed, productivity];
	});

	const addEffect = () => {
		if (!active.profile || !config || !effect || !slots) return;
		const pickedEffect = active.profile.getEffectModuleById(effect);
		if (!pickedEffect) return;
		if (slots <= config.effects.length) {
			alerts.push('All effect slots are full', 'ERROR');
			return;
		}
		config.effects.push({ id: nanoid(), effect: pickedEffect });
	};

	function deleteEffect(id: string) {
		if (!active.profile || !config || !effect || !slots) return;
		config.effects = config.effects.filter(x => x.id !== id);
	}
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
			<div class="w-full pt-4">
				<p class="text-base-content/60 pt-1 text-sm uppercase">Applied Modifiers</p>
				<div class="text-base-content/80 grid grid-cols-[auto_1fr] gap-x-2 text-xs">
					{#if speedSum}
						<span>{active.profile?.getSpeedOverrideName() || 'speed'}</span>
						<span>{formatter.format(speedSum)}</span>
					{/if}
					{#if productivitySum}
						<span
							>{active.profile?.getProductivityOverrideName() ||
								'productivity'}:</span
						>
						<span>{formatter.format(productivitySum)}</span>
					{/if}
				</div>
			</div>

			<div class="w-full pt-4">
				<p class="text-base-content/60 pt-1 text-sm uppercase">
					Used Effects ({usedEffects?.length ?? 0}/{slots ?? 0})
				</p>
				<ul class="text-base-content/80 flex w-full flex-col gap-1 text-xs">
					{#each usedEffects as choice}
						<li class="flex items-center justify-between gap-2">
							<div class="grid flex-1 grid-cols-[170px_1fr] items-center gap-x-2">
								<span class="truncate">{choice.effect.getDisplayName()}</span>
								{#if choice.scaling}
									<span>scaling: {choice.scaling}</span>
								{/if}
							</div>
							<button
								class="btn btn-ghost btn-xs btn-square text-error shrink-0"
								onclick={() => deleteEffect(choice.id)}
							>
								<Trash2Icon size="12" />
							</button>
						</li>
					{:else}
						<li>No effect used</li>
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
