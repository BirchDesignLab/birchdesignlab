/**
 * Mounts the Regulator over whatever page imports it. Lives in its own module
 * so the import graph keeps the instrument in a chunk of its own: pages fetch
 * this only after deciding they want it.
 */
import { mount, type Component } from 'svelte';
import RegulatorIsland from './Regulator.svelte';

export type RegulatorSurface = 'stage' | 'overlay';

// Astro's ambient .svelte declaration types every Svelte import as an Astro
// component factory. That is right inside templates and wrong here, where the
// component is mounted from script: the runtime export is the Svelte component
// itself, so this cast is the honest description of what is imported.
const Regulator = RegulatorIsland as unknown as Component<{ surface: RegulatorSurface }>;

export function mountRegulator(surface: RegulatorSurface = 'overlay') {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return mount(Regulator, { target: host, props: { surface } });
}
