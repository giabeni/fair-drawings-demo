import { DrawErrorEvent, DrawEvent } from './interfaces/draw-event.interface';
import { Draw } from './entities/draw.entity';
import { DrawEventType } from './enums/draw-event-type.enum';
import { Stakeholder } from './entities/stakeholder.entity';
import { Candidate } from './entities/candidate.entity';
import { SignedCommit } from '../commit-reveal/interfaces/signed-commit.interface';
import { CommitRevealService } from '../commit-reveal/commit-reveal.service';
import { SecurityService } from '../security/security.service';
import { SignedReveal } from '../commit-reveal/interfaces/signed-reveal.interface';
import { DrawService } from './draw.service';
import { DrawAckType } from './enums/draw-ack-type.enum';
import { DrawStatus } from './enums/draw-status.enum';

/**
 * Class to handle events in a draw.
 * @param event the draw event to handle
 * @param draw the draw instance to update
 */
export class DrawEventEngine {
  public static async handleEvent(event: DrawEvent, draw: Draw) {
    switch (event.type) {
      // new candidate subscribed to the draw
      case DrawEventType.CANDIDATE_SUBSCRIBED:
        await this.onCandidateSubscribed(event.data, draw);
        break;

      // candidate left draw
      case DrawEventType.CANDIDATE_UNSUBSCRIBED:
        draw.setError(event);
        await this.onErrorReceived(event.data, draw);
        break;

      // another candidate sent a commit
      case DrawEventType.COMMIT_RECEIVED:
        await this.onCommitReceived(event.data, draw);
        break;

      // another candidate sent a reveal
      case DrawEventType.REVEAL_RECEIVED:
        await this.onRevealReceived(event.data, draw);
        break;

      // received ack from other candidate
      case DrawEventType.ACK:
        try {
          // delays the ack registering to avoid the validation to proceed before local changes have been computed
          setTimeout(async () => {
            draw.setAck(event.data, event.from.id);
            if (await draw.updateStatus()) {
              await DrawService.updateStatus(draw, draw.status);
            }
          }, 500);
        } catch (err) {
          console.error('Inconsistent received ACK');
          throw err;
        }
        break;

      case DrawEventType.WRONG_COMMIT_FORMAT:
      case DrawEventType.WRONG_REVEAL_FORMAT:
      // case DrawEventType.DUPLICATE_COMMIT:
      // case DrawEventType.DUPLICATE_REVEAL:
      case DrawEventType.INVALID_REVEAL_MASK:
      // case DrawEventType.FORBIDDEN_COMMIT_USER_ID:
      // case DrawEventType.FORBIDDEN_REVEAL_USER_ID:
      case DrawEventType.UNAUTHORIZED_COMMIT_SIGNATURE:
      case DrawEventType.UNAUTHORIZED_REVEAL_SIGNATURE:
        await this.onErrorReceived(event.data, draw);
        break;

      default:
        break;
    }

  }

  private static async onCandidateSubscribed(candidate: Candidate, draw: Draw) {
    draw.addStakeholder(new Candidate(candidate), true);

    if (draw.candidatesCount === draw.spots) {
      await DrawService.sendAck(draw, DrawAckType.ALL_JOINED);
    }
  }

  private static onCandidateUnsubscribed(candidate: Candidate, draw: Draw) {
    draw.removeStakeholder(new Candidate(candidate));
  }

  private static async onCommitReceived(signedCommit: SignedCommit, draw: Draw) {
    try {
      const commitValidation = await DrawService.checkCommit(draw, signedCommit);

      if (commitValidation === true) {
        await draw.registerCommit(signedCommit, true);
      } else {
        const errorEvent: DrawErrorEvent = {
          type: commitValidation,
          data: signedCommit as any,
        };
        draw.setError(errorEvent);
        await draw.registerCommit(signedCommit, false);
        await DrawService.sendError(draw, errorEvent);
      }

      if (
        draw.commits.length === draw.spots &&
        draw.commits.every(commit => commit.valid)
      ) {
        await DrawService.sendAck(draw, DrawAckType.ALL_COMMITED);
      }

    } catch (commitError) {
      console.error('COMMIT ERROR', commitError);
    }
  }

  private static async onRevealReceived(signedReveal: SignedReveal, draw: Draw) {
    try {
      const revealValidation = await DrawService.checkReveal(draw, signedReveal);
      if (revealValidation === true) {
        await draw.registerReveal(signedReveal, true);
      } else {
        const errorEvent: DrawErrorEvent = {
          type: revealValidation,
          data: signedReveal as any,
        };
        draw.setError(errorEvent);
        await draw.registerReveal(signedReveal, false);
        await DrawService.sendError(draw, errorEvent);
      }

      if (
        draw.reveals.length === draw.spots &&
        draw.reveals.every(reveal => reveal.valid)
      ) {
        await DrawService.sendAck(draw, DrawAckType.ALL_REVEALED);
      }
    } catch (revealError) {
      console.error('Reveal ERROR', revealError);
    }
  }

  private static async onErrorReceived(data: SignedCommit | SignedReveal | Candidate, draw: Draw) {
    if (await draw.updateStatus()) {
      await DrawService.updateStatus(draw, draw.status);
    }
  }
}
