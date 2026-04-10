<!--
@component
-->

<script lang="ts">
	import Dialog from '@/components/shared/Dialog.svelte';
	import { NumberFormatter } from '@/lib/format/number';
	import type { MachineConfiguration } from '@/lib/models/factory';
	import active from '@/stores/active.svelte';
	import alerts from '@/stores/alerts.svelte';
	import { PlusIcon, Trash2Icon } from '@lucide/svelte';
	import { nanoid } from 'nanoid';
	import InputOverride from '@/components/shared/InputOverride.svelte';

	type Props = {
		dialog?: HTMLDialogElement;
		config?: MachineConfiguration;
		onChange: () => void;
	};

	let { dialog = $bindable(), config = $bindable(), onChange }: Props = $props();
	let selectedEffect = $state<string>();
	const machine = $derived(config ? active.profile?.getMachineById(config.machineId) : undefined);

	const formatter = new NumberFormatter(undefined, { maximumFractionDigits: 4 });

	const [selectableEffects, slots] = $derived.by(() => {
		if (!active.profile || !machine) return [undefined, undefined];
		const effects = machine.getAllowedEffectModules(active.profile.machineEffects);
		if (effects.length === 0) return [undefined, undefined];
		const slots = machine.features.reduce((acc, x) => acc + x.itemSlots, 0);
		return [effects, slots];
	});

	const usedEffects = $derived(config?.effects);

	const [speedSum, productivitySum] = $derived.by(() => {
		if (!usedEffects || !machine || !active.profile || !config) return [undefined, undefined];
		let speed = machine.getBaseCraftingSpeed(active.profile.machineEffects) * config.speed,
			productivity = 1 * config.productivity;
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
		if (!active.profile || !config || !selectedEffect || !slots) return;
		const pickedEffect = active.profile.getEffectModuleById(selectedEffect);
		if (!pickedEffect) return;
		if (slots <= config.effects.length) {
			alerts.push('All effect slots are full', 'ERROR');
			return;
		}
		config.effects.push({ id: nanoid(), effect: pickedEffect });
	};

	function deleteEffect(id: string) {
		if (!active.profile || !config || !selectedEffect || !slots) return;
		config.effects = config.effects.filter(x => x.id !== id);
	}

	let editModifier = $state(false),
		speedOverride = $state(0),
		productivityOverride = $state(0);

	type ModifierKey = 'speed' | 'productivity';

	const applyModifierOverride = (
		key: ModifierKey,
		currentSum: number | null | undefined,
		overrideValue: number,
	) => {
		if (!config || currentSum == null) return;

		if (currentSum === 0) {
			config[key] = overrideValue;
		} else {
			config[key] = (overrideValue / currentSum) * config[key];
		}
	};

	const resetModifier = (key: ModifierKey) => {
		if (!config) return;
		config[key] = 1;
	};

	const onSpeedOverride = () => applyModifierOverride('speed', speedSum, speedOverride);
	const onProductivityOverride = () =>
		applyModifierOverride('productivity', productivitySum, productivityOverride);

	const onSpeedReset = () => resetModifier('speed');
	const onProductivityReset = () => resetModifier('productivity');

	const onEditModifier = () => {
		editModifier = !editModifier;

		if (editModifier) {
			speedOverride = Number((speedSum ?? 0).toFixed(6));
			productivityOverride = Number((productivitySum ?? 0).toFixed(6));
		}
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
			<div class="w-full pt-4">
				<div class="flex items-center justify-between">
					<p class="text-base-content/60 text-sm uppercase">Applied Modifiers</p>
					<label class="label">
						<input
							type="checkbox"
							class="toggle toggle-xs duration-50"
							checked={editModifier}
							onchange={onEditModifier}
						/>
					</label>
				</div>
				<div
					class="text-base-content/80 grid auto-rows-min grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 text-xs"
				>
					<InputOverride
						label={'Speed'}
						edit={editModifier}
						value={speedSum ?? 0}
						bind:draft={speedOverride}
						onChange={onSpeedOverride}
						onReset={onSpeedReset}
						format={value => formatter.format(value)}
					/>
					<InputOverride
						label={'Productivity'}
						edit={editModifier}
						value={productivitySum ?? 0}
						bind:draft={productivityOverride}
						onChange={onProductivityOverride}
						onReset={onProductivityReset}
						format={value => formatter.format(value)}
					/>

					{#if machine}
						<span>Power:</span>
						<span
							>{formatter.formatPower(machine.getPowerConsumption(usedEffects || []))} (per
							machine)</span
						>
					{/if}
				</div>
			</div>

			<div class="w-full pt-4">
				<p class="text-base-content/60 pt-1 text-sm uppercase">
					Used Effects ({usedEffects?.length ?? 0}/{slots ?? 0})
				</p>
				<ul class="list text-base-content/80 flex w-full flex-col gap-1 text-xs">
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
					<select bind:value={selectedEffect} class="select select-xs join-item w-full">
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
