## Relevant Magic // Noteworthy Values

### Machine Features

| id                 | what is it doing                                                                               | Example                                                                                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crafting-speed-*` | Handles the base crafting speed of machines                                                    | Factorio: assembling-machine-1 has a crafting speed of 0.5                                                                                                                                                                                |
| `idle-*`           | Handles idle power draw                                                                        | Factorio: all machines have a default power draw of 0.333 % from their normal power. This idle power draw does **not** scale with i.e efficiency effects. This idle power draw also is excluded from the minimum power consumption of 20% |
| `quality-tiers`    | Handles the different quality tiers for machines in Factorio (& node purities in Satisfactory) | Factorio: different qualities (normal,rare,..,legendary); Satisfactory: different node purities (impure,normal,pure)                                                                                                                      |

All of these are dynamic, i.e they just point to the actual Effects saved in the `machineEffects` element.

### Machine Effects

| field                   | what is it doing                              | Example                                                                                 |
| ----------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------- |
| `effect.allowedEffects` | Make other effects selectable for this effect | Factorio: quality for modules/effects (=> speed-module-1 can be of different qualities) |

#### Effect Types

| type         | what is it doing                                                      | Example                                                                                                    |
| ------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `fixed`      | effect with static modifiers                                          | all standard factorio effect modules                                                                       |
| `stepped`    | effect has a min, max and step values                                 | summerslooping in satisfactory: value range 0-1 in steps of 0.25, 0.5 or 1 (each handled as unique effect) |
| `modifiable` | effect has a min and max value                                        | over/underclocking in satisfactory value range -1 - 1.5 (displayed as 0 - 2.5 via `effect.displayOffset`)  |
| `limited`    | effect to limit the used power either by a min or max value (or both) | used for enforcing the factorio minimum power consumption of 20%                                           |

`Fixed` effects are summed up while `stepped` and `modifiable` effects are multiplied with each other.

#### Modifier Types

| modifier       | what is it doing                                                 | Example                                                                         |
| -------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `speed`        | scales the in & output of a machine                              | 2 iron ore in, 2 iron ingots out -- value = 1 --> 4 iron ore in, 4 iron ore out |
| `productivity` | scales **only** the output of a machine                          | 2 iron ore in, 2 iron ingots out -- value = 1 --> 2 iron ore in, 4 iron ore out |
| `power`        | scales the power                                                 | 40 kW -- value = 1 --> 80 kW                                                    |
| `consumption`  | see `power` (is normalized during profile loading)               | see `power`                                                                     |
| `pollution`    | not in use, would give a hint about the total produced pollution | -                                                                               |
| `quality`      | not in use, would affect different qualities of produced items   | -                                                                               |

#### Modifier Specials

| field                               | what is it doing               | Example                                                                                                                                                                                                              |
| ----------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modifier.valueScaling=exponential` | Only used in power calculation | Satisfactory: over/underclocking, if a machine is overclocked to value x %, the used power will be multiplied by $ (\frac{x}{100})^{1.321929}$                                                                       |
| `modifier.valueScaling=squared`     | Only used in power calculation | Satisfactory: summerslooping, if a machine has 1 of 2 summersloops inserted, it produces 50% more output (factor of 1.5). The power multiplier is then calculated by squaring that output factor i.e $ 1.5^2=2.25 $. |

#### How effects are applied

Start with the machine’s base values, such as the `assembling-machine-2` crafting speed of 0.75 and productivity of 1.
If a quality is selected, apply its modifiers first. For example, an epic `assembling-machine-2` has its speed multiplied by 1.9:

$0.75 * 1.9 = 1.425$

After that, add together all other selected effects by type. For example, two speed-module-1 modules give:

- speed: +80%, or 0.8
- power: +100%, or 1.0

To apply these summed modifiers, add 1 before multiplying:
$$\text{final value} = \text{quality-adjusted value} * (1 + \text{summed modifier})$$

So the final crafting speed would be:
$1.425 * (1 + 0.8) = 2.565$

### Logistics

| field = value        | what is it doing              | Example                                                                                                                                                              |
| -------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `logistic.speed = 0` | this equals to no speed limit | Factorio: pipes do not have a static limit, maximum throughput depends on the pipe network and attached machines / tanks, see https://factorio.com/blog/post/fff-416 |
