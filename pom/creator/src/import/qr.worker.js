import jsQR from './vendor/jsqr.js';
import {scanPixels} from './vendor/scan-pixels.js';
import {readLevelBytes} from './level-data.js';

self.onmessage = async ({data}) => {
  try {
    const bytes = scanPixels(data.rgba, data.width, data.height, jsQR);
    self.postMessage({result: await readLevelBytes(bytes)});
  } catch (error) {
    self.postMessage({error: error.message || 'This QR image could not be opened.'});
  }
};
