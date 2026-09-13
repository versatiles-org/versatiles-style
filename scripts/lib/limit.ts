/**
 * A concurrency limiter: at most `max` tasks run at once, the rest wait in arrival order.
 *
 * Written for the dev tile proxy and the PMTiles reader, where firing every request MapLibre asks for at
 * once made things slower, not faster. Past a handful of parallel connections to one upstream, requests
 * mostly compete for the same bandwidth, each gets slower, and more of them cross the timeout — which
 * then retries them and adds still more load. Queueing keeps each running request fast enough to finish.
 *
 * Small enough that a dependency would be heavier than the code.
 */
export type Limiter = {
	/** Run `task` once a slot is free. The slot is held until the returned promise settles. */
	run<T>(task: () => Promise<T>): Promise<T>;
	/** Tasks currently holding a slot. */
	readonly active: number;
	/** Tasks waiting for one. */
	readonly queued: number;
};

export function createLimiter(max: number): Limiter {
	if (!Number.isInteger(max) || max < 1) throw new Error(`limit: max must be a positive integer, got ${max}`);
	let active = 0;
	const waiting: (() => void)[] = [];

	return {
		async run<T>(task: () => Promise<T>): Promise<T> {
			if (active >= max) await new Promise<void>((resolve) => waiting.push(resolve));
			// The slot is handed over directly by the task that releases it (see `finally`), so `active`
			// is only incremented here for a task that did not have to wait.
			else active++;
			try {
				return await task();
			} finally {
				const next = waiting.shift();
				// Hand the slot to the next waiter without releasing it in between: releasing first would let a
				// newly arriving task take it and jump the queue.
				if (next) next();
				else active--;
			}
		},
		get active() {
			return active;
		},
		get queued() {
			return waiting.length;
		},
	};
}
