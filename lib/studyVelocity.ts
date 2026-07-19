/**
 * Passive study velocity engine.
 *
 * Given the timestamps of questions solved (e.g. `attempts.attempted_at`),
 * estimates how fast the user is actually moving through cards and how much
 * of that time was genuine focused work vs. an unlogged break (lunch,
 * getting pulled away, etc).
 */

/** A raw interaction timestamp: epoch millis, or an ISO 8601 string (with or without ms). */
export type RawTimestamp = number | string;

export interface StudyVelocityOptions {
  /** Any gap between consecutive events longer than this is treated as an
   *  unlogged break and dropped from the velocity calculation. Default 1200s (20min). */
  breakThresholdSeconds?: number;
}

export interface StudyVelocityResult {
  /** Median seconds-per-question, computed only from non-break deltas. 0 if unavailable. */
  medianDeltaSeconds: number;
  /** medianDeltaSeconds * totalQuestionsReviewed — a synthetic estimate of active focus time. */
  totalActiveSeconds: number;
  /** Number of consecutive-event deltas that were dropped as session breaks. */
  breaksDropped: number;
  /** Number of deltas actually used to compute the median (post break-filtering). */
  sampleSize: number;
  /** Total number of input events (cards reviewed) the caller passed in. */
  totalQuestionsReviewed: number;
}

const DEFAULT_BREAK_THRESHOLD_SECONDS = 1200; // 20 minutes

function toEpochMillis(t: RawTimestamp): number {
  // Store format is "YYYY-MM-DD HH:MM:SS"; space form is not reliably parsed
  // across engines, so normalize to ISO-like local before converting.
  const ms = typeof t === 'number'
    ? t
    : new Date(t.includes('T') ? t : t.replace(' ', 'T')).getTime();
  if (!Number.isFinite(ms)) {
    throw new TypeError(`Invalid timestamp: ${String(t)}`);
  }
  return ms;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Compute per-question study velocity and a synthetic total active-time
 * estimate from a raw (not necessarily sorted) array of interaction timestamps.
 *
 * Safe on malformed/degenerate input: fewer than 2 timestamps yields all-zero
 * metrics rather than throwing or dividing by zero.
 */
export function computeStudyVelocity(
  rawTimestamps: RawTimestamp[],
  options: StudyVelocityOptions = {},
): StudyVelocityResult {
  const breakThresholdSeconds = options.breakThresholdSeconds ?? DEFAULT_BREAK_THRESHOLD_SECONDS;
  const totalQuestionsReviewed = rawTimestamps.length;

  if (totalQuestionsReviewed < 2) {
    return {
      medianDeltaSeconds: 0,
      totalActiveSeconds: 0,
      breaksDropped: 0,
      sampleSize: 0,
      totalQuestionsReviewed,
    };
  }

  // Chronological guard: sort ascending before diffing, so out-of-order input
  // (e.g. unsorted API responses) never produces negative intervals.
  const sortedMillis = rawTimestamps.map(toEpochMillis).sort((a, b) => a - b);

  const deltasSeconds: number[] = [];
  let breaksDropped = 0;

  for (let i = 1; i < sortedMillis.length; i++) {
    const deltaTSeconds = (sortedMillis[i] - sortedMillis[i - 1]) / 1000.0;
    if (deltaTSeconds > breakThresholdSeconds) {
      breaksDropped++;
      continue; // unlogged session break — excluded from focus stats
    }
    deltasSeconds.push(deltaTSeconds);
  }

  const medianDeltaSeconds = median(deltasSeconds);
  const totalActiveSeconds = medianDeltaSeconds * totalQuestionsReviewed;

  return {
    medianDeltaSeconds,
    totalActiveSeconds,
    breaksDropped,
    sampleSize: deltasSeconds.length,
    totalQuestionsReviewed,
  };
}

/** An attempt with both a completion timestamp and a logged solve duration. */
export interface TimedAttempt {
  attemptedAt: RawTimestamp;
  /** Solve time entered by the user, in minutes. */
  timeTakenMins: number;
}

export interface LoggedSessionResult {
  /** Sum of entered solve times. */
  loggedMins: number;
  /** Estimated time between questions (gaps minus the next question's solve time). */
  betweenMins: number;
  /** loggedMins + betweenMins — total active session estimate. */
  sessionMins: number;
  /** Gaps dropped as unlogged breaks (> break threshold). */
  breaksDropped: number;
  /** Number of inter-attempt gaps used for the between-question estimate. */
  gapSampleSize: number;
}

/**
 * Session time for domains that log per-attempt solve duration (e.g. DSA).
 *
 * Solve average stays on the entered times. Between-question time is inferred
 * from completion gaps: for each consecutive pair, any wall-clock gap beyond
 * the next question's logged solve time counts as transition/idle (long
 * breaks above the threshold are excluded, same as computeStudyVelocity).
 *
 * This avoids double-counting: you cannot add raw gaps on top of logged
 * totals, because each gap already includes the next question's solve time.
 */
export function computeLoggedSessionTime(
  attempts: TimedAttempt[],
  options: StudyVelocityOptions = {},
): LoggedSessionResult {
  const breakThresholdSeconds = options.breakThresholdSeconds ?? DEFAULT_BREAK_THRESHOLD_SECONDS;
  const timed = attempts.filter(a => a.timeTakenMins > 0);

  const loggedMins = timed.reduce((s, a) => s + a.timeTakenMins, 0);

  if (timed.length < 2) {
    return {
      loggedMins,
      betweenMins: 0,
      sessionMins: loggedMins,
      breaksDropped: 0,
      gapSampleSize: 0,
    };
  }

  const sorted = [...timed].sort(
    (a, b) => toEpochMillis(a.attemptedAt) - toEpochMillis(b.attemptedAt),
  );

  let betweenSeconds = 0;
  let breaksDropped = 0;
  let gapSampleSize = 0;

  for (let i = 1; i < sorted.length; i++) {
    const gapSeconds =
      (toEpochMillis(sorted[i].attemptedAt) - toEpochMillis(sorted[i - 1].attemptedAt)) / 1000;
    if (gapSeconds > breakThresholdSeconds) {
      breaksDropped++;
      continue;
    }
    gapSampleSize++;
    // Gap ≈ next solve + transition; only the surplus is "between questions".
    betweenSeconds += Math.max(0, gapSeconds - sorted[i].timeTakenMins * 60);
  }

  const betweenMins = Math.round(betweenSeconds / 60);
  return {
    loggedMins,
    betweenMins,
    sessionMins: loggedMins + betweenMins,
    breaksDropped,
    gapSampleSize,
  };
}
