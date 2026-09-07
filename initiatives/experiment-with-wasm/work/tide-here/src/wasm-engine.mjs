import {newQuickJSWASMModuleFromVariant} from 'quickjs-emscripten-core';
import variant from '@jitl/quickjs-singlefile-browser-release-sync';

export async function createEngine(guestSource) {
  const module = await newQuickJSWASMModuleFromVariant(variant);
  const vm = module.newContext();
  vm.runtime.setMemoryLimit(64 * 1024 * 1024);
  vm.runtime.setMaxStackSize(1024 * 1024);
  let deadline = Infinity;
  vm.runtime.setInterruptHandler(() => Date.now() > deadline);
  function evaluate(code) {
    const result = vm.evalCode(code, 'tide-here.js');
    if (result.error) {
      const error = vm.dump(result.error);
      result.error.dispose();
      throw new Error(error.message || 'Tide calculation failed.');
    }
    try { return vm.dump(result.value); } finally { result.value.dispose(); }
  }
  try { evaluate(guestSource); } catch (error) { vm.dispose(); throw error; }
  return {
    predict(input) {
      deadline = Date.now() + 20000;
      try { return JSON.parse(evaluate(`JSON.stringify(TideGuest.predict(${JSON.stringify(input)}))`)); }
      finally { deadline = Infinity; }
    },
    dispose() { vm.dispose(); }
  };
}
