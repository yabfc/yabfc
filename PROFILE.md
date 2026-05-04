## Relevant Magic // Noteworthy Values

### Machine Features

| id                 | what is it doing                                                                               | Example                                                                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crafting-speed-*` | Handles the base crafting speed of machines                                                    | Factorio: assembling-machine-1 has a crafting speed of 0.5                                                                                               |
| `idle-*`           | Handles idle power draw                                                                        | Factorio: all machines have a default power draw of 0.333 % from their normal power. This idle power draw does **not** scale with i.e efficiency effects |
| `quality-tiers`    | Handles the different quality tiers for machines in Factorio (& node purities in Satisfactory) | Factorio: different qualities (normal,rare,..,legendary); Satisfactory: different node purities (impure,normal,pure)                                     |

All of these are dynamic, i.e they just point to the actual Effects saved in the `machineEffects` element.

### Machine Effects

| field                   | what is it doing                              | Example                                                                                 |
| ----------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------- |
| `effect.allowedEffects` | Make other effects selectable for this effect | Factorio: quality for modules/effects (=> speed-module-1 can be of different qualities) |
