export interface BaseItemIO {
	id: string;
	type: 'item' | 'fluid';
	amount: number;
}

export default interface Recipe {
	id: string;
	name?: string;
	in: BaseItemIO[];
	out: BaseItemIO[];
	duration: number;
	category: string;
}
