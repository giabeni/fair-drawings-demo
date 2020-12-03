import { RawCommit } from './raw-commit.interface';

/**
 * Object that represents the reveal sent to validate the commit
 */
export interface Reveal extends RawCommit {
  /**
   * The timestamp when the reveal was CREATED
   */
  timestamp: number;
}
