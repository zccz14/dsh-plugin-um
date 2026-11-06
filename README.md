# dsh-plugin-um · 终极机器

> **Token-Free 的自动化任务，给 DeepSeek Harness 用。**
> 一台机器 = 一条 shell 检查命令 + 一个运行间隔。健康时它什么都不做，也不消耗任何 token；失败时，它把修复请求投递到自己的修复会话里。

`dsh-plugin-um` 把 Cybion 里「终极机器（Ultimate Machine）」的概念带进 DSH：平时沉默，只在检查失败时现身；命令回到 0 之后，再次安静下来。名字来自贝尔实验室那个著名的玩笑盒——它唯一的功能就是把自己关掉。

---

## 为什么是 Token-Free

普通自动化通常靠定时唤醒 Agent 来判断「现在好不好」，每一轮都要读上下文、发请求、烧 token。

终极机器把判断交给**退出码**：

- 调度器在 Host 上直接运行 shell 命令；
- 退出码 0 = 健康，整轮**没有模型调用**，也不写任何会话消息；
- 退出码 ≠ 0 = 失败，才创建/唤醒绑定的修复会话，把命令、退出码、输出尾部、意图和「请让命令返回 0」交给 Agent。

所以「平时」的成本是 0 token；只有真正需要修复时才进入模型回合。页面上的 `0 tokens` 徽章和 `Token-free runs` 统计就是这件事的可见证据。

---

## 功能

- **左侧边栏页面入口**：`Ultimate Machines` / `终极机器`，带独立图标和主面板。
- **UI 配置**：创建、编辑、暂停/恢复、立即运行、删除、查看最近运行与输出。
- **Agent 工具**：`um_list_machines`、`um_get_machine`、`um_set_machine`、`um_delete_machine`、`um_run_machine`。
- **失败修复**：自动创建标题为 `终极机器 · <名称>` 的修复会话；失败消息包含命令、退出码、输出尾部与意图。
- **可编程**：命令就是 bash；支持 `cwd`、`interval_seconds`、`timeout_seconds`、`intent`。
- **有界历史**：每台机器保留最近 50 次运行，输出尾部有上限，状态文件原子写入。
- **中文 / English UI**，跟随 Host 主题 token。
- **零运行时依赖**：Host 只用 Node 内置模块；Client 只从浏览器模块表取 React。

---

## 安装

### 从 npm 安装（推荐）

在 Harness Web UI 的 **Plugins** 页面，从 npm 安装 bundle `dsh-plugin-um`，然后启用它。

也可以用 CLI 把包加进 profile：

```bash
dsh plugin --profile web add dsh-plugin-um
```

再把 `dsh-plugin-um` 加入该 profile 的 `dsh.profile.bundles`（Plugins 页面安装会自动完成这一步）。安装后刷新页面，左侧边栏会出现机器图标。

### 本地开发安装

把本目录作为 bundle 安装到当前 profile：

```
plugin_manager install_bundle target=/absolute/path/to/dsh-plugin-um
```

安装结果里看到 `application: applied` 后，刷新 Web 页面。

---

## 快速开始

1. 点击左侧边栏的机器图标。
2. 点 **New machine**。
3. 填名称与检查命令，例如根分区低于 90%：

   ```bash
   test $(df -Pk / | awk 'NR==2 {print $5}' | tr -d %) -lt 90
   ```

4. 选择间隔（默认 300 秒）与超时（默认 300 秒），保存。

创建后**立即执行第一次**。健康时页面显示 `healthy`，不会产生任何会话消息；失败时会自动创建修复会话，并把修复请求写进去。

页面里的示例按钮可以直接填入：

| 示例 | 命令 | 适合 |
|---|---|---|
| 磁盘使用率 | `test $(df -Pk / | awk 'NR==2 {print $5}' | tr -d %) -lt 90` | 根分区水位 |
| 本地端口 | `nc -z 127.0.0.1 3080` | 服务存活 |
| 备份新鲜度 | `find /backups -maxdepth 1 -type f -mmin -1440 | grep -q .` | 数据新鲜度 |

---

## 检查命令的写法

- **退出码即语义**：`0` = 健康且沉默；任何非 0 = 失败。失败时 stdout/stderr 的尾部会被送进修复会话。
- **只读、幂等**：反复运行不应改变状态或产生副作用文件。
- **便宜**：单次运行有超时（默认 300 秒，最大 3600 秒）；超时按失败处理。
- **不依赖登录环境**：按非交互 shell 写，显式路径，不依赖 shell 配置。
- **失败可行动**：输出里带上期望值与现状，修复者不用二次侦查。
- **不要打印密钥**：失败输出会进入修复会话历史。

推荐先用 `bash` 工具在目标目录干跑同一命令，确认健康态返回 0、失败输出可读，再保存为机器。

---

## 页面

- **统计**：机器总数、已启用、健康、待修复、Token-Free 运行次数。
- **机器卡片**：状态、间隔、上次/下次检查、`0 tokens`、命令、意图、退出码、运行次数、修复请求次数、修复会话入口。
- **操作**：恢复/暂停开关、立即运行、编辑、删除、展开详情。
- **详情**：最近运行列表（时间、退出码、触发方式、耗时、修复投递状态）与选中运行的完整输出尾部。
- **帮助**：`?` 按钮解释「终极机器」这个名字的来历，带一个小动画。
- 页面每 5 秒轮询一次；暂停会中止正在运行的检查，并尝试取消修复会话当前回合。

---

## Agent 工具

所有工具都读写同一份 Host 服务；页面和工具不会出现两套逻辑。

| 工具 | 用途 |
|---|---|
| `um_list_machines` | 列出机器：定义、启用/运行状态、最近退出码、修复会话。可按 `enabled` 过滤，`limit` 分页。 |
| `um_get_machine` | 按 `machine_id` 读取完整定义与最近运行（`include_runs`、`run_limit`）。 |
| `um_set_machine` | 省略 `machine_id` 创建；提供 `machine_id` 时局部更新。创建时 `name`、`command`、`interval_seconds` 必填。`intent` 传空串清空；`enabled` 暂停/恢复。 |
| `um_delete_machine` | 彻底删除机器；修复会话及其历史保留为普通会话。 |
| `um_run_machine` | 立即运行并返回退出码、耗时、输出尾部、修复投递状态；`wait=false` 只启动。检查本身不消耗 token。 |

### Agent 工作流

1. 用 `um_list_machines` / `um_get_machine` 看定义和最近结果。
2. 新建或改命令前，先用 `bash` 干跑：健康态 0，失败态输出可读。
3. 用 `um_set_machine` 保存；新机器会立即跑第一次。
4. 修复会话收到失败消息后，先判断是环境问题还是检查本身写错了：
   - 环境问题：直接修环境。
   - 检查写错：先用 bash 验证修正后的命令，再 `um_set_machine` 更新。
5. 修好后可调用 `um_run_machine` 立即验证，不必等下一个间隔。
6. **不要为了让检查变绿而弱化检查**。

失败消息形如：

```text
【终极机器·磁盘检查】检查失败：exit=1。

意图：
确保根分区低于 90%

命令：
test $(df -Pk / | awk 'NR==2 {print $5}' | tr -d %) -lt 90

输出尾部：
...

请修复，使该命令返回 0。修复后无需回复；下次定时检查会自动验证。需要立即验证时，调用 um_run_machine 再跑一次——检查本身不消耗 token。
```

---

## 数据与生命周期

- 状态文件：`$DSH_HOME/ultimate-machines/state.json`（默认 `~/.dsh/ultimate-machines/state.json`）。
- 写入方式：临时文件 + rename，串行化；损坏时移到 `.corrupt-<timestamp>` 并以空状态启动。
- 每台机器：定义、统计、最近 50 次运行、最近输出尾部。
- 创建：立即执行第一次，并自动创建修复会话 `终极机器 · <名称>`。
- 暂停：停止调度与离线提醒；中止正在跑的检查，并尝试取消修复会话当前回合。
- 删除：移除机器；**修复会话与历史保留**。想让它安静请用暂停。
- 修复会话正在运行时，新的失败消息会被**丢弃**（不排队）；下一次运行落定后再决定。
- Host 重启后，已过期的机器会尽快补跑一次。

---

## 配置

可选配置写在 bundle 行的 `config` 里（不配置则用默认值）：

```yaml
- insert:
    - id: dsh-plugin-um
      name: dsh-plugin-um
      config:
        # 状态文件路径；默认 $DSH_HOME/ultimate-machines/state.json
        statePath: ~/.dsh/ultimate-machines/state.json
        # 未填 cwd 时的默认工作目录；默认 Host 的会话工作目录
        defaultCwd: ~/Projects
        # 同时运行的检查数上限（1-8）
        maxConcurrentRuns: 3
        # 每次运行保留的输出字节上限（1024-65536）
        maxOutputBytes: 8192
        # 每台机器保留的运行条数（5-200）
        maxRunsPerMachine: 50
```

---

## 安全边界

- 检查命令以 **DSH Host 进程的用户权限**运行，不经过 Session 沙箱，也不走审批策略。请只让可信的人创建/编辑机器。
- 失败输出会进入修复会话历史；不要把密钥、令牌、隐私数据 echo 到检查输出里。
- 页面会显示命令与输出；它们也是本地状态文件的一部分。
- 插件不联网、不采集遥测；所有判断都在本地完成。

---

## 架构

```
index.js          Host 插件：调度、执行、修复投递、工具、HTTP 路由
lib/core.js       纯模型：校验、摘要、修复消息、格式化
lib/runner.js     无模型的 shell 执行器：超时、输出尾部、跨平台 shell
lib/store.js      原子 JSON 状态存储
client.js         侧边栏入口 + 主面板（React，主题 token）
locale/*.json     bundle 显示元数据（en / zh）
cordis.patch.yml  bundle 行
```

- 页面与工具调用同一个 Host 服务：`listMachines` / `getMachine` / `saveMachine` / `deleteMachine` / `setEnabled` / `runMachine`。
- 页面通过 `POST /api/dsh-plugin-um` 访问 Host；路由经 `ctx.connection.fetch.register` 注册，走连接层认证。
- 调度器只用 Node 定时器与子进程；健康运行完全不进入 Agent 循环。
- 修复投递使用 `sessionController.create` / `rename` / `state` / `prompt`，失败时优雅降级。

---

## 开发

```bash
npm test          # node:test，含 Host 集成测试（假 Session controller）
npm run check     # 所有 JS 文件语法检查
npm pack --dry-run
```

本地安装后，可用 `cordis_inspect_query` 确认：

- `Slots.listSubTree`：`sidebar.panellist` 出现 `ultimate-machines`，`main` 出现同名 key；
- `Tool.listTools`：出现 5 个 `um_*` 工具；
- 页面：刷新后左侧图标可打开管理页。

---

## 已知边界

- 检查只在 **Host 本机**执行；尚未做每台机器的远程设备（exe）目标选择，这是很自然的下一步。
- 修复后不会自动立即复查；Agent 可以调用 `um_run_machine` 主动验证，或等下一个间隔。
- 修复会话正在运行时失败消息会被丢弃，这是有意的「耗尽语义」，避免堆积。
- 状态存储是单进程 JSON 文件；多 Host 进程共享同一 `$DSH_HOME` 时请避免同时写入。

---

## License

MIT © 2026 cz

---

# English

**Token-free automation for DeepSeek Harness.** An Ultimate Machine is one shell check command plus an interval. It runs on the Host with no model call in the loop: exit `0` is silent and free; a non-zero exit wakes the machine's repair Session with the command, exit code, output tail, intent, and the success criterion.

- Sidebar page with UI for create/edit/pause/resume/run-now/delete, recent runs, and output.
- Agent tools: `um_list_machines`, `um_get_machine`, `um_set_machine`, `um_delete_machine`, `um_run_machine`.
- A repair Session titled `终极机器 · <name>` is created for each machine. Failure messages are dropped while that Session is running.
- State lives at `$DSH_HOME/ultimate-machines/state.json`; writes are atomic; 50 runs per machine by default.
- Commands run with the Host user's privileges, outside the Session sandbox. Do not print secrets.
- The check itself is token-free; only repair turns use the model.

Install from npm as bundle `dsh-plugin-um`, or install the checkout with `plugin_manager install_bundle`. Open the machine icon in the sidebar, create a check, and verify the command with `bash` first.

MIT © 2026 cz
