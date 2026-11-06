import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apply } from '../index.js';

function makeSessionController() {
  let next = 0;
  const prompts = [];
  const renamed = [];
  return {
    prompts,
    renamed,
    async create() {
      next += 1;
      return { sessionId: `session-repair-${next}` };
    },
    async rename(request) {
      renamed.push(request);
      return { title: request.title, seq: 1 };
    },
    async state() {
      return { running: false, active: false, cursor: 0 };
    },
    async prompt(request) {
      prompts.push(request);
      return { accepted: true };
    },
    cancel() {
      return { accepted: true };
    },
  };
}

function makeFakeContext({ sessionController, defaultCwd }) {
  const effects = [];
  const tools = new Map();
  const sections = [];
  const routes = [];
  const services = {
    workingDirectory: { defaultDirectory: defaultCwd },
    sessionController,
    connection: {
      fetch: {
        register(route) {
          routes.push(route);
          return async () => {};
        },
      },
    },
  };
  const ctx = {
    connection: services.connection,
    logger: {
      info() {},
      warn() {},
      error() {},
    },
    effect(fn) {
      const cleanup = fn();
      effects.push(cleanup);
      return cleanup;
    },
    inject(names, callback) {
      if (names.every((name) => services[name] !== undefined)) callback(ctx);
    },
    get(name) {
      return services[name];
    },
    tools: {
      register(definition) {
        tools.set(definition.name, definition);
        return () => tools.delete(definition.name);
      },
      get(name) {
        return tools.get(name);
      },
    },
    systemPrompt: {
      section(section) {
        sections.push(section);
        return () => {};
      },
      getSectionOrder() {
        return 100;
      },
    },
  };
  return { ctx, tools, sections, routes, effects };
}

async function waitFor(predicate, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = predicate();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Timed out waiting for condition.');
}

test('Um host plugin: runs healthy checks silently and repairs failures', async (t) => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-plugin-um-test-'));
  t.after(async () => {
    await fs.rm(home, { recursive: true, force: true });
  });

  const sessionController = makeSessionController();
  const { ctx, tools, sections, routes, effects } = makeFakeContext({
    sessionController,
    defaultCwd: home,
  });
  const plugin = apply(ctx, {
    statePath: path.join(home, 'state.json'),
    defaultCwd: home,
    maxConcurrentRuns: 1,
  });
  t.after(() => {
    for (const cleanup of effects) {
      if (typeof cleanup === 'function') cleanup();
    }
  });

  await plugin.ready;

  const healthy = await plugin.saveMachine({
    name: 'Healthy check',
    command: 'exit 0',
    intervalSeconds: 300,
  });
  await waitFor(() => {
    const machine = plugin.state().machines.find((candidate) => candidate.id === healthy.id);
    return machine?.lastRunAt != null && typeof machine.repairSessionId === 'string';
  });
  const healthyMachine = plugin.state().machines.find((machine) => machine.id === healthy.id);
  assert.equal(healthyMachine.lastExit, 0);
  assert.equal(healthyMachine.lastOutcome, 'healthy');
  assert.equal(sessionController.prompts.length, 0);
  assert.equal(typeof healthyMachine.repairSessionId, 'string');
  assert.equal(healthyMachine.repairTitle, '终极机器 · Healthy check');

  const failing = await plugin.saveMachine({
    name: 'Failing check',
    command: 'echo boom >&2; exit 3',
    intervalSeconds: 300,
    intent: 'Keep the failing condition visible.',
  });
  await waitFor(() => plugin.state().machines.find((machine) => machine.id === failing.id)?.lastRunAt != null);
  const failingMachine = plugin.state().machines.find((machine) => machine.id === failing.id);
  assert.equal(failingMachine.lastExit, 3);
  assert.equal(failingMachine.lastOutcome, 'failing');
  assert.equal(sessionController.prompts.length, 1);
  const prompt = sessionController.prompts[0];
  assert.equal(prompt.sessionId, failingMachine.repairSessionId);
  assert.match(prompt.content[0].text, /终极机器·Failing check/);
  assert.match(prompt.content[0].text, /exit=3/);
  assert.match(prompt.content[0].text, /boom/);
  assert.equal(failingMachine.repairRequests, 1);

  await plugin.setEnabled(failing.id, false);
  const paused = plugin.state().machines.find((machine) => machine.id === failing.id);
  assert.equal(paused.enabled, false);
  await assert.rejects(
    () => plugin.runMachine(failing.id, { wait: true }),
    /paused/,
  );

  await plugin.setEnabled(failing.id, true);
  await plugin.saveMachine({ id: failing.id, command: 'exit 0' });
  const repaired = await plugin.runMachine(failing.id, { trigger: 'manual', wait: true });
  assert.equal(repaired.outcome, 'healthy');
  assert.equal(repaired.exitCode, 0);

  const listed = await plugin.listMachines();
  assert.equal(listed.machines.length, 2);
  assert.equal(listed.summary.total, 2);
  assert.equal(listed.summary.tokenFreeRuns, 3);

  const fetched = await plugin.getMachine(failing.id, { includeRuns: true, runLimit: 5 });
  assert.equal(fetched.id, failing.id);
  assert.ok(Array.isArray(fetched.runs));
  assert.ok(fetched.runs.length >= 2);
  assert.equal(fetched.runs[0].outcome, 'healthy');

  assert.ok(routes.length >= 1);
  const listResponse = await routes[0].fetch(new Request('http://localhost/api/dsh-plugin-um', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'list' }),
  }));
  const listBody = await listResponse.json();
  assert.equal(listBody.ok, true);
  assert.equal(listBody.value.machines.length, 2);

  const saveResponse = await routes[0].fetch(new Request('http://localhost/api/dsh-plugin-um', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'save',
      machine: { name: 'Route check', command: 'exit 0', intervalSeconds: 300 },
    }),
  }));
  const saveBody = await saveResponse.json();
  assert.equal(saveBody.ok, true);
  assert.equal(saveBody.value.name, 'Route check');

  const deleted = await plugin.deleteMachine(saveBody.value.id);
  assert.equal(deleted.deleted, true);
  assert.equal(plugin.state().machines.length, 2);

  assert.ok(tools.get('um_list_machines'));
  assert.ok(tools.get('um_get_machine'));
  assert.ok(tools.get('um_set_machine'));
  assert.ok(tools.get('um_delete_machine'));
  assert.ok(tools.get('um_run_machine'));
  const toolList = await tools.get('um_list_machines').execute({}, {});
  assert.equal(toolList.total, 2);
  assert.ok(sections.some((section) => section.name === 'dsh-plugin-um'));
});
