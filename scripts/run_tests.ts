import { spawn } from 'child_process';

// A run count that isn't a positive integer falls back to the default
// instead of silently iterating zero times.
const requestedRuns = Number.parseInt(process.argv[2] || '10', 10);
const runs = Number.isFinite(requestedRuns) && requestedRuns > 0 ? requestedRuns : 10;

let totalFailed = 0;
let totalTimeouts = 0;
// A full suite run takes well under a minute; a run that outlasts the
// window counts as failed below rather than being skipped silently.
const timeoutMs = 120000;

for (let i = 1; i <= runs; i++) {
    console.log(`Running test iteration ${i}...`);

    let output = '';
    let timedOut = false;

    const child = spawn('npm', ['run', 'test:run'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
    });

    const timeout = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
        totalTimeouts++;
        console.log(`Run ${i}: Timed out after ${timeoutMs}ms`);
    }, timeoutMs);

    child.stdout.on('data', (data) => {
        output += data.toString();
    });

    child.stderr.on('data', (data) => {
        output += data.toString();
    });

    await new Promise<void>((resolve) => {
        child.on('close', (code) => {
            clearTimeout(timeout);
            if (timedOut) {
                resolve();
                return;
            }
            // Vitest exits non-zero when tests fail. The parsed count is for
            // the summary; the exit code decides, so a parse mismatch can
            // never turn a failing run into a passing one.
            if (code !== 0) {
                const failedMatch = output.match(/(\d+) failed/);
                totalFailed += failedMatch ? parseInt(failedMatch[1], 10) : 1;
                console.log(`Run ${i}: FAILED (exit code ${code})`);
                console.log('Detailed output:');
                console.log(output);
            } else {
                console.log(`Run ${i}: all tests passed`);
            }
            resolve();
        });
    });
}

console.log(`Total failed tests across ${runs} runs: ${totalFailed}`);
console.log(`Total timeouts across ${runs} runs: ${totalTimeouts}`);

// A timeout is a hung suite, not a passing one: either finding fails the
// script so a flaky run cannot sneak through CI.
if (totalFailed > 0 || totalTimeouts > 0) {
    process.exitCode = 1;
}