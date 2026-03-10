/// <reference lib="webworker" />

import initHighs, { type HighsOptions, type HighsSolution } from 'highs';

type Req = {
	id: number;
	kind: 'solve';
	model: string;
	options?: HighsOptions;
};

type Res =
	| { id: number; ok: true; result: HighsSolution }
	| { id: number; ok: false; error: string };

let highsPromise: Promise<any> | null = null;

function getHighs() {
	if (!highsPromise) {
		highsPromise = initHighs({
			locateFile: (file: string) => (file.endsWith('.wasm') ? '/highs.wasm' : file),
		});
	}
	return highsPromise;
}

self.onmessage = async (ev: MessageEvent<Req>) => {
	const msg = ev.data;

	try {
		const highs = await getHighs();
		const result = highs.solve(msg.model, msg.options ?? {});
		(self as DedicatedWorkerGlobalScope).postMessage({
			id: msg.id,
			ok: true,
			result,
		} satisfies Res);
	} catch (e) {
		const error = e instanceof Error ? e.message : String(e);
		(self as DedicatedWorkerGlobalScope).postMessage({
			id: msg.id,
			ok: false,
			error,
		} satisfies Res);
	}
};
