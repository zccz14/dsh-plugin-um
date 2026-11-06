import test from 'node:test';
import assert from 'node:assert/strict';

function loadClientModule() {
  let loaded;
  globalThis.window = {
    __ModuleLoader__: {
      load(entry) {
        loaded = entry;
      },
    },
  };
  const style = {
    dataset: {},
    textContent: '',
    remove() {
      this.removed = true;
    },
  };
  globalThis.document = {
    documentElement: { lang: 'zh' },
    head: {
      appendChild(node) {
        this.appended = node;
      },
    },
    body: {},
    createElement() {
      return style;
    },
    addEventListener() {},
    removeEventListener() {},
  };
  const react = {
    createElement() {
      return null;
    },
    useState() {
      return [undefined, () => {}];
    },
    useEffect() {},
    useMemo(fn) {
      return fn();
    },
    useRef() {
      return { current: null };
    },
    useCallback(fn) {
      return fn;
    },
  };
  const require = (name) => {
    if (name === 'react') return react;
    throw new Error(`unexpected require: ${name}`);
  };
  return { getLoaded: () => loaded, style, require };
}

test('client module registers the main panel and sidebar entry', async () => {
  const { getLoaded, style, require } = loadClientModule();
  await import('../client.js');
  const loaded = getLoaded();
  assert.ok(loaded, 'window.__ModuleLoader__.load was called');
  assert.equal(loaded.id, 'dsh-plugin-um');
  const module = loaded.factory(require);
  assert.equal(module.name, 'dsh-plugin-um');
  assert.deepEqual(module.inject, ['slots', 'locale']);

  const registered = [];
  const effects = [];
  const dictionaries = [];
  const ctx = {
    effect(fn) {
      const cleanup = fn();
      effects.push(cleanup);
      return cleanup;
    },
    locale: {
      register(ns, dicts) {
        dictionaries.push({ ns, dicts });
        return () => {};
      },
      bind(ns) {
        return (key) => key;
      },
      getSnapshot() {
        return { id: 'zh' };
      },
      subscribe() {
        return () => {};
      },
    },
    slots: {
      inject(slot, callback) {
        const cleanup = callback();
        return cleanup;
      },
      register(definition, component) {
        registered.push({ definition, component });
        return () => {};
      },
    },
  };
  module.apply(ctx);
  assert.equal(dictionaries.length, 1);
  assert.equal(dictionaries[0].ns, 'dsh-plugin-um');
  assert.equal(dictionaries[0].dicts.zh.panel, '终极机器');
  assert.equal(dictionaries[0].dicts.en.panel, 'Ultimate Machines');
  const main = registered.find((entry) => entry.definition.name === 'main');
  assert.equal(main.definition.key, 'ultimate-machines');
  const sidebar = registered.find((entry) => entry.definition.name === 'sidebar.panellist');
  assert.equal(sidebar.definition.id, 'ultimate-machines');
  assert.equal(sidebar.definition.order, 30);
  assert.equal(style.textContent.includes('.um-page'), true);
  assert.equal(style.textContent.includes('--dsw-alias-bg-mask-1'), true);
  assert.equal(style.textContent.includes('backdrop-filter:blur(10px)'), true);
  assert.equal(style.textContent.includes('.um-dialog-head:before'), true);
  assert.equal(style.removed, undefined);
  for (const cleanup of effects) {
    if (typeof cleanup === 'function') cleanup();
  }
  assert.equal(style.removed, true);
});
