import { describe, expect, it } from 'vitest';
import { createLimiter } from './limit.js';

/** A task that finishes only when the test says so, recording when it started. */
function deferred(log: string[], name: string) {
	let finish!: () => void;
	const done = new Promise<void>((resolve) => (finish = resolve));
	return {
		task: async () => {
			log.push(`start ${name}`);
			await done;
			log.push(`end ${name}`);
			return name;
		},
		finish,
	};
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('createLimiter', () => {
	it('never runs more than `max` tasks at once', async () => {
		const limit = createLimiter(2);
		const log: string[] = [];
		const tasks = ['a', 'b', 'c', 'd'].map((name) => deferred(log, name));
		const results = tasks.map((t) => limit.run(t.task));

		await tick();
		expect(log).toEqual(['start a', 'start b']);
		expect([limit.active, limit.queued]).toEqual([2, 2]);

		tasks[0].finish();
		await tick();
		expect(log).toEqual(['start a', 'start b', 'end a', 'start c']);
		expect([limit.active, limit.queued]).toEqual([2, 1]);

		for (const t of tasks) t.finish();
		expect(await Promise.all(results)).toEqual(['a', 'b', 'c', 'd']);
		expect([limit.active, limit.queued]).toEqual([0, 0]);
	});

	it('starts waiting tasks in arrival order, and a newcomer cannot jump the queue', async () => {
		const limit = createLimiter(1);
		const log: string[] = [];
		const a = deferred(log, 'a');
		const b = deferred(log, 'b');
		const c = deferred(log, 'c');
		const runA = limit.run(a.task);
		const runB = limit.run(b.task);

		await tick();
		// `a` releases its slot, and `c` arrives in the same turn — `b` was waiting first and must get it.
		a.finish();
		const runC = limit.run(c.task);
		await tick();
		expect(log).toEqual(['start a', 'end a', 'start b']);

		b.finish();
		c.finish();
		await Promise.all([runA, runB, runC]);
		expect(log).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
	});

	it('releases the slot when a task throws', async () => {
		const limit = createLimiter(1);
		await expect(limit.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
		expect(await limit.run(() => Promise.resolve('next'))).toBe('next');
		expect([limit.active, limit.queued]).toEqual([0, 0]);
	});

	it('rejects a nonsensical limit', () => {
		expect(() => createLimiter(0)).toThrow(/positive integer/);
		expect(() => createLimiter(1.5)).toThrow(/positive integer/);
	});
});
