<script lang="ts">
	type Props = {
		value: number;
	};

	let { value = $bindable() }: Props = $props();

	function divideBy(factor: number) {
		if (value === 0) return;
		value /= factor;
	}

	function multiplyBy(factor: number) {
		value *= factor;
	}
</script>

<div class={`mt-1 grid grid-cols-2 gap-1`}>
	<button type="button" class="btn btn-xs nodrag nopan" onclick={() => divideBy(2)}> :2 </button>
	<button type="button" class="btn btn-xs nodrag nopan" onclick={() => multiplyBy(2)}>
		x2
	</button>
	<button type="button" class="btn btn-xs nodrag nopan" onclick={() => divideBy(4)}> :4 </button>
	<button type="button" class="btn btn-xs nodrag nopan" onclick={() => multiplyBy(4)}>
		x4
	</button>
</div>
