/**
 * Pure model and formatting helpers for dsh-plugin-um.
 *
 * Nothing in this module touches the Host, the filesystem, or a child
 * process. That keeps the Ultimate Machine model easy to test and lets the
 * Host plugin, the HTTP surface, and the tools share one validation path.
 */

export const AUTO_TITLE_PREFIX = '终极机器 · ';

export const LIMITS = Object.freeze({
  name: 120,
  command: 20_000,
  intent: 2_000,
  cwd: 4_096,
  intervalSeconds: { min: 10, max: 2_592_000, default: 300 },
  timeoutSeconds: { min: 1, max: 3_600, default: 300 },
  outputBytes: 8_192,
  repairOutputChars: 6_000,
  runsPerMachine: 50,
  listPreviewChars: 700,
});

export class UmInputError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'UmInputError';
    this.code = code;
  }
}

export function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value, field, max, code) {
  if (typeof value !== 'string') {
    throw new UmInputError(code, `${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new UmInputError(code, `${field} must not be empty.`);
  }
  if (trimmed.length > max) {
    throw new UmInputError(code, `${field} must be at most ${max} characters.`);
  }
  return trimmed;
}

function optionalString(value, field, max, code) {
  if (value === undefined) return undefined;
  if (value === null) return '';
  if (typeof value !== 'string') {
    throw new UmInputError(code, `${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new UmInputError(code, `${field} must be at most ${max} characters.`);
  }
  return trimmed;
}

function boundedInteger(value, field, bounds, code) {
  const numeric = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof numeric !== 'number' || !Number.isFinite(numeric) || !Number.isInteger(numeric)) {
    throw new UmInputError(code, `${field} must be an integer.`);
  }
  if (numeric < bounds.min || numeric > bounds.max) {
    throw new UmInputError(
      code,
      `${field} must be between ${bounds.min} and ${bounds.max}.`,
    );
  }
  return numeric;
}

function optionalBoolean(value, field, code) {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new UmInputError(code, `${field} must be a boolean.`);
  }
  return value;
}

function finiteTimestamp(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nullableTimestamp(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function nullableExit(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null;
}

const OUTCOMES = new Set(['healthy', 'failing', 'timeout', 'error', 'cancelled']);
const TRIGGERS = new Set(['schedule', 'manual']);
const REPAIR_STATES = new Set(['delivered', 'dropped', 'failed', 'skipped']);

export function randomId(prefix = 'um') {
  const random = globalThis.crypto?.randomUUID?.().replaceAll('-', '').slice(0, 12)
    ?? Math.random().toString(36).slice(2, 14);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function createMachine(input, options = {}) {
  if (!isRecord(input)) {
    throw new UmInputError('invalid_machine', 'Machine input must be an object.');
  }
  const now = finiteTimestamp(options.now, Date.now());
  const name = requiredString(input.name, 'name', LIMITS.name, 'invalid_name');
  const command = requiredString(input.command, 'command', LIMITS.command, 'invalid_command');
  const intent = optionalString(input.intent, 'intent', LIMITS.intent, 'invalid_intent') ?? '';
  const cwd = optionalString(input.cwd, 'cwd', LIMITS.cwd, 'invalid_cwd') ?? '';
  const intervalSeconds = input.intervalSeconds === undefined
    ? LIMITS.intervalSeconds.default
    : boundedInteger(input.intervalSeconds, 'intervalSeconds', LIMITS.intervalSeconds, 'invalid_interval');
  const timeoutSeconds = input.timeoutSeconds === undefined
    ? LIMITS.timeoutSeconds.default
    : boundedInteger(input.timeoutSeconds, 'timeoutSeconds', LIMITS.timeoutSeconds, 'invalid_timeout');
  const enabled = optionalBoolean(input.enabled, 'enabled', 'invalid_enabled') ?? true;

  return {
    id: typeof input.id === 'string' && input.id.trim() !== '' ? input.id.trim() : randomId(),
    name,
    command,
    intent,
    intervalSeconds,
    timeoutSeconds,
    cwd,
    enabled,
    createdAt: now,
    updatedAt: now,
    // The first check starts immediately: a new machine should tell the user
    // whether the command is healthy now, not after a full interval.
    lastScheduledAt: null,
    lastRunAt: null,
    lastExit: null,
    lastOutcome: null,
    lastDurationMs: null,
    lastOutput: '',
    lastTrigger: null,
    repairSessionId: null,
    repairTitle: null,
    repairDeliveredAt: null,
    repairDroppedAt: null,
    totalRuns: 0,
    healthyRuns: 0,
    failingRuns: 0,
    repairRequests: 0,
    runs: [],
  };
}

/**
 * Apply a partial update and return a new machine object. Only provided
 * fields change. An empty `intent` or `cwd` clears that field.
 */
export function updateMachine(machine, patch, options = {}) {
  if (!isRecord(patch)) {
    throw new UmInputError('invalid_machine', 'Machine patch must be an object.');
  }
  const now = finiteTimestamp(options.now, Date.now());
  const next = { ...machine };

  if (patch.name !== undefined) {
    next.name = requiredString(patch.name, 'name', LIMITS.name, 'invalid_name');
  }
  if (patch.command !== undefined) {
    next.command = requiredString(patch.command, 'command', LIMITS.command, 'invalid_command');
  }
  if (patch.intent !== undefined) {
    next.intent = optionalString(patch.intent, 'intent', LIMITS.intent, 'invalid_intent') ?? '';
  }
  if (patch.cwd !== undefined) {
    next.cwd = optionalString(patch.cwd, 'cwd', LIMITS.cwd, 'invalid_cwd') ?? '';
  }
  if (patch.intervalSeconds !== undefined) {
    next.intervalSeconds = boundedInteger(
      patch.intervalSeconds,
      'intervalSeconds',
      LIMITS.intervalSeconds,
      'invalid_interval',
    );
  }
  if (patch.timeoutSeconds !== undefined) {
    next.timeoutSeconds = boundedInteger(
      patch.timeoutSeconds,
      'timeoutSeconds',
      LIMITS.timeoutSeconds,
      'invalid_timeout',
    );
  }
  if (patch.enabled !== undefined) {
    next.enabled = optionalBoolean(patch.enabled, 'enabled', 'invalid_enabled');
  }

  const changed = ['name', 'command', 'intent', 'cwd', 'intervalSeconds', 'timeoutSeconds', 'enabled']
    .some((key) => next[key] !== machine[key]);
  if (!changed) {
    throw new UmInputError('invalid_patch', 'Provide at least one field to update.');
  }
  next.updatedAt = now;
  return next;
}

export function normalizeMachine(raw) {
  if (!isRecord(raw)) return null;
  try {
    const base = createMachine({
      ...raw,
      id: typeof raw.id === 'string' ? raw.id : undefined,
    }, { now: finiteTimestamp(raw.createdAt, Date.now()) });
    const runs = Array.isArray(raw.runs)
      ? raw.runs.map(normalizeRun).filter(Boolean).slice(-LIMITS.runsPerMachine)
      : [];
    const latest = runs.at(-1);
    return {
      ...base,
      createdAt: finiteTimestamp(raw.createdAt, base.createdAt),
      updatedAt: finiteTimestamp(raw.updatedAt, base.updatedAt),
      lastScheduledAt: nullableTimestamp(raw.lastScheduledAt),
      lastRunAt: nullableTimestamp(raw.lastRunAt) ?? latest?.finishedAt ?? null,
      lastExit: nullableExit(raw.lastExit) ?? latest?.exitCode ?? null,
      lastOutcome: OUTCOMES.has(raw.lastOutcome) ? raw.lastOutcome : latest?.outcome ?? null,
      lastDurationMs: typeof raw.lastDurationMs === 'number' ? raw.lastDurationMs : latest?.durationMs ?? null,
      lastOutput: typeof raw.lastOutput === 'string' ? raw.lastOutput : latest?.output ?? '',
      lastTrigger: TRIGGERS.has(raw.lastTrigger) ? raw.lastTrigger : latest?.trigger ?? null,
      repairSessionId: typeof raw.repairSessionId === 'string' && raw.repairSessionId !== ''
        ? raw.repairSessionId
        : null,
      repairTitle: typeof raw.repairTitle === 'string' && raw.repairTitle !== '' ? raw.repairTitle : null,
      repairDeliveredAt: nullableTimestamp(raw.repairDeliveredAt),
      repairDroppedAt: nullableTimestamp(raw.repairDroppedAt),
      totalRuns: Number.isFinite(raw.totalRuns) ? Math.max(0, Math.trunc(raw.totalRuns)) : runs.length,
      healthyRuns: Number.isFinite(raw.healthyRuns) ? Math.max(0, Math.trunc(raw.healthyRuns)) : 0,
      failingRuns: Number.isFinite(raw.failingRuns) ? Math.max(0, Math.trunc(raw.failingRuns)) : 0,
      repairRequests: Number.isFinite(raw.repairRequests) ? Math.max(0, Math.trunc(raw.repairRequests)) : 0,
      runs,
    };
  } catch {
    return null;
  }
}

export function normalizeRun(raw) {
  if (!isRecord(raw)) return null;
  const outcome = OUTCOMES.has(raw.outcome) ? raw.outcome : null;
  if (outcome === null) return null;
  const startedAt = finiteTimestamp(raw.startedAt, Date.now());
  const finishedAt = finiteTimestamp(raw.finishedAt, startedAt);
  return {
    id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : randomId('run'),
    machineId: typeof raw.machineId === 'string' ? raw.machineId : '',
    startedAt,
    finishedAt,
    durationMs: typeof raw.durationMs === 'number' ? raw.durationMs : Math.max(0, finishedAt - startedAt),
    trigger: TRIGGERS.has(raw.trigger) ? raw.trigger : 'schedule',
    exitCode: nullableExit(raw.exitCode),
    signal: typeof raw.signal === 'string' && raw.signal !== '' ? raw.signal : null,
    outcome,
    output: typeof raw.output === 'string' ? raw.output : '',
    stdoutBytes: Number.isFinite(raw.stdoutBytes) ? Math.max(0, Math.trunc(raw.stdoutBytes)) : 0,
    stderrBytes: Number.isFinite(raw.stderrBytes) ? Math.max(0, Math.trunc(raw.stderrBytes)) : 0,
    timeoutSeconds: Number.isFinite(raw.timeoutSeconds) ? Math.max(1, Math.trunc(raw.timeoutSeconds)) : 300,
    repair: REPAIR_STATES.has(raw.repair) ? raw.repair : null,
    repairSessionId: typeof raw.repairSessionId === 'string' && raw.repairSessionId !== ''
      ? raw.repairSessionId
      : null,
    repairError: typeof raw.repairError === 'string' && raw.repairError !== '' ? raw.repairError : null,
  };
}

export function nextRunAt(machine, now = Date.now()) {
  if (!machine.enabled) return null;
  // A machine that has never been scheduled is due now. Once a scheduled run
  // starts, its settle time anchors the next interval.
  if (machine.lastScheduledAt === null) return now;
  return Math.max(now, machine.lastScheduledAt + machine.intervalSeconds * 1000);
}

export function machineStatus(machine, running = false) {
  if (running) return 'running';
  if (!machine.enabled) return 'disabled';
  if (machine.lastOutcome === null) return 'never';
  return machine.lastOutcome;
}

export function latestRunOf(machine) {
  return Array.isArray(machine.runs) && machine.runs.length > 0
    ? machine.runs[machine.runs.length - 1]
    : null;
}

export function runView(run, previewChars = LIMITS.listPreviewChars) {
  if (!run) return null;
  return {
    id: run.id,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    durationMs: run.durationMs,
    trigger: run.trigger,
    exitCode: run.exitCode,
    signal: run.signal,
    outcome: run.outcome,
    outputPreview: run.output.length > previewChars ? `${run.output.slice(-previewChars)}…` : run.output,
    stdoutBytes: run.stdoutBytes,
    stderrBytes: run.stderrBytes,
    timeoutSeconds: run.timeoutSeconds,
    repair: run.repair,
    repairSessionId: run.repairSessionId,
    repairError: run.repairError,
  };
}

export function machineSummary(machine, options = {}) {
  const now = finiteTimestamp(options.now, Date.now());
  const running = options.running === true;
  const latest = latestRunOf(machine);
  return {
    id: machine.id,
    name: machine.name,
    command: machine.command,
    intent: machine.intent,
    intervalSeconds: machine.intervalSeconds,
    timeoutSeconds: machine.timeoutSeconds,
    cwd: machine.cwd,
    enabled: machine.enabled,
    status: machineStatus(machine, running),
    running,
    createdAt: machine.createdAt,
    updatedAt: machine.updatedAt,
    lastScheduledAt: machine.lastScheduledAt,
    lastRunAt: machine.lastRunAt,
    lastExit: machine.lastExit,
    lastOutcome: machine.lastOutcome,
    lastDurationMs: machine.lastDurationMs,
    lastTrigger: machine.lastTrigger,
    lastOutputPreview: machine.lastOutput.length > LIMITS.listPreviewChars
      ? `${machine.lastOutput.slice(-LIMITS.listPreviewChars)}…`
      : machine.lastOutput,
    nextRunAt: running ? null : nextRunAt(machine, now),
    repairSessionId: machine.repairSessionId,
    repairTitle: machine.repairTitle,
    repairDeliveredAt: machine.repairDeliveredAt,
    totalRuns: machine.totalRuns,
    healthyRuns: machine.healthyRuns,
    failingRuns: machine.failingRuns,
    repairRequests: machine.repairRequests,
    tokenFreeRuns: machine.totalRuns,
    latestRun: runView(latest),
  };
}

export function publicMachine(machine, options = {}) {
  const now = finiteTimestamp(options.now, Date.now());
  const running = options.running === true;
  const includeRuns = options.includeRuns === true;
  const runLimit = Number.isInteger(options.runLimit)
    ? Math.max(1, Math.min(LIMITS.runsPerMachine, options.runLimit))
    : 20;
  const runs = includeRuns
    ? [...machine.runs].slice(-runLimit).reverse().map((run) => ({
      ...runView(run, LIMITS.repairOutputChars),
      output: run.output,
    }))
    : undefined;
  return {
    ...machineSummary(machine, { now, running }),
    runs,
  };
}

export function summarizeMachines(machines, options = {}) {
  const now = finiteTimestamp(options.now, Date.now());
  const runningIds = options.runningIds instanceof Set ? options.runningIds : new Set();
  let enabled = 0;
  let healthy = 0;
  let failing = 0;
  let running = 0;
  let tokenFreeRuns = 0;
  let next = null;
  for (const machine of machines) {
    if (machine.enabled) enabled += 1;
    if (machine.lastOutcome === 'healthy') healthy += 1;
    if (machine.lastOutcome === 'failing' || machine.lastOutcome === 'timeout' || machine.lastOutcome === 'error') failing += 1;
    if (runningIds.has(machine.id)) running += 1;
    tokenFreeRuns += machine.totalRuns;
    if (machine.enabled && !runningIds.has(machine.id)) {
      const due = nextRunAt(machine, now);
      if (due !== null && (next === null || due < next)) next = due;
    }
  }
  return {
    total: machines.length,
    enabled,
    healthy,
    failing,
    running,
    tokenFreeRuns,
    nextRunAt: next,
  };
}

function exitSentence(run) {
  if (run.outcome === 'timeout') {
    return `检查超时（超过 ${run.timeoutSeconds ?? '?'} 秒）`;
  }
  if (run.outcome === 'error') {
    return `检查无法执行${run.signal ? `（${run.signal}）` : ''}`;
  }
  if (run.outcome === 'cancelled') {
    return `检查已取消${run.signal ? `（${run.signal}）` : ''}`;
  }
  if (run.exitCode === null) {
    return `检查失败${run.signal ? `（信号 ${run.signal}）` : '（未取得退出码）'}`;
  }
  return `检查失败：exit=${run.exitCode}`;
}

/**
 * The only message an Ultimate Machine writes into a repair session.
 */
export function repairPrompt(machine, run, maxOutputChars = LIMITS.repairOutputChars) {
  const limit = Number.isFinite(maxOutputChars)
    ? Math.max(1, Math.trunc(maxOutputChars))
    : LIMITS.repairOutputChars;
  const output = run.output.length > limit ? run.output.slice(-limit) : run.output;
  const sections = [
    `【终极机器·${machine.name}】${exitSentence(run)}。`,
    machine.intent ? `意图：\n${machine.intent}` : null,
    machine.cwd ? `工作目录：${machine.cwd}` : null,
    `命令：\n${machine.command}`,
    `输出尾部：\n${output.trim() === '' ? '(无输出)' : output}`,
    '请修复，使该命令返回 0。修复后无需回复；下次定时检查会自动验证。需要立即验证时，调用 um_run_machine 再跑一次——检查本身不消耗 token。',
  ];
  return sections.filter((section) => section !== null).join('\n\n');
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '0s';
  if (ms < 1_000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1_000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(minutes < 10 ? 1 : 0)}m`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function formatInterval(seconds) {
  if (seconds % 86_400 === 0) return `${seconds / 86_400}d`;
  if (seconds % 3_600 === 0) return `${seconds / 3_600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}
