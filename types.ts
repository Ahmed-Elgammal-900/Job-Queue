export interface Job {
    id: string;
    name: string;
    data?: Record<string, unknown>;
    attempts: number;
    status: JobStatus;
    createdAt: Date;
}

export type JobHandler = (data?: Record<string, unknown>) => Promise<void>;

type JobStatus = 'pending' | 'processing' | 'done' | 'failed';
