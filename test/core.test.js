import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMachine,
  machineSummary,
  normalizeMachine,
  repairPrompt,
  summarizeMachines,
  updateMachine,
} from '../lib/core.js';

test('createMachine applies defaults and an immediate first schedule', () => {
  const machine = createMachine({ name: 'Disk check', command: 'exit 0' }, { now: 1_700_000_000_000 });
  assert.equal(machine.name, 'Disk check');
  assert.equal(machine.intervalSeconds, 300);
  assert.equal(machine.timeoutSeconds, 300);
  assert.equal(machine.enabled, true);
  assert.equal(machine.lastScheduledAt, null);
  assert.equal(machine.totalRuns, 0);
  assert.match(machine.id, /^um-/);
});

test('createMachine validates name, command, interval, and timeout', () => {
  assert.throws(() => createMachine({ name: '', command: 'exit 0' }), /name/);
  assert.throws(() => createMachine({ name: 'x', command: '  ' }), /command/);
  assert.throws(() => createMachine({ name: 'x', command: 'exit 0', intervalSeconds: 5 }), /intervalSeconds/);
  assert.throws(() => createMachine({ name: 'x', command: 'exit 0', timeoutSeconds: 0 }), /timeoutSeconds/);
});

test('updateMachine changes only provided fields and clears empty intent', () => {
  const machine = createMachine({
    name: 'Check',
    command: 'exit 0',
    intent: 'keep it true',
    intervalSeconds: 60,
  }, { now: 1 });
  const next = updateMachine(machine, { intent: '', intervalSeconds: 120 }, { now: 2 });
  assert.equal(next.intent, '');
  assert.equal(next.intervalSeconds, 120);
  assert.equal(next.command, machine.command);
  assert.equal(next.updatedAt, 2);
  assert.throws(() => updateMachine(machine, {}, { now: 3 }), /at least one field/);
});

test('repairPrompt carries the command, exit, intent, and success criterion', () => {
  const machine = createMachine({
    name: 'Disk check',
    command: 'test 1 -eq 0',
    intent: 'Ensure the disk is healthy.',
  });
  const prompt = repairPrompt(machine, {
    outcome: 'failing',
    exitCode: 1,
    signal: null,
    output: 'boom\n',
    timeoutSeconds: 300,
  });
  assert.match(prompt, /终极机器·Disk check/);
  assert.match(prompt, /exit=1/);
  assert.match(prompt, /Ensure the disk is healthy/);
  assert.match(prompt, /test 1 -eq 0/);
  assert.match(prompt, /boom/);
  assert.match(prompt, /um_run_machine/);
});

test('machineSummary treats a never-run machine as due now', () => {
  const machine = createMachine({ name: 'New', command: 'exit 0' }, { now: 1000 });
  const summary = machineSummary(machine, { now: 5000 });
  assert.equal(summary.status, 'never');
  assert.equal(summary.nextRunAt, 5000);
  assert.equal(summary.tokenFreeRuns, 0);
  assert.equal(sumrogate(summary), undefined);
});

test('summarizeMachines counts status and token-free runs', () => {
  const healthy = createMachine({ name: 'A', command: 'exit 0' }, { now: 1 });
  healthy.lastOutcome = 'healthy';
  healthy.totalRuns = 3;
  const failing = createMachine({ name: 'B', command: 'exit 0' }, { now: 1 });
  failing.lastOutcome = 'failing';
  failing.totalRuns = 2;
  const summary = summarizeMachines([healthy, failing], { now: 2 });
  assert.equal(summary.total, 2);
  assert.equal(summary.enabled, 2);
  assert.equal(summary.healthy, 1);
  assert.equal(summary.failing, 1);
  assert.equal(summary.tokenFreeRuns, 5);
});

test('normalizeMachine restores a stored machine', () => {
  const machine = createMachine({ name: 'Stored', command: 'exit 0' }, { now: 100 });
  const restored = normalizeMachine(JSON.parse(JSON.stringify({
    ...machine,
    lastOutcome: 'healthy',
    lastExit: 0,
    runs: [{
      id: 'run-1',
      machineId: machine.id,
      startedAt: 200,
      finishedAt: 210,
      durationMs: 10,
      trigger: 'schedule',
      exitCode: 0,
      outcome: 'healthy',
      output: '',
    }],
  })));
  assert.equal(restored.name, 'Stored');
  assert.equal(restored.lastOutcome, 'healthy');
  assert.equal(restored.runs.length, 1);
  assert.equal(restored.runs[0].exitCode, 0);
});

function sumrogate(value) {
  // Keep a tiny guard against accidental NaN leaking out of summary fields.
  for (const key of ['nextRunAt', 'totalRuns', 'healthyRuns']) {
    if (typeof value?.[key] === 'number' && Number.isNaN(value[key])) return key;
  }
  return undefined;
}
