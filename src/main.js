import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/instrument-sans';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './style.css';

// The page is complete without this: the 3D network is loaded afterwards,
// and if WebGL is unavailable the hero simply has no graphic.
import('./network.js')
  .then(({ startNetwork }) => startNetwork(document.getElementById('network')))
  .catch((err) => console.warn('3D network unavailable', err));
