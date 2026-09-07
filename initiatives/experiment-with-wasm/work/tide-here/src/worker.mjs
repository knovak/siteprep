import {createEngine} from './wasm-engine.mjs';
import guestSource from 'tide:guest';
const engine = createEngine(guestSource);
engine.then(() => self.postMessage({ready: true})).catch(error => self.postMessage({error: error.message}));
self.onmessage = async ({data}) => {
  try { self.postMessage({id: data.id, events: (await engine).predict(data.input)}); }
  catch (error) { self.postMessage({id: data.id, error: error.message}); }
};
