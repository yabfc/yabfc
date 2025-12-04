export interface BaseItemIo {
	id: string;
	type: 'item' | 'fluid';
	amount: number;
}

export default interface Recipe {
	id: string;
	name?: string;
	default?: boolean;
	in: BaseItemIo[];
	out: BaseItemIo[];
	duration: number;
	category: string;
}
