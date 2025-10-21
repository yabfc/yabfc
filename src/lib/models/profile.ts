import type Machine from '@/lib/models/machine';
import type Item from '@/lib/models/item';
import type Recipe from '@/lib/models/recipe';
import type EffectModule from '@/lib/models/effect';

export default interface Profile {
	id: string;
	name: string;
	items: Item[];
	recipes: Recipe[];
	machines: Machine[];
	machineEffects: EffectModule[];
}
