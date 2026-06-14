import { EventEmitter } from 'events';
import type { Job, JobHandler } from './types';

export class JobQueue extends EventEmitter {
    private queue: Job[] = [];
    private finishedJobs: Job[] = [];
    private handlers: Map<string, JobHandler> = new Map();
    private isProcessing: boolean = false;
    private maxAttempts: number;

    constructor(maxAttempts: number) {
        super();
        this.maxAttempts = maxAttempts;
    }

    register(name: string, handler: JobHandler): void {
        this.handlers.set(name, handler);
    }

    add(name: string, data?: Record<string, unknown>): void {
        const jobInfo = {
            id: crypto.randomUUID(),
            name,
            data,
            attempts: 0,
            status: 'pending' as const,
            createdAt: new Date(),
        };
        this.queue.unshift(jobInfo);
        this.emit('job:added', jobInfo);
        if (!this.isProcessing) {
            this.process();
        }
        return;
    }

    private async process(): Promise<void> {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            return;
        }
        this.isProcessing = true;

        const jobInfo = this.queue.pop()!;
        jobInfo.status = 'processing';
        this.emit('job:processing', jobInfo);

        const handler = this.handlers.get(jobInfo.name);

        if (!handler) {
            jobInfo.status = 'failed';
            this.emit(
                'job:failed',
                jobInfo,
                new Error(`No handler for job: ${jobInfo.name}`)
            );
            setImmediate(() => this.process());
            return;
        }

        try {
            await handler(jobInfo.data);
            jobInfo.status = 'done';
            this.finishedJobs.push(jobInfo);
            this.emit('job:done', jobInfo);
        } catch (error) {
            jobInfo.attempts++;

            if (jobInfo.attempts < this.maxAttempts) {
                jobInfo.status = 'pending';
                this.emit('job:retry', jobInfo, jobInfo.attempts);
                this.queue.unshift(jobInfo);
            } else {
                jobInfo.status = 'failed';
                this.finishedJobs.push(jobInfo);
                this.emit('job:failed', jobInfo, error);
            }
        }

        setImmediate(() => this.process());
    }

    stats() {
        return {
            done: this.finishedJobs.filter((job) => job.status === 'done')
                .length,
            failed: this.finishedJobs.filter((job) => job.status === 'failed')
                .length,
            total: this.finishedJobs.length,
            queue: this.queue,
            finishedJobs: this.finishedJobs,
        };
    }
}
