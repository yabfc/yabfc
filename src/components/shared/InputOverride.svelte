<!--
@component
-->
<script lang="ts">
	import { RotateCcwIcon } from '@lucide/svelte';
	import { nanoid } from 'nanoid';

	type Props = {
		label: string;
		edit: boolean;
		value: number;
		draft: number;
		onChange: (value: number) => void;
		onReset: () => void;
		format: (value: number) => string;
	};

	let {
		label,
		edit,
		value,
		draft = $bindable(),
		onChange,
		onReset,
		format = (value: number) => String(value),
	}: Props = $props();

	const handleChange = () => {
		onChange(draft);
	};
</script>

<span>{label}:</span>

{#if edit}
	<div
		class="justify-self-start"
		class:tooltip={draft < 0}
		class:tooltip-open={draft < 0}
		data-tip="must be >= 0"
	>
		<input
			id={nanoid()}
			type="number"
			min="0"
			bind:value={draft}
			onchange={handleChange}
			class="input input-xs w-24"
			required
		/>
	</div>
	<button type="button" class="btn btn-ghost btn-xs px-1.5" onclick={onReset}>
		<RotateCcwIcon size="12" />
	</button>
{:else}
	<span>{format(value)}</span>
	<span></span>
{/if}
