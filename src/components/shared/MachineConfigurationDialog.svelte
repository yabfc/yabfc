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
	import { recalculateEdgeAmounts } from '@/lib/factory/edge';
	import factory from '@/stores/factory.svelte';
	import { formattedLimitations } from '@/lib/format/limitation';

	type Props = {
		dialog?: HTMLDialogElement;
		config?: MachineConfiguration;
		onChange: () => void;
	};

	let { dialog = $bindable(), config = $bindable(), onChange }: Props = $props();
	let selectedEffect = $state(''),
		selectedQuality = $state('');
	const machine = $derived(config ? active.profile?.getMachineById(config.machineId) : undefined);

	const formatter = new NumberFormatter(undefined, { maximumFractionDigits: 4 });

	const selectableQualities = $derived.by(() => {
		if (!active.profile || !machine) return undefined;
		return machine.getQualityTiers(active.profile.machineEffects);
	});

	const [selectableEffects, slots] = $derived.by(() => {
		if (!active.profile || !machine) return [undefined, undefined];
		const effects = machine
			.getAllowedEffectModules(active.profile.machineEffects)
			.filter(x => !x.hidden && !(x.singleUse && (usedEffectIds ?? []).includes(x.id)));
		if (effects.length === 0) return [undefined, undefined];
		const slots = machine.features.reduce((acc, x) => acc + x.itemSlots, 0);
		if (slots === 0) return [effects, undefined];
		return [effects, slots];
	});

	const usedEffects = $derived(config?.effects);
	const usedEffectIds = $derived(config?.effects.map(x => x.effectId));
	const usedVisibleEffects = $derived.by(() => {
		return (usedEffects ?? []).filter(choice => {
			const effect = active.profile?.getEffectModuleById(choice.effectId);
			return effect && !effect.hidden;
		});
	});

	const [speedSum, productivitySum] = $derived.by(() => {
		if (!usedEffects || !machine || !active.profile || !config) return [undefined, undefined];
		let speed = machine.baseCraftingSpeed * config.speedOverride,
			productivity = 1 * config.productivityOverride;
		usedEffects.forEach(choice => {
			const scaling = choice.scaling ?? 1;
			const effect = active.profile?.getEffectModuleById(choice.effectId);
			if (!effect) return;
			effect.modifiers.forEach(modifier => {
				if (modifier.id === 'speed') {
					speed *= (modifier.value ?? 1) * scaling;
				} else if (modifier.id === 'productivity') {
					productivity *= (modifier.value ?? 1) * scaling;
				}
			});
		});
		return [speed, productivity];
	});

	$effect(() => {
		if (!config || speedSum == null || productivitySum == null || !active.profile) return;
		if (config.speed === speedSum && config.productivity === productivitySum) return;

		config.speed = speedSum;
		config.productivity = productivitySum;
		recalculateEdgeAmounts(active.profile, factory);
	});

	const addEffect = () => {
		if (!active.profile || !config || !selectedEffect || !slots) return;
		const pickedEffect = active.profile.getEffectModuleById(selectedEffect);
		if (!pickedEffect) return;
		if (slots <= config.effects.filter(x => x.id !== 'quality-tier').length) {
			alerts.push('All effect slots are full', 'ERROR');
			return;
		}
		config.effects.push({
			id: nanoid(),
			effectId: pickedEffect.id,
			...(pickedEffect.type !== 'fixed' ? { scaling: 1 } : {}),
		});

		// reset the selected effect since the picked Effect is now gone
		if (pickedEffect.singleUse) selectedEffect = '';
		// automatically select the last effect
		if (selectableEffects && selectableEffects.length === 1)
			selectedEffect = selectableEffects[0].id;
	};

	function deleteEffect(id: string) {
		if (!config) return;
		config.effects = config.effects.filter(x => x.id !== id);
		if (selectableEffects && selectableEffects.length === 1)
			selectedEffect = selectableEffects[0].id;
	}

	let editModifier = $state(false),
		speedOverride = $state(0),
		productivityOverride = $state(0);

	type ModifierKey = 'speedOverride' | 'productivityOverride';

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
		if (key === 'speedOverride') {
			speedOverride = Number(formatter.format(speedSum ?? 0));
		} else if (key === 'productivityOverride') {
			productivityOverride = Number(formatter.format(productivitySum ?? 0));
		}
	};

	const onSpeedOverride = () => applyModifierOverride('speedOverride', speedSum, speedOverride);
	const onProductivityOverride = () =>
		applyModifierOverride('productivityOverride', productivitySum, productivityOverride);

	const onSpeedReset = () => resetModifier('speedOverride');
	const onProductivityReset = () => resetModifier('productivityOverride');

	const onEditModifier = () => {
		editModifier = !editModifier;

		if (editModifier) {
			speedOverride = Number(formatter.format(speedSum ?? 0));
			productivityOverride = Number(formatter.format(productivitySum ?? 0));
		}
	};

	const onQualityChange = () => {
		if (!active.profile || !config) return;
		const pickedEffect = active.profile.getEffectModuleById(selectedQuality);
		if (!pickedEffect) return;
		config.effects = [
			...config.effects.filter(x => x.id !== 'quality-tier'),
			{
				id: 'quality-tier',
				effectId: pickedEffect.id,
			},
		];
	};
</script>

<Dialog bind:dialog extraClass="max-w-xs">
	{#if config}
		<h3 class="text-lg font-bold">Edit machine configuration</h3>

		<div class="text-base-content/60 pt-1 text-sm">
			{machine?.getDisplayName()}
		</div>

		<div class="flex flex-col gap-4 pt-4">
			<label class="floating-label" id="machineConfig-machineCount">
				<span>Amount</span>
				<input
					id="machineConfig-machineCount"
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
					<label class="label" id="machineConfig-toggleEdit">
						<input
							id="machineConfig-toggleEdit"
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
							>{formatter.formatPower(
								machine.getPowerConsumption(
									usedEffects ?? [],
									active.profile?.machineEffects ?? [],
								),
							)} (per machine)</span
						>
						<span></span>
						{#if selectableQualities}
							<span>Quality</span>
							<select
								id={nanoid()}
								bind:value={selectedQuality}
								onchange={onQualityChange}
								class="select select-xs join-item w-full"
							>
								<option disabled value="">Select quality</option>
								{#each selectableQualities as qualityTier}
									<option value={qualityTier.id}
										>{qualityTier.getDisplayName()}</option
									>
								{/each}
							</select>
						{/if}
					{/if}
				</div>
			</div>

			<div class="w-full pt-4">
				<p class="text-base-content/60 pt-1 text-sm uppercase">
					Used Effects {#if slots}({usedVisibleEffects?.length ?? 0}/{slots ?? 0})
					{/if}
				</p>
				<ul class="list text-base-content/80 flex w-full flex-col gap-1 text-xs">
					{#each usedVisibleEffects ?? [] as choice}
						{@const effect = active.profile?.getEffectModuleById(choice.effectId)}
						{#if effect}
							<li class="flex items-center justify-between gap-2">
								<div class="grid flex-1 grid-cols-[170px_1fr] items-center gap-x-2">
									<span class="truncate">{effect.getDisplayName()}</span>
									{#if choice.scaling != null}
										<input
											id={nanoid()}
											type="number"
											min={effect.minValue ?? 0}
											max={effect.maxValue ?? 10}
											step={effect.step ?? 0.1}
											bind:value={choice.scaling}
											class="input input-xs"
											required
										/>
									{/if}
								</div>
								<button
									class="btn btn-ghost btn-xs btn-square text-error shrink-0"
									onclick={() => deleteEffect(choice.id)}
								>
									<Trash2Icon size="12" />
								</button>
							</li>
						{/if}
					{:else}
						<li>No effect used</li>
					{/each}
				</ul>
			</div>
			{#if machine && machine.limitations}
				{#each formattedLimitations(machine.limitations) as limit}
					<div class="alert alert-warning alert-soft mt-2 w-full py-1 text-xs">
						<span class="-ml-1">{limit}</span>
					</div>
				{/each}
			{/if}

			{#if selectableEffects}
				<div class="join w-full pt-4">
					<select
						id={nanoid()}
						bind:value={selectedEffect}
						class="select select-xs join-item w-full"
					>
						<option disabled value="">Select effect</option>
						{#each selectableEffects as effect}
							<option value={effect.id}>{effect.getDisplayName()}</option>
						{/each}
					</select>

					<button onclick={addEffect} class="btn btn-xs btn-soft join-item"
						><PlusIcon size="13" />
					</button>
				</div>
			{:else}
				<p class="text-base-content/60 w-full items-center text-xs uppercase">
					no effects available for this machine
				</p>
			{/if}
		</div>
	{/if}
</Dialog>
