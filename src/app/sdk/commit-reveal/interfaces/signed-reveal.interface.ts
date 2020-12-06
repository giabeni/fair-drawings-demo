import { Reveal } from '../../commit-reveal/interfaces/reveal.interface';

/**
 * Interface that encapsule a commit and a signature
 */
export interface SignedReveal {
  /**
   * The reveal
   */
  reveal: Reveal;

  /**
   * The signature of the sender
   */
  signature: ArrayBuffer;
}
