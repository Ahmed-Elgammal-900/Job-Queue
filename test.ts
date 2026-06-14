import { JobQueue } from './job-queue';

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function runTests() {
    console.log('🚀 JobQueue Real-World Tests\n');

    const queue = new JobQueue(3);

    queue.on('job:added', (job) =>
        console.log(`➕ Job added: ${job.name} (${job.id})`)
    );
    queue.on('job:processing', (job) =>
        console.log(`⚙️  Processing: ${job.name}`)
    );
    queue.on('job:done', (job) => console.log(`🎉 Job done: ${job.name}`));
    queue.on('job:retry', (job, attempt) =>
        console.log(`🔄 Retrying: ${job.name} (attempt ${attempt})`)
    );
    queue.on('job:failed', (job, err) =>
        console.log(`❌ Job failed: ${job.name} — ${err.message}`)
    );

    //  Register handlers
    queue.register('send-email', async (data) => {
        console.log(`   📧 Sending email to ${data?.email}...`);
        await wait(100);
        console.log(`   ✅ Email sent to ${data?.email}`);
    });

    queue.register('resize-image', async (data) => {
        console.log(`   🖼️  Resizing image ${data?.filename}...`);
        await wait(200);
        console.log(`   ✅ Image resized: ${data?.filename}`);
    });

    queue.register('send-notification', async (data) => {
        console.log(`   🔔 Sending notification to user ${data?.userId}...`);
        await wait(80);
        console.log(`   ✅ Notification sent to user ${data?.userId}`);
    });

    queue.register('generate-report', async (data) => {
        console.log(`   📊 Generating ${data?.type} report...`);
        await wait(300);
        console.log(`   ✅ Report generated: ${data?.type}`);
    });

    queue.register('failing-job', async () => {
        console.log('   💥 Job is about to fail...');
        throw new Error('Something went wrong!');
    });

    queue.register('flaky-job', async (data) => {
        // Fails first 2 times, succeeds on 3rd attempt
        if ((data?.attempt as number) < 2) {
            data!.attempt = ((data?.attempt as number) ?? 0) + 1;
            throw new Error(`Temporary failure (attempt ${data?.attempt})`);
        }
        console.log('   ✅ Flaky job finally succeeded!');
    });

    // Test 1: Normal jobs
    console.log('=== Scenario 1: User signs up ====================\n');
    queue.add('send-email', { email: 'alice@example.com' });
    queue.add('resize-image', { filename: 'alice-avatar.png' });
    queue.add('send-notification', { userId: 'user_1' });

    await wait(700);

    // Test 2: Failing job
    console.log('\n=== Scenario 2: Job that always fails ==================\n');
    queue.add('failing-job', {});

    await wait(500);

    // Test 3: Flaky job (fails then succeeds)
    console.log(
        '\n=== Scenario 3: Flaky job (retries then succeeds) =======\n'
    );
    queue.add('flaky-job', { attempt: 0 });

    await wait(500);

    // Test 4: Heavy load
    console.log(
        '\n=== Scenario 4: Heavy load — 5 jobs at once =============\n'
    );
    queue.add('send-email', { email: 'bob@example.com' });
    queue.add('send-email', { email: 'charlie@example.com' });
    queue.add('generate-report', { type: 'monthly-sales' });
    queue.add('resize-image', { filename: 'bob-avatar.png' });
    queue.add('send-notification', { userId: 'user_002' });

    await wait(1500);

    // Test 5: No handler
    console.log(
        '\n=== Scenario 5: Job with no handler registered ==========\n'
    );
    queue.add('ghost-job', { data: 'nobody handles me' });

    await wait(200);

    //  Final stats
    console.log('\n=== Final Stats ============================\n');
    const stats = queue.stats();
    console.log(`📊 Summary:`);
    console.log(`✅ Done:   ${stats.done}`);
    console.log(`❌ Failed: ${stats.failed}`);
    console.log(`📦 Total:  ${stats.total}`);
    console.log(`🕐 In queue: ${stats.queue.length}`);

    console.log('\n📋 Finished jobs:');
    stats.finishedJobs.forEach((job) => {
        const icon = job.status === 'done' ? '✅' : '❌';
        console.log(
            `${icon} [${job.status}] ${job.name} — attempts: ${job.attempts}`
        );
    });
}

runTests().catch(console.error);
