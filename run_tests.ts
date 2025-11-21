import { spawn } from 'child_process';

const runs = parseInt(process.argv[2] || '10', 10);

let totalFailed = 0;
let totalTimeouts = 0;
const timeoutMs = 30000;

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
            if (!timedOut) {
                // Parse the number of failed tests
                const failedMatch = output.match(/(\d+) failed/);
                const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;

                totalFailed += failed;

                console.log(`Run ${i}: ${failed} failed tests`);

                if (failed > 0) {
                    console.log('Detailed output:');
                    console.log(output);
                }
            }
            resolve();
        });
    });
}

console.log(`Total failed tests across ${runs} runs: ${totalFailed}`);
console.log(`Total timeouts across ${runs} runs: ${totalTimeouts}`);