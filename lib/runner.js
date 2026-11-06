import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const POSIX_SHELL = process.platform === 'win32'
  ? (process.env.ComSpec || 'cmd.exe')
  : (existsSync('/bin/bash') ? '/bin/bash' : '/bin/sh');

function shellArgs(command) {
  return process.platform === 'win32'
    ? ['/d', '/s', '/c', command]
    : ['-c', command];
}

export function expandHome(value) {
  if (typeof value !== 'string' || value === '') return '';
  if (value === '~') return os.homedir();
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

export function resolveWorkingDirectory(cwd, fallback) {
  const expanded = expandHome(cwd);
  if (expanded === '') return fallback || undefined;
  if (path.isAbsolute(expanded)) return expanded;
  return path.resolve(fallback || process.cwd(), expanded);
}

class TailCapture {
  constructor(maxBytes) {
    this.maxBytes = Math.max(1, maxBytes);
    this.chunks = [];
    this.bytes = 0;
    this.totalBytes = 0;
  }

  append(chunk) {
    if (!Buffer.isBuffer(chunk)) chunk = Buffer.from(chunk);
    this.totalBytes += chunk.length;
    this.bytes += chunk.length;
    this.chunks.push(chunk);
    while (this.bytes > this.maxBytes && this.chunks.length > 1) {
      const removed = this.chunks.shift();
      this.bytes -= removed.length;
    }
    if (this.bytes > this.maxBytes && this.chunks.length === 1) {
      const only = this.chunks[0];
      this.chunks[0] = only.subarray(only.length - this.maxBytes);
      this.bytes = this.chunks[0].length;
    }
  }

  text() {
    return Buffer.concat(this.chunks, this.bytes).toString('utf8');
  }
}

/**
 * Run one check command with no model call in the loop.
 *
 * Returns a settled result; it never rejects for a failing command, a spawn
 * error, a timeout, or cancellation. The caller decides whether that result
 * becomes a repair request.
 */
export function runShellCommand(options) {
  const {
    command,
    cwd,
    timeoutMs = 300_000,
    maxOutputBytes = 8_192,
    signal,
    env = {},
    machineId,
    runId,
  } = options;

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const capture = new TailCapture(maxOutputBytes);
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;
    let timedOut = false;
    let timer = null;
    let child;
    let aborted = false;

    const cleanup = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (signal !== undefined) signal.removeEventListener('abort', onAbort);
    };

    const finish = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        ...result,
        startedAt,
        finishedAt: Date.now(),
        durationMs: Date.now() - startedAt,
        output: capture.text(),
        stdoutBytes,
        stderrBytes,
        timedOut,
      });
    };

    const onAbort = () => {
      aborted = true;
      try {
        child?.kill('SIGKILL');
      } catch {
        // The process may already have exited.
      }
    };

    try {
      child = spawn(POSIX_SHELL, shellArgs(command), {
        cwd: resolveWorkingDirectory(cwd, options.fallbackCwd),
        env: {
          ...process.env,
          ...env,
          DSH_UM: '1',
          ...(machineId ? { DSH_UM_MACHINE: machineId } : {}),
          ...(runId ? { DSH_UM_RUN: runId } : {}),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (error) {
      finish({
        outcome: 'error',
        exitCode: null,
        signal: null,
        error: String(error),
      });
      return;
    }

    if (signal !== undefined) {
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener('abort', onAbort, { once: true });
      }
    }

    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill('SIGKILL');
        } catch {
          // Already gone.
        }
      }, timeoutMs);
      if (typeof timer.unref === 'function') timer.unref();
    }

    child.stdout?.on('data', (chunk) => {
      stdoutBytes += chunk.length;
      capture.append(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      stderrBytes += chunk.length;
      capture.append(chunk);
    });

    child.on('error', (error) => {
      finish({
        outcome: 'error',
        exitCode: null,
        signal: null,
        error: String(error),
      });
    });

    child.on('close', (exitCode, exitSignal) => {
      const outcome = aborted
        ? 'cancelled'
        : timedOut
          ? 'timeout'
          : exitCode === 0
            ? 'healthy'
            : 'failing';
      finish({
        outcome,
        exitCode: typeof exitCode === 'number' ? exitCode : null,
        signal: exitSignal || null,
        error: null,
      });
    });
  });
}
