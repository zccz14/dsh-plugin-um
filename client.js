window.__ModuleLoader__.load({
  id: 'dsh-plugin-um',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useMemo, useRef, useCallback } = React;

    const NS = 'dsh-plugin-um';
    const PANEL_ID = 'ultimate-machines';
    const API = '/api/dsh-plugin-um';

    const EN = {
      panel: 'Ultimate Machines',
      eyebrow: 'TOKEN-FREE AUTOMATION',
      title: 'Machines that stay quiet',
      subtitle: 'One shell command on an interval. Healthy runs cost 0 tokens and stay silent; a failing run wakes its repair session.',
      newMachine: 'New machine',
      refresh: 'Refresh',
      help: 'About Ultimate Machines',
      statTotal: 'Machines',
      statEnabled: 'Enabled',
      statHealthy: 'Healthy',
      statFailing: 'Needs repair',
      statTokenFree: 'Token-free runs',
      statNext: 'Next check',
      emptyTitle: 'No machines yet',
      emptyBody: 'Create a check for a condition that should stay true. It runs as a plain shell command, so healthy checks never spend a token.',
      emptyCta: 'Create your first machine',
      samples: 'Try a sample',
      sampleDisk: 'Disk usage',
      samplePort: 'Local port',
      sampleBackup: 'Backup freshness',
      sampleDiskIntent: 'Keep the root filesystem below 90% used.',
      samplePortIntent: 'Keep the local Web port reachable.',
      sampleBackupIntent: 'A backup should appear within the last 24 hours.',
      sampleDiskCommand: "test $(df -Pk / | awk 'NR==2 {print $5}' | tr -d %) -lt 90",
      samplePortCommand: 'nc -z 127.0.0.1 3080',
      sampleBackupCommand: "find /backups -maxdepth 1 -type f -mmin -1440 | grep -q .",
      every: 'Every',
      lastRun: 'Last check',
      nextRun: 'Next',
      never: 'never',
      notScheduled: 'not scheduled',
      exit: 'exit',
      runNow: 'Run now',
      edit: 'Edit',
      delete: 'Delete',
      openRepair: 'Repair session',
      copy: 'Copy',
      copied: 'Copied to clipboard',
      command: 'Command',
      intent: 'Intent',
      cwd: 'Working directory',
      interval: 'Interval',
      timeout: 'Timeout',
      enabled: 'Enabled',
      name: 'Name',
      cancel: 'Cancel',
      save: 'Save machine',
      create: 'Create machine',
      saving: 'Saving…',
      runningNow: 'Running…',
      deleteTitle: 'Delete this machine?',
      deleteBody: 'The machine stops being scheduled. Its repair session and history stay as an ordinary conversation.',
      deleteConfirm: 'Delete machine',
      helpTitle: 'Why “Ultimate Machine”?',
      helpBody1: 'In 1952, Bell Labs engineers built a small box whose only function was to switch itself off. Claude Shannon kept one on his desk; Marvin Minsky built one too. It became known as the Ultimate Machine.',
      helpBody2: 'This plugin keeps the joke and the discipline: a machine does nothing while the check is healthy. Only failure turns it on.',
      helpBody3: 'Checks run as plain shell commands on the Host. They cost no model tokens. A failure is written into the machine’s repair session, where an agent can fix the condition.',
      helpClose: 'Close',
      fieldName: 'Name',
      fieldNamePlaceholder: 'Disk check',
      fieldCommand: 'Check command',
      fieldCommandPlaceholder: "test $(df -Pk / | awk 'NR==2 {print $5}' | tr -d %) -lt 90",
      fieldIntent: 'Intent',
      fieldIntentPlaceholder: 'What should stay true?',
      fieldInterval: 'Interval (seconds)',
      fieldTimeout: 'Timeout (seconds)',
      fieldCwd: 'Working directory',
      fieldCwdPlaceholder: 'Host default',
      fieldEnabled: 'Enabled',
      fieldNameHint: 'A short label, also used in the repair session title.',
      fieldCommandHint: 'Exit 0 means healthy. Any other exit code becomes a repair request.',
      fieldIntentHint: 'Optional. Tell the repair session what this check protects.',
      fieldIntervalHint: '10 seconds to 30 days.',
      fieldTimeoutHint: '1 to 3600 seconds. A timeout counts as a failure.',
      fieldCwdHint: 'Optional. Relative paths resolve against the Host default.',
      invalidName: 'Give the machine a name.',
      invalidCommand: 'The check command is required.',
      invalidInterval: 'Interval must be between 10 seconds and 30 days.',
      invalidTimeout: 'Timeout must be between 1 and 3600 seconds.',
      saveFailed: 'Could not save the machine.',
      runFailed: 'Could not start the check.',
      deleteFailed: 'Could not delete the machine.',
      loadFailed: 'Could not load machines.',
      retry: 'Retry',
      recentRuns: 'Recent runs',
      noRuns: 'No checks have run yet.',
      showDetails: 'Show details',
      hideDetails: 'Hide details',
      triggerSchedule: 'scheduled',
      triggerManual: 'manual',
      repairDelivered: 'repair requested',
      repairDropped: 'repair dropped',
      repairFailed: 'repair failed',
      repairSkipped: 'repair skipped',
      tokensFree: '0 tokens',
      runOutput: 'Output',
      runStarted: 'Check started',
      machineCreated: 'Machine created',
      machineSaved: 'Machine saved',
      machineDeleted: 'Machine deleted',
      paused: 'Machine paused',
      resumed: 'Machine resumed',
      repairPending: 'The repair session is being created. Try again in a moment.',
      repairUnavailable: 'This Host cannot open the repair session.',
      close: 'Close',
      loading: 'Loading…',
      statusHealthy: 'healthy',
      statusFailing: 'failing',
      statusTimeout: 'timed out',
      statusError: 'error',
      statusCancelled: 'cancelled',
      statusNever: 'not run',
      statusDisabled: 'paused',
      statusRunning: 'running',
      noOutput: '(no output)',
      tokenFreeHint: 'Checks run as shell commands. Only a repair turn uses the model.',
      runs: 'runs',
      healthyRuns: 'healthy',
      repairRequests: 'repairs',
      secondsShort: 's',
      minutesShort: 'm',
      hoursShort: 'h',
      daysShort: 'd',
      runSummary: 'Exit {exit} · {duration} · {trigger}',
      createdAt: 'Created',
      repairSession: 'Repair session',
      open: 'Open',
      commandCopied: 'Command copied',
      dangerNote: 'Commands run on the DSH Host with your user privileges. Failure output is copied into the repair session; do not print secrets.',
      quickIntervals: 'Quick pick',
      quick1m: '1m',
      quick5m: '5m',
      quick15m: '15m',
      quick1h: '1h',
      quick1d: '1d',
      cancelRun: 'Cancel',
    };

    const ZH = {
      panel: '终极机器',
      eyebrow: 'TOKEN-FREE 自动化',
      title: '平时保持沉默的机器',
      subtitle: '一条 shell 命令 + 一个间隔。健康时消耗 0 token 并保持沉默；失败时唤醒它的修复会话。',
      newMachine: '新建机器',
      refresh: '刷新',
      help: '关于终极机器',
      statTotal: '机器',
      statEnabled: '已启用',
      statHealthy: '健康',
      statFailing: '待修复',
      statTokenFree: 'Token-Free 运行',
      statNext: '下次检查',
      emptyTitle: '还没有机器',
      emptyBody: '为一个应当长期成立的条件创建检查。它作为普通 shell 命令运行，健康检查不会消耗任何 token。',
      emptyCta: '创建第一台机器',
      samples: '试试示例',
      sampleDisk: '磁盘使用率',
      samplePort: '本地端口',
      sampleBackup: '备份新鲜度',
      sampleDiskIntent: '确保根分区使用率低于 90%。',
      samplePortIntent: '确保本地 Web 端口可连接。',
      sampleBackupIntent: '确保最近 24 小时内产生过备份。',
      sampleDiskCommand: "test $(df -Pk / | awk 'NR==2 {print $5}' | tr -d %) -lt 90",
      samplePortCommand: 'nc -z 127.0.0.1 3080',
      sampleBackupCommand: "find /backups -maxdepth 1 -type f -mmin -1440 | grep -q .",
      every: '每',
      lastRun: '上次检查',
      nextRun: '下次',
      never: '从未',
      notScheduled: '未排期',
      exit: '退出码',
      runNow: '立即运行',
      edit: '编辑',
      delete: '删除',
      openRepair: '修复会话',
      copy: '复制',
      copied: '已复制到剪贴板',
      command: '命令',
      intent: '意图',
      cwd: '工作目录',
      interval: '间隔',
      timeout: '超时',
      enabled: '启用',
      name: '名称',
      cancel: '取消',
      save: '保存机器',
      create: '创建机器',
      saving: '保存中…',
      runningNow: '运行中…',
      deleteTitle: '删除这台机器？',
      deleteBody: '机器将停止调度。它的修复会话与历史会作为普通会话保留。',
      deleteConfirm: '删除机器',
      helpTitle: '为什么叫「终极机器」？',
      helpBody1: '1952 年，贝尔实验室的工程师做了一个小盒子，它唯一的功能就是把自己关掉。Claude Shannon 在桌上放了一台，Marvin Minsky 也做了一台。它后来被称为「终极机器」。',
      helpBody2: '这个插件保留了同一个玩笑和同一种纪律：检查健康时，机器什么都不做；只有失败才会把它打开。',
      helpBody3: '检查在 Host 上作为普通 shell 命令运行，不消耗模型 token。失败会被写进机器的修复会话，由 Agent 去修复条件。',
      helpClose: '关闭',
      fieldName: '名称',
      fieldNamePlaceholder: '磁盘检查',
      fieldCommand: '检查命令',
      fieldCommandPlaceholder: "test $(df -Pk / | awk 'NR==2 {print $5}' | tr -d %) -lt 90",
      fieldIntent: '意图',
      fieldIntentPlaceholder: '什么条件应当保持成立？',
      fieldInterval: '间隔（秒）',
      fieldTimeout: '超时（秒）',
      fieldCwd: '工作目录',
      fieldCwdPlaceholder: 'Host 默认目录',
      fieldEnabled: '启用',
      fieldNameHint: '简短名称，也会用于修复会话标题。',
      fieldCommandHint: '退出码 0 表示健康；其他退出码会变成修复请求。',
      fieldIntentHint: '可选。告诉修复会话这台机器在保护什么。',
      fieldIntervalHint: '10 秒到 30 天。',
      fieldTimeoutHint: '1 到 3600 秒。超时按失败处理。',
      fieldCwdHint: '可选。相对路径会基于 Host 默认目录解析。',
      invalidName: '请给机器起一个名字。',
      invalidCommand: '检查命令不能为空。',
      invalidInterval: '间隔必须在 10 秒到 30 天之间。',
      invalidTimeout: '超时必须在 1 到 3600 秒之间。',
      saveFailed: '保存机器失败。',
      runFailed: '启动检查失败。',
      deleteFailed: '删除机器失败。',
      loadFailed: '加载机器失败。',
      retry: '重试',
      recentRuns: '最近运行',
      noRuns: '还没有运行过检查。',
      showDetails: '展开详情',
      hideDetails: '收起详情',
      triggerSchedule: '定时',
      triggerManual: '手动',
      repairDelivered: '已请求修复',
      repairDropped: '修复消息已丢弃',
      repairFailed: '修复投递失败',
      repairSkipped: '未请求修复',
      tokensFree: '0 token',
      runOutput: '输出',
      runStarted: '检查已启动',
      machineCreated: '机器已创建',
      machineSaved: '机器已保存',
      machineDeleted: '机器已删除',
      paused: '机器已暂停',
      resumed: '机器已恢复',
      repairPending: '修复会话正在创建，请稍后再试。',
      repairUnavailable: '当前 Host 无法打开修复会话。',
      close: '关闭',
      loading: '加载中…',
      statusHealthy: '健康',
      statusFailing: '失败',
      statusTimeout: '超时',
      statusError: '错误',
      statusCancelled: '已取消',
      statusNever: '未运行',
      statusDisabled: '已暂停',
      statusRunning: '运行中',
      noOutput: '（无输出）',
      tokenFreeHint: '检查作为 shell 命令运行，只有修复回合会使用模型。',
      runs: '次运行',
      healthyRuns: '次健康',
      repairRequests: '次修复',
      secondsShort: '秒',
      minutesShort: '分',
      hoursShort: '时',
      daysShort: '天',
      runSummary: '退出码 {exit} · {duration} · {trigger}',
      createdAt: '创建于',
      repairSession: '修复会话',
      open: '打开',
      commandCopied: '命令已复制',
      dangerNote: '命令以你的用户权限在 DSH Host 上运行。失败输出会被复制进修复会话，请不要打印密钥。',
      quickIntervals: '快捷选择',
      quick1m: '1 分钟',
      quick5m: '5 分钟',
      quick15m: '15 分钟',
      quick1h: '1 小时',
      quick1d: '1 天',
      cancelRun: '取消',
    };

    const CSS = `
.um-page{height:100%;overflow:auto;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);-webkit-font-smoothing:antialiased}
.um-shell{max-width:1120px;margin:0 auto;padding:28px 28px 64px;box-sizing:border-box}
.um-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:4px 0 24px}
.um-eyebrow{color:var(--dsw-alias-brand-primary);font-size:10px;font-weight:750;letter-spacing:.16em;text-transform:uppercase}
.um-title{font-size:28px;line-height:1.15;letter-spacing:-.02em;margin:6px 0 8px}
.um-subtitle{max-width:720px;margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.6}
.um-hero-actions{display:flex;align-items:center;gap:8px;flex:none}
.um-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:30px;padding:5px 11px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:1.2;cursor:pointer;white-space:nowrap;transition:background-color .15s ease,border-color .15s ease,color .15s ease}
.um-btn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-secondary)}
.um-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.um-btn:disabled{opacity:.55;cursor:default}
.um-btn-primary{color:var(--dsw-alias-brand-primary);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,var(--dsw-alias-border-l2));background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,var(--dsw-alias-bg-layer-1))}
.um-btn-primary:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,var(--dsw-alias-bg-layer-1));border-color:var(--dsw-alias-brand-primary)}
.um-btn-danger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,var(--dsw-alias-border-l2));background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,var(--dsw-alias-bg-layer-1))}
.um-btn-danger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,var(--dsw-alias-bg-layer-1))}
.um-icon-btn{width:30px;height:30px;padding:0;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.um-icon-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.um-icon-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.um-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:20px}
.um-stat{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:11px 13px;min-width:0}
.um-stat-label{color:var(--dsw-alias-label-secondary);font-size:10.5px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.um-stat-value{font-size:23px;font-weight:650;letter-spacing:-.02em;line-height:1.2;margin-top:2px;font-variant-numeric:tabular-nums}
.um-stat-value-sm{font-size:15px;padding-top:6px;color:var(--dsw-alias-label-primary)}
.um-stat-healthy .um-stat-value{color:var(--dsw-alias-state-success-primary)}
.um-stat-failing .um-stat-value{color:var(--dsw-alias-state-error-primary)}
.um-stat-free .um-stat-value{color:var(--dsw-alias-brand-primary)}
.um-banner{display:flex;align-items:center;gap:10px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 38%,var(--dsw-alias-border-l2));background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 7%,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-primary);border-radius:10px;padding:9px 12px;font-size:12px;margin-bottom:14px}
.um-banner .um-btn{margin-left:auto}
.um-list{display:flex;flex-direction:column;gap:10px}
.um-card{border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;transition:border-color .15s ease}
.um-card:hover{border-color:color-mix(in srgb,var(--dsw-alias-border-l2) 85%,var(--dsw-alias-label-secondary))}
.um-card-body{padding:15px 17px 13px;min-width:0}
.um-card-head{display:flex;align-items:center;gap:9px;min-width:0}
.um-dot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);flex:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-idle-primary) 12%,transparent)}
.um-dot-healthy{background:var(--dsw-alias-state-success-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-success-primary) 14%,transparent)}
.um-dot-failing,.um-dot-timeout,.um-dot-error{background:var(--dsw-alias-state-error-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent)}
.um-dot-running{background:var(--dsw-alias-brand-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary) 15%,transparent);animation:um-pulse 1.2s ease-in-out infinite}
.um-dot-cancelled,.um-dot-disabled,.um-dot-never{background:var(--dsw-alias-state-idle-primary)}
@keyframes um-pulse{0%,100%{opacity:1}50%{opacity:.4}}
.um-card-name{font-size:15px;font-weight:600;letter-spacing:-.01em;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.um-status{flex:none;font-size:10px;font-weight:650;letter-spacing:.02em;border-radius:999px;padding:2px 7px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}
.um-status-healthy{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 35%,var(--dsw-alias-border-l2));background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 8%,var(--dsw-alias-bg-layer-2))}
.um-status-failing,.um-status-timeout,.um-status-error{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,var(--dsw-alias-border-l2));background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,var(--dsw-alias-bg-layer-2))}
.um-status-running{color:var(--dsw-alias-brand-primary);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 35%,var(--dsw-alias-border-l2));background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,var(--dsw-alias-bg-layer-2))}
.um-card-spacer{flex:1}
.um-meta{display:flex;flex-wrap:wrap;align-items:center;gap:4px 7px;color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:1.4;margin-top:5px;min-width:0}
.um-meta-sep{opacity:.5}
.um-token-badge{color:var(--dsw-alias-state-success-primary);border:1px solid color-mix(in srgb,var(--dsw-alias-state-success-primary) 32%,var(--dsw-alias-border-l2));background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 7%,transparent);border-radius:999px;padding:0 6px;font-size:10px;font-weight:650;line-height:1.6;white-space:nowrap}
.um-command{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;max-height:72px;overflow:auto;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:7px 9px;margin:9px 0 0;color:var(--dsw-alias-label-primary)}
.um-intent{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5;margin:8px 0 0;overflow-wrap:anywhere}
.um-foot{display:flex;align-items:center;flex-wrap:wrap;gap:7px 12px;border-top:1px solid var(--dsw-alias-border-l1);margin-top:11px;padding-top:9px;color:var(--dsw-alias-label-secondary);font-size:11px;min-width:0}
.um-foot strong{color:var(--dsw-alias-label-primary);font-weight:600}
.um-foot .um-link{font-size:11px}
.um-link{color:var(--dsw-alias-brand-primary);background:none;border:none;padding:0;font:inherit;cursor:pointer;text-align:left;white-space:nowrap}
.um-link:hover{text-decoration:underline}
.um-link:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;border-radius:3px}
.um-actions{margin-left:auto;display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.um-actions .um-btn{min-height:26px;padding:3px 8px;font-size:11px}
.um-detail{border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);padding:13px 17px 15px}
.um-detail-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
.um-detail-title{font-size:11px;font-weight:650;letter-spacing:.02em;color:var(--dsw-alias-label-secondary);text-transform:uppercase}
.um-runs{display:flex;flex-direction:column;gap:3px;max-height:190px;overflow:auto;padding-right:2px}
.um-run{display:grid;grid-template-columns:118px 58px 54px 64px minmax(0,1fr);align-items:center;gap:8px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:10.5px;line-height:1.3;padding:4px 6px;cursor:pointer;text-align:left;min-width:0}
.um-run:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.um-run-selected{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.um-run-time{font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.um-run-exit{font-variant-numeric:tabular-nums;font-weight:600}
.um-run-exit-ok{color:var(--dsw-alias-state-success-primary)}
.um-run-exit-bad{color:var(--dsw-alias-state-error-primary)}
.um-run-repair{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.um-output{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:9px 10px;margin:8px 0 0;max-height:220px;overflow:auto;color:var(--dsw-alias-label-primary)}
.um-empty{border:1px dashed var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-layer-1);padding:44px 24px;text-align:center}
.um-empty-icon{width:52px;height:52px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 25%,var(--dsw-alias-border-l2));margin-bottom:14px}
.um-empty-title{font-size:16px;font-weight:600;margin:0 0 6px}
.um-empty-body{max-width:520px;margin:0 auto 18px;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.6}
.um-samples{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px;margin:16px 0 0;color:var(--dsw-alias-label-secondary);font-size:11px}
.um-samples-label{opacity:.85;margin-right:2px}
.um-chip{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:999px;padding:3px 9px;font:inherit;font-size:10.5px;cursor:pointer}
.um-chip:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.um-chip:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.um-loading{display:flex;align-items:center;justify-content:center;gap:8px;padding:64px 0;color:var(--dsw-alias-label-secondary);font-size:12px}
.um-spinner{width:14px;height:14px;border-radius:50%;border:2px solid color-mix(in srgb,var(--dsw-alias-label-secondary) 25%,transparent);border-top-color:var(--dsw-alias-brand-primary);animation:um-spin .8s linear infinite;flex:none}
@keyframes um-spin{to{transform:rotate(360deg)}}
.um-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:1200;max-width:min(520px,calc(100vw - 32px));background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:8px 16px;font-size:12px;line-height:1.4;text-align:center;box-shadow:0 10px 34px color-mix(in srgb,var(--dsw-alias-label-primary) 16%,transparent)}
.um-overlay{position:fixed;inset:0;z-index:1000;background:color-mix(in srgb,var(--dsw-alias-label-primary) 26%,transparent);display:flex;align-items:center;justify-content:center;padding:24px}
.um-dialog{width:min(680px,100%);max-height:min(88vh,780px);display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:16px;box-shadow:0 22px 70px color-mix(in srgb,var(--dsw-alias-label-primary) 20%,transparent);overflow:hidden}
.um-dialog-sm{width:min(460px,100%)}
.um-dialog-head{display:flex;align-items:flex-start;gap:12px;padding:18px 20px 13px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none}
.um-dialog-heading{min-width:0;flex:1}
.um-dialog-title{font-size:16px;font-weight:650;letter-spacing:-.01em;margin:0}
.um-dialog-subtitle{color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:1.5;margin:4px 0 0;overflow-wrap:anywhere}
.um-dialog-body{padding:16px 20px;overflow:auto;min-height:0}
.um-dialog-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 20px;border-top:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 55%,var(--dsw-alias-bg-overlay));flex:none}
.um-form{display:flex;flex-direction:column;gap:13px}
.um-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.um-field{display:flex;flex-direction:column;gap:5px;min-width:0}
.um-label{font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-primary)}
.um-label-row{display:flex;align-items:baseline;gap:7px}
.um-hint{font-size:10.5px;line-height:1.45;color:var(--dsw-alias-label-secondary);margin:0}
.um-input,.um-textarea{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;line-height:1.4;padding:7px 9px}
.um-input:focus,.um-textarea:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:0;border-color:var(--dsw-alias-brand-primary)}
.um-textarea{resize:vertical;min-height:72px}
.um-textarea-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;min-height:104px;white-space:pre;overflow:auto}
.um-field-error{color:var(--dsw-alias-state-error-primary);font-size:10.5px;line-height:1.4}
.um-form-error{border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 38%,var(--dsw-alias-border-l2));background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 7%,transparent);color:var(--dsw-alias-label-primary);border-radius:8px;padding:7px 9px;font-size:11.5px;line-height:1.45}
.um-switch-row{display:flex;align-items:center;gap:10px;justify-content:space-between;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:9px;padding:8px 10px}
.um-switch-copy{min-width:0}
.um-switch-title{font-size:11.5px;font-weight:600}
.um-switch-hint{font-size:10.5px;color:var(--dsw-alias-label-secondary);line-height:1.4;margin-top:1px}
.um-switch{width:34px;height:20px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);position:relative;cursor:pointer;padding:0;flex:none;transition:background-color .15s ease,border-color .15s ease}
.um-switch-on{background:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 70%,var(--dsw-alias-border-l2))}
.um-switch:disabled{opacity:.5;cursor:default}
.um-switch:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.um-switch-thumb{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-bg-layer-1);box-shadow:0 1px 2px color-mix(in srgb,var(--dsw-alias-label-primary) 20%,transparent);transition:transform .15s ease}
.um-switch-on .um-switch-thumb{transform:translateX(14px)}
.um-quick{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.um-quick .um-chip{font-size:10px;padding:2px 7px}
.um-samples-form{display:flex;flex-wrap:wrap;align-items:center;gap:5px;border:1px dashed var(--dsw-alias-border-l2);border-radius:9px;padding:7px 9px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 55%,transparent)}
.um-samples-form-label{color:var(--dsw-alias-label-secondary);font-size:10.5px;margin-right:2px}
.um-help-demo{display:flex;justify-content:center;padding:4px 0 16px}
.um-help-demo svg{width:150px;height:92px}
.um-help-led{animation:um-led 3.6s ease-in-out infinite}
@keyframes um-led{0%,55%{opacity:.95}70%,100%{opacity:.28}}
.um-help-toggle{animation:um-toggle 3.6s ease-in-out infinite;transform-origin:center}
@keyframes um-toggle{0%,55%{transform:translateX(0)}70%,100%{transform:translateX(13px)}}
.um-help-copy p{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.65;margin:0 0 10px}
.um-help-copy p:last-child{margin-bottom:0}
.um-danger-note{display:flex;gap:7px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary) 35%,var(--dsw-alias-border-l2));background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 7%,transparent);border-radius:8px;padding:7px 9px;color:var(--dsw-alias-label-secondary);font-size:10.5px;line-height:1.5;margin-top:13px}
.um-danger-note svg{flex:none;margin-top:1px;color:var(--dsw-alias-state-warn-primary)}
.um-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media (max-width:960px){.um-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.um-hero{flex-direction:column;gap:14px}.um-hero-actions{width:100%;flex-wrap:wrap}.um-stat-next{grid-column:span 2}}
@media (max-width:640px){.um-shell{padding:18px 14px 48px}.um-title{font-size:23px}.um-card-body{padding:13px 13px 11px}.um-detail{padding:12px 13px}.um-form-grid{grid-template-columns:1fr}.um-run{grid-template-columns:1fr 1fr;gap:3px 8px}.um-run-repair{grid-column:span 2}.um-overlay{padding:10px}.um-dialog{max-height:94vh}.um-dialog-head,.um-dialog-body,.um-dialog-foot{padding-left:14px;padding-right:14px}.um-actions{margin-left:0;width:100%;justify-content:flex-end}.um-foot{gap:6px 9px}}
`;

    const SAMPLE_SET = [
      {
        key: 'disk', name: 'sampleDisk', intent: 'sampleDiskIntent', command: 'sampleDiskCommand', title: 'Disk usage',
      },
      {
        key: 'port', name: 'samplePort', intent: 'samplePortIntent', command: 'samplePortCommand', title: 'Local port',
      },
      {
        key: 'backup', name: 'sampleBackup', intent: 'sampleBackupIntent', command: 'sampleBackupCommand', title: 'Backup freshness',
      },
    ];

    let portal = null;
    try {
      const ReactDOM = require('react-dom');
      if (typeof ReactDOM.createPortal === 'function') portal = ReactDOM.createPortal;
    } catch {
      portal = null;
    }

    function Overlay({ children }) {
      if (portal) return portal(children, document.body);
      return children;
    }

    function currentLocaleId(ctx) {
      try {
        const snapshot = ctx.locale.getSnapshot?.() ?? ctx.locale.getLocale?.();
        const id = snapshot?.id ?? snapshot?.locale ?? (typeof document !== 'undefined' ? document.documentElement.lang : '');
        return id || 'en';
      } catch {
        return 'en';
      }
    }

    function formatRelative(ts, locale) {
      if (typeof ts !== 'number' || !Number.isFinite(ts)) return '';
      const diff = ts - Date.now();
      const abs = Math.abs(diff);
      const units = [
        ['year', 31_536_000_000],
        ['month', 2_592_000_000],
        ['day', 86_400_000],
        ['hour', 3_600_000],
        ['minute', 60_000],
        ['second', 1_000],
      ];
      let unit = 'second';
      let value = diff / 1_000;
      for (const [name, ms] of units) {
        if (abs >= ms || name === 'second') {
          unit = name;
          value = diff / ms;
          break;
        }
      }
      try {
        return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(Math.round(value), unit);
      } catch {
        return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(Math.round(value), unit);
      }
    }

    function formatInterval(seconds, locale, t) {
      if (!Number.isFinite(seconds) || seconds <= 0) return '';
      const units = [
        ['day', 86_400],
        ['hour', 3_600],
        ['minute', 60],
      ];
      for (const [unit, size] of units) {
        if (seconds % size === 0) {
          const value = seconds / size;
          try {
            return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'long' }).format(value);
          } catch {
            return `${value} ${unit}${value === 1 ? '' : 's'}`;
          }
        }
      }
      try {
        return new Intl.NumberFormat(locale, { style: 'unit', unit: 'second', unitDisplay: 'long' }).format(seconds);
      } catch {
        return `${seconds} ${t('secondsShort')}`;
      }
    }

    function formatDuration(ms) {
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

    async function api(action, payload = {}, signal) {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
        signal,
      });
      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      if (!response.ok || body?.ok !== true) {
        const error = new Error(body?.error?.message || `Request failed (${response.status}).`);
        error.code = body?.error?.code;
        throw error;
      }
      return body.value;
    }

    function statusLabel(status, t) {
      if (status === 'healthy') return t('statusHealthy');
      if (status === 'failing') return t('statusFailing');
      if (status === 'timeout') return t('statusTimeout');
      if (status === 'error') return t('statusError');
      if (status === 'cancelled') return t('statusCancelled');
      if (status === 'disabled') return t('statusDisabled');
      if (status === 'running') return t('statusRunning');
      return t('statusNever');
    }

    function repairLabel(value, t) {
      if (value === 'delivered') return t('repairDelivered');
      if (value === 'dropped') return t('repairDropped');
      if (value === 'failed') return t('repairFailed');
      if (value === 'skipped') return t('repairSkipped');
      return '';
    }

    function Icon({ name, size = 15 }) {
      const common = {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        style: { display: 'block', flex: 'none' },
      };
      if (name === 'plus') return h('svg', common, h('path', { d: 'M12 5v14M5 12h14' }));
      if (name === 'refresh') return h('svg', common, h('path', { d: 'M20 11a8 8 0 1 0-2.3 6.3M20 5v6h-6' }));
      if (name === 'info') return h('svg', common, h('circle', { cx: 12, cy: 12, r: 8.5 }), h('path', { d: 'M12 11v5M12 7.6v.1' }));
      if (name === 'play') return h('svg', common, h('path', { d: 'M8 5.5v13l11-6.5-11-6.5Z' }));
      if (name === 'edit') return h('svg', common, h('path', { d: 'M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z' }), h('path', { d: 'M13.5 6.5l3 3' }));
      if (name === 'trash') return h('svg', common, h('path', { d: 'M4 7h16M9 7V4.5h6V7M6.5 7l.8 12.5h9.4L17.5 7M10 11v5M14 11v5' }));
      if (name === 'chevron') return h('svg', common, h('path', { d: 'M6 9l6 6 6-6' }));
      if (name === 'copy') return h('svg', common, h('rect', { x: 8, y: 8, width: 12, height: 12, rx: 2 }), h('path', { d: 'M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2' }));
      if (name === 'external') return h('svg', common, h('path', { d: 'M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4' }));
      if (name === 'check') return h('svg', common, h('path', { d: 'M5 12.5l4 4L19 7' }));
      if (name === 'alert') return h('svg', common, h('path', { d: 'M12 4l9 16H3l9-16ZM12 10v4.5M12 17.4v.1' }));
      if (name === 'power') return h('svg', common, h('path', { d: 'M12 3v8M6.4 6.4a8 8 0 1 0 11.2 0' }));
      if (name === 'close') return h('svg', common, h('path', { d: 'M6 6l12 12M18 6L6 18' }));
      return null;
    }

    function PanelIcon({ size = 20, active }) {
      return h('svg', {
        viewBox: '0 0 24 24',
        width: size,
        height: size,
        'aria-hidden': true,
        style: { display: 'block', opacity: active ? 1 : 0.86 },
      },
      h('rect', { x: 3.8, y: 6.4, width: 16.4, height: 12.2, rx: 2.6, fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 }),
      h('path', { d: 'M8.1 3.2h7.8', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }),
      h('path', { d: 'M12 3.2v3.2', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }),
      h('circle', { cx: 12, cy: 12.5, r: 2.05, fill: 'currentColor' }));
    }

    function Switch({ checked, onChange, label, disabled }) {
      return h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': checked,
        'aria-label': label,
        disabled,
        className: `um-switch${checked ? ' um-switch-on' : ''}`,
        onClick: () => onChange(!checked),
      }, h('span', { className: 'um-switch-thumb' }));
    }

    function Stat({ label, value, tone, small, className }) {
      return h('div', { className: `um-stat${tone ? ` um-stat-${tone}` : ''}${className ? ` ${className}` : ''}` },
        h('div', { className: 'um-stat-label' }, label),
        h('div', { className: `um-stat-value${small ? ' um-stat-value-sm' : ''}` }, value));
    }

    function Dialog({ title, subtitle, children, footer, onClose, small }) {
      useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [onClose]);
      return h(Overlay, null, h('div', {
        className: 'um-overlay',
        role: 'presentation',
        onMouseDown: (event) => {
          if (event.target === event.currentTarget) onClose();
        },
      }, h('div', {
        className: `um-dialog${small ? ' um-dialog-sm' : ''}`,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'um-dialog-title',
      },
      h('div', { className: 'um-dialog-head' },
        h('div', { className: 'um-dialog-heading' },
          h('h2', { className: 'um-dialog-title', id: 'um-dialog-title' }, title),
          subtitle ? h('p', { className: 'um-dialog-subtitle' }, subtitle) : null),
        h('button', { type: 'button', className: 'um-icon-btn', 'aria-label': 'Close', title: 'Close', onClick: onClose }, h(Icon, { name: 'close' }))),
      h('div', { className: 'um-dialog-body' }, children),
      footer ? h('div', { className: 'um-dialog-foot' }, footer) : null)));
    }

    function MachineDialog({ mode, machine, sample, onClose, onSave, saving, saveError, t }) {
      const [form, setForm] = useState(() => ({
        name: machine?.name ?? (sample ? t(sample.name) : ''),
        command: machine?.command ?? (sample ? t(sample.command) : ''),
        intent: machine?.intent ?? (sample ? t(sample.intent) : ''),
        intervalSeconds: machine?.intervalSeconds ?? 300,
        timeoutSeconds: machine?.timeoutSeconds ?? 300,
        cwd: machine?.cwd ?? '',
        enabled: machine?.enabled ?? true,
      }));
      const [errors, setErrors] = useState({});
      const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
      const applySample = (sample) => {
        setForm((current) => ({
          ...current,
          name: t(sample.name),
          intent: t(sample.intent),
          command: t(sample.command),
        }));
      };
      const submit = (event) => {
        event.preventDefault();
        const next = {};
        if (form.name.trim() === '') next.name = t('invalidName');
        if (form.command.trim() === '') next.command = t('invalidCommand');
        const interval = Number(form.intervalSeconds);
        if (!Number.isFinite(interval) || interval < 10 || interval > 2_592_000) next.intervalSeconds = t('invalidInterval');
        const timeout = Number(form.timeoutSeconds);
        if (!Number.isFinite(timeout) || timeout < 1 || timeout > 3_600) next.timeoutSeconds = t('invalidTimeout');
        setErrors(next);
        if (Object.keys(next).length > 0) return;
        onSave({
          ...(machine?.id ? { id: machine.id } : {}),
          name: form.name.trim(),
          command: form.command.trim(),
          intent: form.intent.trim(),
          intervalSeconds: Math.trunc(interval),
          timeoutSeconds: Math.trunc(timeout),
          cwd: form.cwd.trim(),
          enabled: form.enabled,
        });
      };
      const quick = [
        [60, 'quick1m'],
        [300, 'quick5m'],
        [900, 'quick15m'],
        [3600, 'quick1h'],
        [86400, 'quick1d'],
      ];
      return h(Dialog, {
        title: mode === 'edit' ? t('edit') : t('newMachine'),
        subtitle: mode === 'edit' ? (machine?.name ?? '') : t('tokenFreeHint'),
        onClose,
        footer: [
          h('button', { key: 'cancel', type: 'button', className: 'um-btn', onClick: onClose }, t('cancel')),
          h('button', {
            key: 'submit',
            type: 'submit',
            form: 'um-machine-form',
            className: 'um-btn um-btn-primary',
            disabled: saving,
          }, saving ? t('saving') : (mode === 'edit' ? t('save') : t('create'))),
        ],
      }, h('form', { id: 'um-machine-form', className: 'um-form', onSubmit: submit },
        saveError ? h('div', { className: 'um-form-error', role: 'alert' }, saveError) : null,
        h('div', { className: 'um-field' },
          h('div', { className: 'um-label-row' }, h('label', { className: 'um-label', htmlFor: 'um-name' }, t('fieldName'))),
          h('input', {
            id: 'um-name',
            className: 'um-input',
            value: form.name,
            autoFocus: true,
            placeholder: t('fieldNamePlaceholder'),
            onChange: (event) => set('name', event.target.value),
          }),
          errors.name ? h('div', { className: 'um-field-error' }, errors.name) : h('p', { className: 'um-hint' }, t('fieldNameHint'))),
        h('div', { className: 'um-field' },
          h('label', { className: 'um-label', htmlFor: 'um-command' }, t('fieldCommand')),
          h('textarea', {
            id: 'um-command',
            className: 'um-textarea um-textarea-code',
            value: form.command,
            spellCheck: false,
            placeholder: t('fieldCommandPlaceholder'),
            onChange: (event) => set('command', event.target.value),
          }),
          errors.command ? h('div', { className: 'um-field-error' }, errors.command) : h('p', { className: 'um-hint' }, t('fieldCommandHint'))),
        h('div', { className: 'um-field' },
          h('label', { className: 'um-label', htmlFor: 'um-intent' }, t('fieldIntent')),
          h('textarea', {
            id: 'um-intent',
            className: 'um-textarea',
            value: form.intent,
            placeholder: t('fieldIntentPlaceholder'),
            onChange: (event) => set('intent', event.target.value),
            style: { minHeight: 56 },
          }),
          h('p', { className: 'um-hint' }, t('fieldIntentHint'))),
        h('div', { className: 'um-form-grid' },
          h('div', { className: 'um-field' },
            h('label', { className: 'um-label', htmlFor: 'um-interval' }, t('fieldInterval')),
            h('input', {
              id: 'um-interval',
              className: 'um-input',
              type: 'number',
              min: 10,
              max: 2_592_000,
              step: 1,
              value: form.intervalSeconds,
              onChange: (event) => set('intervalSeconds', event.target.value),
            }),
            errors.intervalSeconds ? h('div', { className: 'um-field-error' }, errors.intervalSeconds) : h('p', { className: 'um-hint' }, t('fieldIntervalHint')),
            h('div', { className: 'um-quick' }, quick.map(([value, key]) => h('button', {
              key,
              type: 'button',
              className: 'um-chip',
              onClick: () => set('intervalSeconds', value),
            }, t(key))))),
          h('div', { className: 'um-field' },
            h('label', { className: 'um-label', htmlFor: 'um-timeout' }, t('fieldTimeout')),
            h('input', {
              id: 'um-timeout',
              className: 'um-input',
              type: 'number',
              min: 1,
              max: 3_600,
              step: 1,
              value: form.timeoutSeconds,
              onChange: (event) => set('timeoutSeconds', event.target.value),
            }),
            errors.timeoutSeconds ? h('div', { className: 'um-field-error' }, errors.timeoutSeconds) : h('p', { className: 'um-hint' }, t('fieldTimeoutHint')))),
        h('div', { className: 'um-field' },
          h('label', { className: 'um-label', htmlFor: 'um-cwd' }, t('fieldCwd')),
          h('input', {
            id: 'um-cwd',
            className: 'um-input',
            value: form.cwd,
            placeholder: t('fieldCwdPlaceholder'),
            onChange: (event) => set('cwd', event.target.value),
          }),
          h('p', { className: 'um-hint' }, t('fieldCwdHint'))),
        h('div', { className: 'um-switch-row' },
          h('div', { className: 'um-switch-copy' },
            h('div', { className: 'um-switch-title' }, t('fieldEnabled')),
            h('div', { className: 'um-switch-hint' }, t('tokenFreeHint'))),
          h(Switch, {
            checked: form.enabled,
            label: t('fieldEnabled'),
            onChange: (value) => set('enabled', value),
          })),
        h('div', { className: 'um-samples-form' },
          h('span', { className: 'um-samples-form-label' }, t('samples')),
          SAMPLE_SET.map((sample) => h('button', {
            key: sample.key,
            type: 'button',
            className: 'um-chip',
            onClick: () => applySample(sample),
          }, t(sample.name)))),
        h('div', { className: 'um-danger-note' },
          h(Icon, { name: 'alert', size: 13 }),
          h('span', null, t('dangerNote')))),
      );
    }

    function HelpDialog({ onClose, t }) {
      return h(Dialog, {
        title: t('helpTitle'),
        subtitle: t('panel'),
        onClose,
        small: true,
        footer: [h('button', { key: 'close', type: 'button', className: 'um-btn um-btn-primary', onClick: onClose }, t('helpClose'))],
      }, h('div', { className: 'um-help-demo' },
        h('svg', { viewBox: '0 0 150 92', 'aria-hidden': true },
          h('rect', { x: 18, y: 26, width: 114, height: 52, rx: 10, fill: 'var(--dsw-alias-bg-layer-1)', stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 2 }),
          h('rect', { x: 36, y: 40, width: 46, height: 18, rx: 9, fill: 'var(--dsw-alias-bg-layer-2)', stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 1.5 }),
          h('circle', { cx: 45, cy: 49, r: 6, fill: 'var(--dsw-alias-label-secondary)', className: 'um-help-toggle' }),
          h('circle', { cx: 104, cy: 49, r: 5, fill: 'var(--dsw-alias-state-success-primary)', className: 'um-help-led' }),
          h('path', { d: 'M96 62h16M28 62h26', stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 2, strokeLinecap: 'round' }),
          h('path', { d: 'M75 26V14', stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 2, strokeLinecap: 'round' }),
          h('path', { d: 'M75 10v2', stroke: 'var(--dsw-alias-state-success-primary)', strokeWidth: 2.5, strokeLinecap: 'round' }))),
      h('div', { className: 'um-help-copy' },
        h('p', null, t('helpBody1')),
        h('p', null, t('helpBody2')),
        h('p', null, t('helpBody3'))));
    }

    function ConfirmDialog({ machine, onClose, onDelete, deleting, t }) {
      return h(Dialog, {
        title: t('deleteTitle'),
        subtitle: machine.name,
        onClose,
        small: true,
        footer: [
          h('button', { key: 'cancel', type: 'button', className: 'um-btn', onClick: onClose }, t('cancel')),
          h('button', { key: 'delete', type: 'button', className: 'um-btn um-btn-danger', onClick: onDelete, disabled: deleting }, deleting ? t('saving') : t('deleteConfirm')),
        ],
      }, h('p', { className: 'um-hint', style: { fontSize: 12, lineHeight: 1.6, margin: 0 } }, t('deleteBody')));
    }

    function MachinesPage({ ctx }) {
      const [locale, setLocale] = useState(() => currentLocaleId(ctx));
      const t = useMemo(() => ctx.locale.bind(NS), []);
      useEffect(() => {
        const dispose = ctx.locale.subscribe?.(() => setLocale(currentLocaleId(ctx)));
        return () => {
          if (typeof dispose === 'function') dispose();
        };
      }, []);

      const [data, setData] = useState(null);
      const [loadError, setLoadError] = useState('');
      const [loading, setLoading] = useState(true);
      const [refreshing, setRefreshing] = useState(false);
      const [dialog, setDialog] = useState(null);
      const [deleteTarget, setDeleteTarget] = useState(null);
      const [helpOpen, setHelpOpen] = useState(false);
      const [toast, setToast] = useState(null);
      const [saving, setSaving] = useState(false);
      const [saveError, setSaveError] = useState('');
      const [deleting, setDeleting] = useState(false);
      const [busy, setBusy] = useState({});
      const [expanded, setExpanded] = useState(null);
      const [detail, setDetail] = useState(null);
      const [detailLoading, setDetailLoading] = useState(false);
      const [selectedRunId, setSelectedRunId] = useState(null);
      const mounted = useRef(true);
      const refreshingRef = useRef(false);
      const detailRequest = useRef(0);

      useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
      }, []);

      useEffect(() => {
        if (!toast) return undefined;
        const handle = setTimeout(() => setToast(null), 4_000);
        return () => clearTimeout(handle);
      }, [toast]);

      const refresh = useCallback(async (quiet = false) => {
        if (refreshingRef.current) return;
        refreshingRef.current = true;
        if (!quiet) setRefreshing(true);
        try {
          const value = await api('list');
          if (!mounted.current) return;
          setData(value);
          setLoadError('');
        } catch (error) {
          if (!mounted.current) return;
          setLoadError(error instanceof Error ? error.message : String(error));
        } finally {
          refreshingRef.current = false;
          if (mounted.current) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      }, []);

      useEffect(() => {
        void refresh();
        const handle = setInterval(() => {
          if (typeof document !== 'undefined' && document.hidden) return;
          void refresh(true);
        }, 5_000);
        return () => clearInterval(handle);
      }, [refresh]);

      const setBusyFor = (id, value) => setBusy((current) => ({ ...current, [id]: value }));

      const onToggle = async (machine, value) => {
        setBusyFor(machine.id, 'toggle');
        try {
          await api('setEnabled', { id: machine.id, enabled: value });
          setToast(value ? t('resumed') : t('paused'));
          await refresh(true);
        } catch (error) {
          setToast(error instanceof Error ? error.message : String(error));
        } finally {
          setBusyFor(machine.id, null);
        }
      };

      const onRun = async (machine) => {
        setBusyFor(machine.id, 'run');
        try {
          await api('run', { id: machine.id, wait: false });
          setToast(t('runStarted'));
          await refresh(true);
          if (expanded === machine.id) void loadDetail(machine.id);
        } catch (error) {
          setToast(error instanceof Error ? error.message : String(error));
        } finally {
          setBusyFor(machine.id, null);
        }
      };

      const onSave = async (form) => {
        setSaving(true);
        setSaveError('');
        try {
          const isEdit = typeof form.id === 'string';
          await api('save', { machine: form });
          setDialog(null);
          setToast(isEdit ? t('machineSaved') : t('machineCreated'));
          await refresh(true);
        } catch (error) {
          setSaveError(error instanceof Error ? error.message : String(error));
        } finally {
          setSaving(false);
        }
      };

      const onDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
          await api('delete', { id: deleteTarget.id });
          setDeleteTarget(null);
          setToast(t('machineDeleted'));
          if (expanded === deleteTarget.id) {
            setExpanded(null);
            setDetail(null);
          }
          await refresh(true);
        } catch (error) {
          setToast(error instanceof Error ? error.message : String(error));
        } finally {
          setDeleting(false);
        }
      };

      const loadDetail = async (id) => {
        const requestId = detailRequest.current + 1;
        detailRequest.current = requestId;
        setDetailLoading(true);
        try {
          const value = await api('get', { id, includeRuns: true, runLimit: 20 });
          if (!mounted.current || detailRequest.current !== requestId) return;
          setDetail(value);
          setSelectedRunId(value.runs?.[0]?.id ?? null);
        } catch (error) {
          if (!mounted.current || detailRequest.current !== requestId) return;
          setToast(error instanceof Error ? error.message : String(error));
        } finally {
          if (mounted.current && detailRequest.current === requestId) setDetailLoading(false);
        }
      };

      const onExpand = (machine) => {
        if (expanded === machine.id) {
          setExpanded(null);
          setDetail(null);
          setSelectedRunId(null);
          return;
        }
        setExpanded(machine.id);
        setDetail(null);
        setSelectedRunId(null);
        void loadDetail(machine.id);
      };

      const onOpenRepair = (machine) => {
        if (!machine.repairSessionId) {
          setToast(t('repairPending'));
          return;
        }
        try {
          const workspace = ctx.uiWorkspace;
          if (workspace && typeof workspace.openSession === 'function') {
            workspace.openSession(machine.repairSessionId);
          } else {
            setToast(t('repairUnavailable'));
          }
        } catch {
          setToast(t('repairUnavailable'));
        }
      };

      const onCopy = async (text, message) => {
        try {
          await navigator.clipboard.writeText(text);
          setToast(message);
        } catch {
          setToast(text);
        }
      };

      const summary = data?.summary;
      const machines = data?.machines ?? [];
      const selectedRun = detail?.runs?.find((run) => run.id === selectedRunId) ?? detail?.runs?.[0] ?? null;

      return h('div', { className: 'um-page' },
        h('div', { className: 'um-shell' },
          h('header', { className: 'um-hero' },
            h('div', null,
              h('div', { className: 'um-eyebrow' }, t('eyebrow')),
              h('h1', { className: 'um-title' }, t('title')),
              h('p', { className: 'um-subtitle' }, t('subtitle'))),
            h('div', { className: 'um-hero-actions' },
              h('button', { type: 'button', className: 'um-icon-btn', 'aria-label': t('help'), title: t('help'), onClick: () => setHelpOpen(true) }, h(Icon, { name: 'info', size: 16 })),
              h('button', { type: 'button', className: 'um-btn', onClick: () => refresh(), disabled: refreshing },
                refreshing ? h('span', { className: 'um-spinner' }) : h(Icon, { name: 'refresh' }),
                t('refresh')),
              h('button', { type: 'button', className: 'um-btn um-btn-primary', onClick: () => { setSaveError(''); setDialog({ mode: 'create' }); } },
                h(Icon, { name: 'plus' }),
                t('newMachine')))),
          h('div', { className: 'um-stats' },
            h(Stat, { label: t('statTotal'), value: summary?.total ?? '—' }),
            h(Stat, { label: t('statEnabled'), value: summary?.enabled ?? '—' }),
            h(Stat, { label: t('statHealthy'), value: summary?.healthy ?? '—', tone: 'healthy' }),
            h(Stat, { label: t('statFailing'), value: summary?.failing ?? '—', tone: 'failing' }),
            h(Stat, { label: t('statTokenFree'), value: summary?.tokenFreeRuns ?? '—', tone: 'free' })),
          loadError ? h('div', { className: 'um-banner', role: 'alert' },
            h(Icon, { name: 'alert', size: 14 }),
            h('span', null, loadError),
            h('button', { type: 'button', className: 'um-btn', onClick: () => refresh() }, t('retry'))) : null,
          loading && data === null ? h('div', { className: 'um-loading' }, h('span', { className: 'um-spinner' }), t('loading')) : null,
          !loading && !loadError && machines.length === 0 ? h('div', { className: 'um-empty' },
            h('div', { className: 'um-empty-icon' }, h(Icon, { name: 'power', size: 25 })),
            h('h2', { className: 'um-empty-title' }, t('emptyTitle')),
            h('p', { className: 'um-empty-body' }, t('emptyBody')),
            h('button', { type: 'button', className: 'um-btn um-btn-primary', onClick: () => { setSaveError(''); setDialog({ mode: 'create' }); } }, h(Icon, { name: 'plus' }), t('emptyCta')),
            h('div', { className: 'um-samples' },
              h('span', { className: 'um-samples-label' }, t('samples')),
              SAMPLE_SET.map((sample) => h('button', {
                key: sample.key,
                type: 'button',
                className: 'um-chip',
                onClick: () => { setSaveError(''); setDialog({ mode: 'create', sample }); },
              }, t(sample.name))))) : null,
          machines.length > 0 ? h('div', { className: 'um-list' }, machines.map((machine) => {
            const open = expanded === machine.id;
            const machineDetail = open ? detail : null;
            return h('article', { key: machine.id, className: 'um-card' },
              h('div', { className: 'um-card-body' },
                h('div', { className: 'um-card-head' },
                  h('span', { className: `um-dot um-dot-${machine.status}` }),
                  h('h3', { className: 'um-card-name', title: machine.name }, machine.name),
                  h('span', { className: `um-status um-status-${machine.status}` }, statusLabel(machine.status, t)),
                  h('span', { className: 'um-card-spacer' }),
                  h(Switch, {
                    checked: machine.enabled,
                    label: t('enabled'),
                    disabled: Boolean(busy[machine.id]),
                    onChange: (value) => onToggle(machine, value),
                  })),
                h('div', { className: 'um-meta' },
                  h('span', null, `${t('every')} ${formatInterval(machine.intervalSeconds, locale, t)}`),
                  h('span', { className: 'um-meta-sep' }, '·'),
                  h('span', null, `${t('lastRun')} ${machine.lastRunAt ? formatRelative(machine.lastRunAt, locale) : t('never')}`),
                  h('span', { className: 'um-meta-sep' }, '·'),
                  h('span', null, `${t('nextRun')} ${machine.enabled ? (machine.nextRunAt ? formatRelative(machine.nextRunAt, locale) : t('running')) : t('notScheduled')}`),
                  h('span', { className: 'um-meta-sep' }, '·'),
                  h('span', { className: 'um-token-badge', title: t('tokenFreeHint') }, t('tokensFree'))),
                h('pre', { className: 'um-command' }, machine.command),
                machine.intent ? h('p', { className: 'um-intent' }, machine.intent) : null,
                h('div', { className: 'um-foot' },
                  h('span', null, machine.lastExit === null ? t('never') : `${t('exit')} ${machine.lastExit}`),
                  h('span', null, `${machine.totalRuns} ${t('runs')} · ${machine.healthyRuns} ${t('healthyRuns')}`),
                  machine.repairRequests > 0 ? h('span', null, `${machine.repairRequests} ${t('repairRequests')}`) : null,
                  machine.repairSessionId ? h('button', { type: 'button', className: 'um-link', onClick: () => onOpenRepair(machine) },
                    `${t('openRepair')} →`) : null,
                  h('div', { className: 'um-actions' },
                    h('button', { type: 'button', className: 'um-btn', disabled: Boolean(busy[machine.id]) || !machine.enabled || machine.running, onClick: () => onRun(machine) },
                      busy[machine.id] === 'run' ? h('span', { className: 'um-spinner' }) : h(Icon, { name: 'play' }),
                      t('runNow')),
                    h('button', { type: 'button', className: 'um-btn', onClick: () => { setSaveError(''); setDialog({ mode: 'edit', machine }); } }, h(Icon, { name: 'edit' }), t('edit')),
                    h('button', { type: 'button', className: 'um-btn um-btn-danger', onClick: () => setDeleteTarget(machine) }, h(Icon, { name: 'trash' }), t('delete')),
                    h('button', { type: 'button', className: 'um-icon-btn', 'aria-label': open ? t('hideDetails') : t('showDetails'), title: open ? t('hideDetails') : t('showDetails'), onClick: () => onExpand(machine) },
                      h('span', { style: { transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease', display: 'inline-flex' } }, h(Icon, { name: 'chevron' })))))),
              open ? h('div', { className: 'um-detail' },
                h('div', { className: 'um-detail-head' },
                  h('span', { className: 'um-detail-title' }, t('recentRuns')),
                  detailLoading ? h('span', { className: 'um-spinner' }) : null,
                  h('button', { type: 'button', className: 'um-link', onClick: () => onCopy(machine.command, t('commandCopied')) }, t('copy'))),
                machineDetail === null ? h('div', { className: 'um-hint' }, t('loading')) : null,
                machineDetail !== null && (machineDetail.runs?.length ?? 0) === 0 ? h('div', { className: 'um-hint' }, t('noRuns')) : null,
                machineDetail !== null && (machineDetail.runs?.length ?? 0) > 0 ? h('div', { className: 'um-runs' },
                  machineDetail.runs.map((run) => h('button', {
                    key: run.id,
                    type: 'button',
                    className: `um-run${run.id === selectedRun?.id ? ' um-run-selected' : ''}`,
                    onClick: () => setSelectedRunId(run.id),
                  },
                  h('span', { className: 'um-run-time' }, new Date(run.startedAt).toLocaleString(locale)),
                  h('span', { className: `um-run-exit ${run.outcome === 'healthy' ? 'um-run-exit-ok' : 'um-run-exit-bad'}` }, run.exitCode === null ? (run.outcome === 'timeout' ? 'timeout' : '—') : `exit ${run.exitCode}`),
                  h('span', { className: 'um-run-repair' }, run.trigger === 'manual' ? t('triggerManual') : t('triggerSchedule')),
                  h('span', { className: 'um-run-repair' }, formatDuration(run.durationMs)),
                  h('span', { className: 'um-run-repair' }, repairLabel(run.repair, t) || '—')))) : null,
                selectedRun ? h('div', null,
                  h('div', { className: 'um-detail-title', style: { marginTop: 10 } }, `${t('runOutput')} · ${selectedRun.outcome}`),
                  h('pre', { className: 'um-output' }, selectedRun.output || t('noOutput'))) : null,
              ) : null);
          })) : null),
        dialog ? h(MachineDialog, {
          mode: dialog.mode,
          machine: dialog.mode === 'edit' ? dialog.machine : null,
          sample: dialog.sample,
          onClose: () => setDialog(null),
          onSave,
          saving,
          saveError,
          t,
        }) : null,
        helpOpen ? h(HelpDialog, { onClose: () => setHelpOpen(false), t }) : null,
        deleteTarget ? h(ConfirmDialog, {
          machine: deleteTarget,
          onClose: () => setDeleteTarget(null),
          onDelete,
          deleting,
          t,
        }) : null,
        toast ? h('div', { className: 'um-toast', role: 'status', 'aria-live': 'polite' }, toast) : null);
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { en: EN, zh: ZH }), 'dsh-plugin-um: dictionaries');

      ctx.effect(() => {
        const style = document.createElement('style');
        style.dataset.plugin = NS;
        style.dataset.pluginCss = 'dsh-plugin-um/page.css';
        style.textContent = CSS;
        document.head.appendChild(style);
        return () => style.remove();
      }, 'dsh-plugin-um: page styles');

      ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
        inject: () => ({ ctx }),
      }, MachinesPage)), 'dsh-plugin-um: main panel');

      ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 30,
        locale: NS,
        label: () => ctx.locale.bind(NS)('panel'),
      }, PanelIcon)), 'dsh-plugin-um: sidebar entry');
    }

    return {
      name: NS,
      inject: ['slots', 'locale'],
      apply,
    };
  },
});
