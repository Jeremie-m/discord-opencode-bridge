#!/usr/bin/env node
/**
 * Discord-OpenCode Bridge Startup Script
 * Starts OpenCode server in the correct directory and the bridge
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// Load .env file
function loadEnv() {
  const envPath = resolve(rootDir, '.env');
  if (!existsSync(envPath)) {
    console.warn('Warning: .env file not found');
    return {};
  }

  const env = {};
  const content = readFileSync(envPath, 'utf-8');
  
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
      process.env[key] = value;
    }
  }
  
  return env;
}

// Main
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('       Discord-OpenCode Bridge Launcher');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // Load environment
  const env = loadEnv();
  
  // Get project path - REQUIRED in .env
  const projectPath = env.OPENCODE_DEFAULT_PROJECT_PATH;
  const opencodePort = env.OPENCODE_SERVER_URL?.match(/:(\d+)/)?.[1] || '4096';

  // Verify project path is set
  if (!projectPath) {
    console.error('❌ OPENCODE_DEFAULT_PROJECT_PATH is not set in .env');
    console.error('');
    console.error('   Please add this line to your .env file:');
    console.error('   OPENCODE_DEFAULT_PROJECT_PATH=C:/path/to/your/projects');
    console.error('');
    process.exit(1);
  }

  // Verify project path exists
  if (!existsSync(projectPath)) {
    console.error(`❌ Project path does not exist: ${projectPath}`);
    console.error('   Please check OPENCODE_DEFAULT_PROJECT_PATH in .env');
    process.exit(1);
  }

  console.log(`📁 OpenCode working directory: ${projectPath}`);
  console.log(`🔌 OpenCode port: ${opencodePort}`);
  console.log('');

  // Start OpenCode server
  console.log('🔵 [opencode] Starting server...');
  
  const opencodeProcess = spawn('opencode', ['serve', '--port', opencodePort], {
    cwd: projectPath,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  opencodeProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => console.log(`🔵 [opencode] ${line}`));
  });

  opencodeProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => console.log(`🔵 [opencode] ${line}`));
  });

  opencodeProcess.on('error', (err) => {
    console.error(`❌ [opencode] Failed to start: ${err.message}`);
    process.exit(1);
  });

  // Wait for OpenCode to start
  console.log('⏳ Waiting for OpenCode server...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Start the bridge
  console.log('');
  console.log('🟢 [bridge] Starting Discord bridge...');
  console.log('');

  const bridgeProcess = spawn('npx', ['tsx', 'watch', 'src/index.ts'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env },
  });

  // Handle cleanup
  const cleanup = () => {
    console.log('');
    console.log('📴 Shutting down...');
    
    bridgeProcess.kill();
    opencodeProcess.kill();
    
    // Force kill after 3 seconds
    setTimeout(() => {
      process.exit(0);
    }, 3000);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  bridgeProcess.on('exit', (code) => {
    console.log(`🟢 [bridge] Exited with code ${code}`);
    opencodeProcess.kill();
    process.exit(code || 0);
  });

  opencodeProcess.on('exit', (code) => {
    console.log(`🔵 [opencode] Exited with code ${code}`);
    if (code !== 0 && code !== null) {
      console.error('❌ OpenCode server crashed. Stopping bridge...');
      bridgeProcess.kill();
      process.exit(1);
    }
  });
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
