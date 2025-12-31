/**
 * Query Ad Counter
 * Simple interstitial trigger: after a random number of user queries between 1 and 5.
 */

class QueryAdCounter {
  private static instance: QueryAdCounter;
  private count = 0;
  private threshold = this.randomThreshold();

  private constructor() {}

  static getInstance(): QueryAdCounter {
    if (!QueryAdCounter.instance) {
      QueryAdCounter.instance = new QueryAdCounter();
    }
    return QueryAdCounter.instance;
  }

  private randomThreshold(): number {
    // Random integer between 1 and 5 inclusive
    return Math.floor(Math.random() * 5) + 1;
  }

  /**
   * Record a completed user query.
   * Returns true if the interstitial should be shown now.
   */
  recordQuery(): { shouldShow: boolean; count: number; threshold: number } {
    this.count += 1;
    if (this.count >= this.threshold) {
      // Reset for next cycle
      this.count = 0;
      this.threshold = this.randomThreshold();
      return { shouldShow: true, count: this.count, threshold: this.threshold };
    }
    return { shouldShow: false, count: this.count, threshold: this.threshold };
  }

  getState() {
    return { count: this.count, threshold: this.threshold };
  }

  reset(): void {
    this.count = 0;
    this.threshold = this.randomThreshold();
  }
}

export const queryAdCounter = QueryAdCounter.getInstance();
export default queryAdCounter;
