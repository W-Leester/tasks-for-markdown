import * as assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as vscode from 'vscode';
import { fixtureUri, getApi } from './helpers';

/** Start the server exactly as registered, initialize, call tasks_query, return its result. */
function callServer(spec: { command: string; args: string[]; env: Record<string, string> }): Promise<{ matched: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(spec.command, spec.args, { env: { ...process.env, ...spec.env }, stdio: ['pipe', 'pipe', 'pipe'] });
    let buf = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error(`no answer; stdout so far: ${buf.slice(0, 300)}`)); }, 15000);
    child.stdout.on('data', (d: Buffer) => {
      buf += d.toString();
      for (const line of buf.split('\n')) {
        if (!line.includes('"id":2')) continue;
        clearTimeout(timer);
        child.kill();
        const msg = JSON.parse(line) as { result: { content: { text: string }[] } };
        resolve(JSON.parse(msg.result.content[0]!.text) as { matched: number });
        return;
      }
    });
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    const send = (m: unknown) => child.stdin.write(JSON.stringify(m) + '\n');
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } } });
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'tasks_query', arguments: { query: 'not done' } } });
  });
}

suite('AI connection (M21)', () => {
  test('VS Code: registers the bundled MCP server for the folder; it runs on the editor Node', async function () {
    this.timeout(30000);
    const api = await getApi();
    if (!(vscode.lm as { registerMcpServerDefinitionProvider?: unknown } | undefined)?.registerMcpServerDefinitionProvider) this.skip();
    assert.equal(api.ai.mode, 'vscode');
    const servers = api.ai.current();
    assert.equal(servers.length, 1);
    const [s] = servers;
    assert.equal(s!.name, 'tasks');
    assert.equal(s!.spec.command, process.execPath);
    assert.ok(s!.spec.args[0]!.endsWith('dist/tasksmd.cjs') || s!.spec.args[0]!.endsWith('dist\\tasksmd.cjs'), s!.spec.args[0]);
    assert.equal(s!.spec.args.at(-1), fixtureUri('').fsPath.replace(/[\\/]$/, ''));
    const result = await callServer(s!.spec);
    assert.ok(result.matched > 0, `matched ${result.matched}`);
  });

  test('turning tasksmd.mcp.autoRegister off removes the server', async () => {
    const api = await getApi();
    await api.settings.update('mcp.autoRegister', false, vscode.ConfigurationTarget.Workspace);
    try {
      assert.deepEqual(api.ai.current(), []);
    } finally {
      await api.settings.update('mcp.autoRegister', undefined, vscode.ConfigurationTarget.Workspace);
    }
    assert.equal(api.ai.current().length, 1);
  });
});
