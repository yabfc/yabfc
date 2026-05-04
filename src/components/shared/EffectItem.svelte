<script lang="ts">
	import type { EffectChoice } from '@/lib/models/effect';
	import active from '@/stores/active.svelte';
	import { Trash2Icon } from '@lucide/svelte';
	import { nanoid } from 'nanoid';

	type Props = {
		choice: EffectChoice;
		deleteEffect: (effectId: string) => void;
		onQualityChange: (qualityId: string, choice?: EffectChoice) => void;
	};

	let { choice = $bindable(), deleteEffect, onQualityChange }: Props = $props();
	let selectedQuality = $state('');
	const currentEffect = $derived.by(() => {
		if (!active.profile) return;
		return active.profile.getEffectModuleById(choice.effectId);
	});
	const selectableQualities = $derived.by(() => {
		if (!currentEffect || !currentEffect.allowedEffects || !active.profile) return;
		return active.profile.machineEffects.filter(x =>
			currentEffect.allowedEffects?.includes(x.id),
		);
	});

	$effect(() => {
		if (!selectedQuality && selectableQualities && selectableQualities.length > 0) {
			const defaultQuality = selectableQualities.find(quality =>
				quality.modifiers?.some(modifier => modifier.value === 1),
			);
			selectedQuality = defaultQuality?.id ?? '';
		}
	});
</script>

{#if currentEffect && !currentEffect.hidden}
	<li class="flex items-center justify-between gap-2">
		<div class="grid flex-1 grid-cols-[170px_1fr] items-center gap-x-2">
			<span class="truncate">{currentEffect.getDisplayName()}</span>
			{#if choice.scaling != null}
				<input
					id={nanoid()}
					type="number"
					min={(currentEffect.minValue ?? 0) + (currentEffect.displayOffset ?? 0)}
					max={(currentEffect.maxValue ?? 10) + (currentEffect.displayOffset ?? 0)}
					step={currentEffect.step ?? 0.1}
					bind:value={choice.scaling}
					class="input input-xs"
					required
				/>
			{/if}
			{#if currentEffect.allowedEffects}
				<select
					id={nanoid()}
					bind:value={selectedQuality}
					onchange={() => onQualityChange(selectedQuality, choice)}
					class="select select-xs join-item w-full"
				>
					{#if selectedQuality === ''}
						<option disabled value="">Select quality</option>
					{/if}
					{#each selectableQualities as qualityTier}
						<option value={qualityTier.id}>{qualityTier.getDisplayName()}</option>
					{/each}
				</select>
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
