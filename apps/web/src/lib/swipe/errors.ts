/**
 * Error thrown when a feature-flagged action is attempted while the flag is off.
 */
export class FeatureFlagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeatureFlagError";
  }
}
