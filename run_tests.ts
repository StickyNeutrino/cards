import { execSync } from 'child_process';

const runs = parseInt(process.argv[2] || '10', 10);

let totalFailed = 0;

for (let i = 1; i <= runs; i++) {
    console.log(`Running test iteration ${i}...`);

    let output: string;
    try {
        output = execSync('npm run test:run', { encoding: 'utf8', stdio: 'pipe' });
    } catch (error: any) {
        output = error.stdout || '';
    }

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

console.log(`Total failed tests across ${runs} runs: ${totalFailed}`);