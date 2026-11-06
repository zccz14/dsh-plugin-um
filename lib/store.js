import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeMachine } from './core.js';

export const STATE_VERSION = 1;

export function resolveDshHome(env = process.env) {
  const configured = typeof env.DSH_HOME === 'string' ? env.DSH_HOME.trim() : '';
  return configured !== '' ? path.resolve(configured) : path.join(os.homedir(), '.dsh');
}

export function defaultStatePath(env = process.env) {
  return path.join(resolveDshHome(env), 'ultimate-machines', 'state.json');
}

function emptyState() {
  return { version: STATE_VERSION, machines: [] };
}

/**
 * Durable JSON store for machine definitions and their bounded run history.
 *
 * The store is intentionally independent of the Session log: an Ultimate
 * Machine is Host-owned automation, not a conversation. Writes are atomic
 * (temp file + rename) and serialized so overlapping runs cannot interleave a
 * half-written state file.
 */
export class UltimateMachineStore {
  constructor(filePath, logger = console) {
    this.filePath = filePath;
    this.logger = logger;
    this.state = emptyState();
    this.writeChain = Promise.resolve();
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return this.state;
    this.loaded = true;
    let text;
    try {
      text = await fs.readFile(this.filePath, 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') {
        this.state = emptyState();
        return this.state;
      }
      throw error;
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      await this.quarantine('unparseable JSON');
      this.state = emptyState();
      return this.state;
    }
    if (parsed?.version !== STATE_VERSION || !Array.isArray(parsed?.machines)) {
      await this.quarantine(`unsupported state shape (version ${String(parsed?.version)})`);
      this.state = emptyState();
      return this.state;
    }
    const machines = [];
    const seen = new Set();
    for (const raw of parsed.machines) {
      const machine = normalizeMachine(raw);
      if (machine === null || seen.has(machine.id)) continue;
      seen.add(machine.id);
      machines.push(machine);
    }
    this.state = { version: STATE_VERSION, machines };
    return this.state;
  }

  async quarantine(reason) {
    const backup = `${this.filePath}.corrupt-${Date.now()}`;
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.rename(this.filePath, backup);
      this.logger?.warn?.(`dsh-plugin-um: ignored ${reason}; previous state moved to ${backup}`);
    } catch (error) {
      this.logger?.warn?.(`dsh-plugin-um: could not quarantine state (${reason}): ${String(error)}`);
    }
  }

  /**
   * Persist the current state. Calls are serialized; the returned promise
   * resolves after this snapshot is durable (or rejects on a write failure).
   */
  save(state = this.state) {
    const snapshot = JSON.stringify(state, null, 2);
    const run = this.writeChain.then(() => this.writeAtomic(snapshot));
    this.writeChain = run.catch(() => {});
    return run;
  }

  async writeAtomic(snapshot) {
    const directory = path.dirname(this.filePath);
    await fs.mkdir(directory, { recursive: true });
    const temp = path.join(
      directory,
      `.${path.basename(this.filePath)}.${process.pid}.${Date.now()}.tmp`,
    );
    await fs.writeFile(temp, snapshot, { encoding: 'utf8', mode: 0o600 });
    try {
      await fs.rename(temp, this.filePath);
    } catch (error) {
      await fs.rm(temp, { force: true }).catch(() => {});
      throw error;
    }
  }

  async flush() {
    await this.writeChain;
  }
}
