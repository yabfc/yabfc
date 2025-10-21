import type Item from '@/lib/models/item';

export default interface Profile {
	id: string;
	name: string;
	items: Item[];
}
