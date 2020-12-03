import { Commit } from './commit.interface';

/**
 * Interface that encapsule a commit and a signature
 */
export interface SignedCommit {
  /**
   * The encrypted commit
   */
  commit: Commit;

  /**
   * The signature of the sender
   */
  signature: Buffer;
}
