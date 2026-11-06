/**
 * dsh-plugin-um — the Ultimate Machine for DeepSeek Harness.
 *
 * One Ultimate Machine is a shell command plus an interval. The Host runs the
 * command itself, with no model call in the loop, so healthy checks are
 * token-free and silent. A failing check is written into the machine's repair
 * Session, where an Agent can fix the underlying condition.
 */
import {
  AUTO_TITLE_PREFIX,
  LIMITS,
  UmInputError,
  createMachine,
  isRecord,
  machineSummary,
  nextRunAt,
  publicMachine,
  randomId,
  repairPrompt,
  runView,
  summarizeMachines,
  updateMachine,
} from './lib/core.js';
import { UltimateMachineStore, defaultStatePath } from './lib/store.js';
import { resolve } from 'node:path';
import { expandHome, resolveWorkingDirectory, runShellCommand } from './lib/runner.js';

const NS = 'dsh-plugin-um';
const API_PATH = '/api/dsh-plugin-um';
const TOOL_NAMES = [
  'um_list_machines',
  'um_get_machine',
  'um_set_machine',
  'um_delete_machine',
  'um_run_machine',
];

export const inject = ['tools', 'systemPrompt'];

function clampInteger(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(numeric)));
}

function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

function jsonError(error) {
  const code = typeof error?.code === 'string' ? error.code : 'internal';
  const status = error instanceof UmInputError
    ? (code === 'not_found' ? 404 : code === 'already_running' || code === 'disabled' ? 409 : 400)
    : 500;
  return json({
    ok: false,
    error: {
      code,
      message: error instanceof Error ? error.message : String(error),
    },
  }, status);
}

function renderValue(_args, value) {
  return [{ type: 'text', text: JSON.stringify(value, null, 2) }];
}

function genericCall(title, kind = 'other') {
  return { card: 'generic', title, kind };
}

function normalizeInput(raw) {
  if (!isRecord(raw)) {
    throw new UmInputError('invalid_machine', 'Machine input must be an object.');
  }
  const pick = (camel, snake) => (raw[camel] !== undefined ? raw[camel] : raw[snake]);
  return {
    id: raw.id ?? raw.machine_id,
    name: raw.name,
    command: raw.command,
    intent: raw.intent,
    intervalSeconds: pick('intervalSeconds', 'interval_seconds'),
    timeoutSeconds: pick('timeoutSeconds', 'timeout_seconds'),
    cwd: raw.cwd,
    enabled: raw.enabled,
  };
}

export function apply(ctx, config = {}) {
  const logger = ctx.logger ?? console;
  const options = {
    statePath: typeof config.statePath === 'string' && config.statePath.trim() !== ''
      ? resolve(expandHome(config.statePath.trim()))
      : defaultStatePath(),
    defaultCwd: typeof config.defaultCwd === 'string' && config.defaultCwd.trim() !== ''
      ? expandHome(config.defaultCwd.trim())
      : (ctx.get('workingDirectory')?.defaultDirectory ?? process.cwd()),
    maxConcurrentRuns: clampInteger(config.maxConcurrentRuns, 1, 8, 3),
    maxOutputBytes: clampInteger(config.maxOutputBytes, 1_024, 65_536, LIMITS.outputBytes),
    maxRunsPerMachine: clampInteger(config.maxRunsPerMachine, 5, 200, LIMITS.runsPerMachine),
    maxRepairOutputChars: clampInteger(config.maxRepairOutputChars, 500, 20_000, LIMITS.repairOutputChars),
  };

  const store = new UltimateMachineStore(options.statePath, logger);
  let state = { version: 1, machines: [] };
  let loaded = false;
  let stopped = false;
  let timer = null;
  let pumping = false;
  let pumpAgain = false;
  let activeProcesses = 0;
  const slotWaiters = [];
  const activeRuns = new Map();
  const repairSessionPromises = new Map();
  const toolDisposers = [];

  const ready = (async () => {
    try {
      state = await store.load();
    } catch (error) {
      logger.warn?.(`dsh-plugin-um: could not load state; starting empty: ${String(error)}`);
      state = { version: 1, machines: [] };
    }
    loaded = true;
    if (stopped) return;
    void pump();
  })();

  function findMachine(id) {
    const machine = state.machines.find((candidate) => candidate.id === id);
    if (machine === undefined) {
      throw new UmInputError('not_found', `No Ultimate Machine has id "${id}".`);
    }
    return machine;
  }

  function persist() {
    return store.save(state);
  }

  function persistQuiet() {
    return persist().catch((error) => {
      logger.warn?.(`dsh-plugin-um: could not persist state: ${String(error)}`);
    });
  }

  function replaceMachine(next) {
    const index = state.machines.findIndex((machine) => machine.id === next.id);
    if (index === -1) return false;
    state.machines[index] = next;
    return true;
  }

  function notify() {
    // The page polls every five seconds, so a change needs no push channel.
    // This hook is kept for a future remote event surface.
  }

  function schedule() {
    if (stopped || !loaded) return;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    const now = Date.now();
    let earliest = null;
    for (const machine of state.machines) {
      if (!machine.enabled || activeRuns.has(machine.id)) continue;
      const due = nextRunAt(machine, now);
      if (due !== null && (earliest === null || due < earliest)) earliest = due;
    }
    if (earliest === null) return;
    const delay = Math.max(0, Math.min(earliest - now, 2_147_000_000));
    timer = setTimeout(() => {
      timer = null;
      void pump();
    }, delay);
    if (typeof timer.unref === 'function') timer.unref();
  }

  async function pump() {
    if (stopped || !loaded) return;
    if (pumping) {
      pumpAgain = true;
      return;
    }
    pumping = true;
    try {
      do {
        pumpAgain = false;
        const now = Date.now();
        for (const machine of [...state.machines]) {
          if (!machine.enabled || activeRuns.has(machine.id)) continue;
          const due = nextRunAt(machine, now);
          if (due === null || due > now) continue;
          startMachine(machine, 'schedule');
        }
        schedule();
      } while (pumpAgain && !stopped);
    } finally {
      pumping = false;
    }
  }

  async function withSlot(operation, signal) {
    if (activeProcesses >= options.maxConcurrentRuns) {
      await new Promise((resolve) => slotWaiters.push(resolve));
    }
    if (signal?.aborted) {
      return {
        outcome: 'cancelled',
        exitCode: null,
        signal: null,
        error: null,
        startedAt: Date.now(),
        finishedAt: Date.now(),
        durationMs: 0,
        output: '',
        stdoutBytes: 0,
        stderrBytes: 0,
        timedOut: false,
      };
    }
    activeProcesses += 1;
    try {
      return await operation();
    } finally {
      activeProcesses -= 1;
      slotWaiters.shift()?.();
    }
  }

  function startMachine(machine, trigger) {
    if (activeRuns.has(machine.id)) {
      throw new UmInputError('already_running', `Ultimate Machine "${machine.name}" is already running.`);
    }
    const runId = randomId('run');
    const promise = executeRun(machine, trigger, { runId });
    promise.catch((error) => {
      logger.warn?.(`dsh-plugin-um: run ${runId} failed unexpectedly: ${String(error)}`);
    });
    return { runId, promise };
  }

  async function executeRun(machine, trigger, { runId }) {
    const controller = new AbortController();
    const startedAt = Date.now();
    activeRuns.set(machine.id, { runId, controller, startedAt });
    if (trigger === 'schedule') {
      // Manual runs do not move the schedule; only the scheduled anchor does.
      machine.lastScheduledAt = startedAt;
    }

    const run = {
      id: runId,
      machineId: machine.id,
      startedAt,
      finishedAt: startedAt,
      durationMs: 0,
      trigger,
      exitCode: null,
      signal: null,
      outcome: 'cancelled',
      output: '',
      stdoutBytes: 0,
      stderrBytes: 0,
      repair: null,
      repairSessionId: null,
      repairError: null,
      timeoutSeconds: machine.timeoutSeconds,
    };

    try {
      const result = await withSlot(() => runShellCommand({
        command: machine.command,
        cwd: machine.cwd,
        fallbackCwd: options.defaultCwd,
        timeoutMs: machine.timeoutSeconds * 1_000,
        maxOutputBytes: options.maxOutputBytes,
        signal: controller.signal,
        machineId: machine.id,
        runId,
      }), controller.signal);

      Object.assign(run, result);
      run.finishedAt = result.finishedAt;
      run.durationMs = result.durationMs;

      const current = state.machines.find((candidate) => candidate.id === machine.id);
      if (current !== undefined) {
        current.lastRunAt = run.finishedAt;
        current.lastExit = run.exitCode;
        current.lastOutcome = run.outcome;
        current.lastDurationMs = run.durationMs;
        current.lastOutput = run.output;
        current.lastTrigger = trigger;
        current.totalRuns += 1;
        if (run.outcome === 'healthy') current.healthyRuns += 1;
        else if (run.outcome !== 'cancelled') current.failingRuns += 1;

        if (run.outcome !== 'healthy' && run.outcome !== 'cancelled' && current.enabled) {
          try {
            const delivery = await Promise.race([
              deliverRepair(current, run),
              new Promise((resolve) => {
                const handle = setTimeout(() => resolve({ repair: 'failed', error: 'Repair delivery timed out.' }), 30_000);
                if (typeof handle.unref === 'function') handle.unref();
              }),
            ]);
            run.repair = delivery.repair;
            run.repairSessionId = delivery.repairSessionId ?? null;
            run.repairError = delivery.error ?? null;
            if (delivery.repair === 'delivered') {
              current.repairRequests += 1;
              current.repairDeliveredAt = Date.now();
            } else if (delivery.repair === 'dropped') {
              current.repairDroppedAt = Date.now();
            }
          } catch (error) {
            run.repair = 'failed';
            run.repairError = error instanceof Error ? error.message : String(error);
          }
        }

        current.runs.push(run);
        if (current.runs.length > options.maxRunsPerMachine) {
          current.runs.splice(0, current.runs.length - options.maxRunsPerMachine);
        }
        current.updatedAt = Date.now();
        await persistQuiet();
        notify();
      }
      return { ...runView(run, options.maxRepairOutputChars), output: run.output };
    } finally {
      activeRuns.delete(machine.id);
      schedule();
    }
  }

  async function ensureRepairSession(machine, { force = false } = {}) {
    if (!force && machine.repairSessionId) return machine.repairSessionId;
    if (repairSessionPromises.has(machine.id)) return repairSessionPromises.get(machine.id);

    const task = (async () => {
      const controller = ctx.get('sessionController');
      if (controller === undefined || typeof controller.create !== 'function') return null;
      const current = state.machines.find((candidate) => candidate.id === machine.id);
      if (current === undefined) return null;
      try {
        const created = await controller.create({
          ...(current.cwd
            ? { cwd: resolveWorkingDirectory(current.cwd, options.defaultCwd) }
            : {}),
        });
        const sessionId = created?.sessionId;
        if (typeof sessionId !== 'string' || sessionId === '') return null;
        current.repairSessionId = sessionId;
        current.repairTitle = `${AUTO_TITLE_PREFIX}${current.name}`;
        current.updatedAt = Date.now();
        if (typeof controller.rename === 'function') {
          try {
            await controller.rename({ sessionId, title: current.repairTitle });
          } catch (error) {
            logger.warn?.(`dsh-plugin-um: could not title repair session: ${String(error)}`);
          }
        }
        await persistQuiet();
        return sessionId;
      } catch (error) {
        logger.warn?.(`dsh-plugin-um: could not create repair session for "${current.name}": ${String(error)}`);
        return null;
      }
    })();

    repairSessionPromises.set(machine.id, task);
    try {
      return await task;
    } finally {
      repairSessionPromises.delete(machine.id);
    }
  }

  async function deliverRepair(machine, run) {
    if (stopped) return { repair: 'skipped', error: 'The plugin is unloading.' };
    const controller = ctx.get('sessionController');
    if (controller === undefined) {
      return { repair: 'skipped', error: 'This Host has no Session controller.' };
    }

    let sessionId = machine.repairSessionId ?? await ensureRepairSession(machine);
    if (!sessionId) {
      return { repair: 'failed', error: 'Could not create a repair session.' };
    }

    try {
      if (typeof controller.state === 'function') {
        const status = await controller.state({ sessionId });
        if (status?.running === true) {
          return { repair: 'dropped', repairSessionId: sessionId };
        }
      }
    } catch (error) {
      // The bound Session may have been deleted or archived. Try one fresh
      // Session; if that also fails, record the delivery failure.
      sessionId = await ensureRepairSession(machine, { force: true });
      if (!sessionId) {
        return { repair: 'failed', error: `Repair session unavailable: ${String(error)}` };
      }
    }

    if (!state.machines.some((candidate) => candidate.id === machine.id)) {
      return { repair: 'skipped', error: 'The machine was deleted before delivery.' };
    }

    const text = repairPrompt(machine, run, options.maxRepairOutputChars);
    try {
      await controller.prompt({
        requestId: `um:${run.id}`,
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text }],
      }, new AbortController().signal);
      return { repair: 'delivered', repairSessionId: sessionId };
    } catch (error) {
      if (error?.code === 'session/agent-busy') {
        return { repair: 'dropped', repairSessionId: sessionId };
      }
      return {
        repair: 'failed',
        repairSessionId: sessionId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async function cancelRepairTurn(machine) {
    const controller = ctx.get('sessionController');
    const sessionId = machine.repairSessionId;
    if (controller === undefined || typeof sessionId !== 'string' || sessionId === '') return;
    try {
      if (typeof controller.state !== 'function') return;
      const status = await controller.state({ sessionId });
      if (status?.running === true && typeof controller.cancel === 'function') {
        controller.cancel({ sessionId });
      }
    } catch {
      // A paused machine does not need to report a missing repair Session.
    }
  }

  async function onPaused(machine) {
    const active = activeRuns.get(machine.id);
    if (active !== undefined) {
      active.controller.abort();
    }
    void cancelRepairTurn(machine);
  }

  async function listMachines({ enabled, limit } = {}) {
    await ready;
    let machines = state.machines;
    if (typeof enabled === 'boolean') {
      machines = machines.filter((machine) => machine.enabled === enabled);
    }
    const total = machines.length;
    const capped = Math.max(1, Math.min(200, Number.isFinite(limit) ? Math.trunc(limit) : 100));
    const items = machines.slice(0, capped).map((machine) => machineSummary(machine, {
      now: Date.now(),
      running: activeRuns.has(machine.id),
    }));
    return {
      machines: items,
      total,
      summary: summarizeMachines(state.machines, {
        now: Date.now(),
        runningIds: new Set(activeRuns.keys()),
      }),
    };
  }

  async function getMachine(id, { includeRuns = true, runLimit = 20 } = {}) {
    await ready;
    const machine = findMachine(id);
    return publicMachine(machine, {
      now: Date.now(),
      running: activeRuns.has(id),
      includeRuns,
      runLimit,
    });
  }

  async function saveMachine(rawInput) {
    await ready;
    const input = normalizeInput(rawInput);
    const id = typeof input.id === 'string' && input.id.trim() !== '' ? input.id.trim() : null;

    if (id !== null) {
      const current = findMachine(id);
      const next = updateMachine(current, input, { now: Date.now() });
      replaceMachine(next);
      try {
        await persist();
      } catch (error) {
        logger.warn?.(`dsh-plugin-um: could not persist machine update: ${String(error)}`);
        throw new UmInputError('persist_failed', `The machine changed in memory but could not be saved: ${String(error)}`);
      }
      if (!next.enabled) await onPaused(next);
      schedule();
      notify();
      return publicMachine(next, {
        now: Date.now(),
        running: activeRuns.has(next.id),
        includeRuns: true,
        runLimit: 10,
      });
    }

    const machine = createMachine(input, { now: Date.now() });
    if (state.machines.some((candidate) => candidate.id === machine.id)) {
      throw new UmInputError('invalid_machine', `A machine with id "${machine.id}" already exists.`);
    }
    state.machines.push(machine);
    try {
      await persist();
    } catch (error) {
      state.machines = state.machines.filter((candidate) => candidate.id !== machine.id);
      throw new UmInputError('persist_failed', `The machine could not be saved: ${String(error)}`);
    }
    schedule();
    notify();
    // The repair Session is part of the machine's identity and is created in
    // the background so creating a machine does not wait for a Session write.
    void ensureRepairSession(machine);
    return publicMachine(machine, {
      now: Date.now(),
      running: activeRuns.has(machine.id),
      includeRuns: true,
      runLimit: 10,
    });
  }

  async function deleteMachine(id) {
    await ready;
    const machine = findMachine(id);
    const active = activeRuns.get(id);
    if (active !== undefined) active.controller.abort();
    state.machines = state.machines.filter((candidate) => candidate.id !== id);
    try {
      await persist();
    } catch (error) {
      throw new UmInputError('persist_failed', `The machine was removed in memory but could not be saved: ${String(error)}`);
    }
    schedule();
    notify();
    return {
      deleted: true,
      machine: {
        id: machine.id,
        name: machine.name,
        repairSessionId: machine.repairSessionId,
        repairTitle: machine.repairTitle,
      },
    };
  }

  async function setEnabled(id, enabled) {
    if (typeof enabled !== 'boolean') {
      throw new UmInputError('invalid_enabled', 'enabled must be a boolean.');
    }
    return saveMachine({ id, enabled });
  }

  async function runMachine(id, { trigger = 'manual', wait = true } = {}) {
    await ready;
    const machine = findMachine(id);
    if (!machine.enabled) {
      throw new UmInputError('disabled', `Ultimate Machine "${machine.name}" is paused. Resume it before running.`);
    }
    if (activeRuns.has(id)) {
      throw new UmInputError('already_running', `Ultimate Machine "${machine.name}" is already running.`);
    }
    const { runId, promise } = startMachine(machine, trigger);
    if (!wait) return { started: true, runId };
    return promise;
  }

  async function history(id, limit = 20) {
    await ready;
    const machine = findMachine(id);
    const capped = Math.max(1, Math.min(options.maxRunsPerMachine, Number.isFinite(limit) ? Math.trunc(limit) : 20));
    return {
      machineId: machine.id,
      runs: [...machine.runs].slice(-capped).reverse().map((run) => ({
        ...runView(run, options.maxRepairOutputChars),
        output: run.output,
      })),
    };
  }

  // ---------------------------------------------------------------------
  // Model tools
  // ---------------------------------------------------------------------

  const machineIdParameter = {
    type: 'string',
    description: 'Ultimate Machine id.',
  };
  const roundedOutputSchema = { type: 'object', additionalProperties: true };

  const definitions = [
    {
      name: 'um_list_machines',
      description: 'List this Host\'s Ultimate Machines: token-free scheduled shell checks. Each item has the definition, enabled/running state, latest exit code, and the bound repair session. A check costs no model tokens; only a failing run writes a fix request into its repair session.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          enabled: {
            type: 'boolean',
            description: 'true for enabled machines only; false for paused machines only; omitted for all.',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 200,
            description: 'Maximum machines to return; defaults to 100.',
          },
        },
      },
      output: { schema: roundedOutputSchema, render: renderValue },
      async execute(args = {}) {
        return listMachines({ enabled: args.enabled, limit: args.limit });
      },
      presentCall: () => genericCall('List Ultimate Machines', 'read'),
    },
    {
      name: 'um_get_machine',
      description: 'Read one Ultimate Machine by id: its full definition, latest result, and recent runs with exit codes and output tails. Use it before editing a machine or to relate a repair request to the check that sent it.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['machine_id'],
        properties: {
          machine_id: machineIdParameter,
          include_runs: {
            type: 'boolean',
            description: 'Include recent runs; defaults to true.',
          },
          run_limit: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            description: 'Number of recent runs to include; defaults to 20.',
          },
        },
      },
      output: { schema: roundedOutputSchema, render: renderValue },
      async execute(args) {
        return getMachine(args.machine_id, {
          includeRuns: args.include_runs !== false,
          runLimit: args.run_limit,
        });
      },
      presentCall: (args) => genericCall('Read Ultimate Machine', 'read'),
    },
    {
      name: 'um_set_machine',
      description: 'Create or update an Ultimate Machine. Omit machine_id to create: name, command, and interval_seconds are required, the first check runs immediately, and a repair session titled 终极机器 · <name> is created. With machine_id, only provided fields change; an empty intent or cwd clears it; enabled pauses or resumes. The check runs as a plain shell command and costs no model tokens.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          machine_id: {
            type: 'string',
            description: 'Existing machine id. Omit to create a new machine.',
          },
          name: {
            type: 'string',
            description: 'Label shown in the Ultimate Machines page and in the repair session title; 1-120 characters. Required on create.',
          },
          command: {
            type: 'string',
            description: 'Shell command to run as the check; exit 0 means healthy, any other exit means failure. Required on create. Verify it with bash before saving.',
          },
          intent: {
            type: 'string',
            description: 'What this check protects, shown to the repair session. On update, an empty string clears it.',
          },
          interval_seconds: {
            type: 'integer',
            minimum: 10,
            maximum: 2592000,
            description: 'Seconds between scheduled checks (10 seconds to 30 days); defaults to 300 on create.',
          },
          timeout_seconds: {
            type: 'integer',
            minimum: 1,
            maximum: 3600,
            description: 'Per-run timeout in seconds; defaults to 300. A timed-out run counts as a failure.',
          },
          cwd: {
            type: 'string',
            description: 'Working directory for the command; omit or pass an empty string for the Host default.',
          },
          enabled: {
            type: 'boolean',
            description: 'Pause (false) or resume (true); omitted leaves the state unchanged.',
          },
        },
      },
      output: { schema: roundedOutputSchema, render: renderValue },
      async execute(args) {
        return saveMachine(args);
      },
      presentCall: (args) => genericCall(args.machine_id ? 'Update Ultimate Machine' : 'Create Ultimate Machine'),
    },
    {
      name: 'um_delete_machine',
      description: 'Delete an Ultimate Machine permanently. It stops being scheduled and leaves the list; the bound repair session and its history remain as an ordinary conversation. Prefer pausing with um_set_machine when the user only wants a machine to be quiet.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['machine_id'],
        properties: { machine_id: machineIdParameter },
      },
      output: { schema: roundedOutputSchema, render: renderValue },
      async execute(args) {
        return deleteMachine(args.machine_id);
      },
      presentCall: () => genericCall('Delete Ultimate Machine', 'other'),
    },
    {
      name: 'um_run_machine',
      description: 'Run an Ultimate Machine\'s check now and return its exit code, duration, output tail, and repair delivery status. The check itself is token-free. Use it to verify a fix immediately after repairing, rather than waiting for the next interval.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['machine_id'],
        properties: {
          machine_id: machineIdParameter,
          wait: {
            type: 'boolean',
            description: 'Wait for the check to finish; defaults to true. Set false to start it and return immediately.',
          },
        },
      },
      output: { schema: roundedOutputSchema, render: renderValue },
      async execute(args) {
        const result = await runMachine(args.machine_id, {
          trigger: 'manual',
          wait: args.wait !== false,
        });
        if (result?.started === true) return result;
        const machine = state.machines.find((candidate) => candidate.id === args.machine_id);
        return {
          ...result,
          machine: machine === undefined ? undefined : machineSummary(machine, {
            now: Date.now(),
            running: activeRuns.has(machine.id),
          }),
        };
      },
      presentCall: () => ({ card: 'terminal', title: 'Run Ultimate Machine check', description: 'Token-free shell check' }),
    },
  ];

  for (const definition of definitions) {
    ctx.effect(() => ctx.tools.register(definition), `dsh-plugin-um: tool ${definition.name}`);
  }

  const sectionOrder = (() => {
    try {
      const base = ctx.systemPrompt.getSectionOrder('TOOL_SCHEDULE');
      return Number.isFinite(base) ? base + 1 : 500;
    } catch {
      return 500;
    }
  })();
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'dsh-plugin-um',
    order: sectionOrder,
    text: ({ scope }) => (ctx.tools.get('um_list_machines', scope) === undefined
      ? ''
      : [
        '## Ultimate Machines',
        '`um_*` tools manage Host-wide, token-free checks: one shell command per machine on an interval. A healthy run is silent and costs no model tokens; a failing run writes a fix request into the machine\'s repair session.',
        '- Prefer a machine for a long-lived condition that an exit code can judge.',
        '- Verify a new or changed command with bash first: healthy must exit 0, and the failing case must print an actionable reason.',
        '- Do not weaken a check to make it green; fix the condition or the command.',
        '- Failure output enters the repair session: do not print secrets.',
      ].join('\n')),
  }), 'dsh-plugin-um: prompt section');

  // ---------------------------------------------------------------------
  // Browser surface
  // ---------------------------------------------------------------------

  ctx.inject(['connection'], (connectionCtx) => {
    connectionCtx.effect(() => {
      const connection = connectionCtx.get('connection');
      const dispose = connection.fetch.register({
        path: API_PATH,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: async (request) => {
          let body;
          try {
            body = await request.json();
          } catch {
            return json({ ok: false, error: { code: 'bad_request', message: 'Request body must be JSON.' } }, 400);
          }
          const action = typeof body?.action === 'string' ? body.action : '';
          try {
            await ready;
            if (action === 'health') {
              return json({ ok: true, value: { name: NS, version: '0.1.1' } });
            }
            if (action === 'list') {
              return json({ ok: true, value: await listMachines({ enabled: body.enabled, limit: body.limit }) });
            }
            if (action === 'get') {
              return json({ ok: true, value: await getMachine(body.id ?? body.machine_id, {
                includeRuns: body.includeRuns !== false,
                runLimit: body.runLimit ?? body.run_limit,
              }) });
            }
            if (action === 'save') {
              return json({ ok: true, value: await saveMachine(body.machine ?? body) });
            }
            if (action === 'delete') {
              return json({ ok: true, value: await deleteMachine(body.id ?? body.machine_id) });
            }
            if (action === 'setEnabled') {
              return json({ ok: true, value: await setEnabled(body.id ?? body.machine_id, body.enabled) });
            }
            if (action === 'run') {
              const result = await runMachine(body.id ?? body.machine_id, {
                trigger: 'manual',
                wait: body.wait === true,
              });
              return json({ ok: true, value: result });
            }
            if (action === 'history') {
              return json({ ok: true, value: await history(body.id ?? body.machine_id, body.limit) });
            }
            return json({ ok: false, error: { code: 'bad_action', message: `Unknown action "${action}".` } }, 400);
          } catch (error) {
            return jsonError(error);
          }
        },
      });
      return () => {
        void dispose?.();
      };
    }, 'dsh-plugin-um: HTTP route');
  });

  ctx.effect(() => () => {
    stopped = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    for (const { controller } of activeRuns.values()) {
      controller.abort();
    }
    void store.flush().catch(() => {});
  }, 'dsh-plugin-um: lifecycle');

  return {
    // Exposed for the test harness and for future Host integration. These are
    // not model tools; they are the same operations the tools and page use.
    ready,
    listMachines,
    getMachine,
    saveMachine,
    deleteMachine,
    setEnabled,
    runMachine,
    state: () => state,
    toolNames: TOOL_NAMES,
  };
}
