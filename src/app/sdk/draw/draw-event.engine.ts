import { DrawEvent } from './interfaces/draw-event.interface';
import { Draw } from './entities/draw.entity';
import { DrawEventType } from './enums/draw-event-type.enum';
import { Stakeholder } from './entities/stakeholder.entity';
import { Candidate } from './entities/candidate.entity';
import { SignedCommit } from '../commit-reveal/interfaces/signed-commit.interface';
import { CommitRevealService } from '../commit-reveal/commit-reveal.service';
import { SecurityService } from '../security/security.service';
import { SignedReveal } from '../commit-reveal/interfaces/signed-reveal.interface';
import { DrawService } from './draw.service';
import { DrawAck } from './enums/draw-ack.enum';

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

      // candidate unsubscribed of the draw
      case DrawEventType.CANDIDATE_UNSUBSCRIBED:
        await this.onCandidateUnsubscribed(event.data, draw);
        break;

      // candidate send a commit
      case DrawEventType.COMMIT_RECEIVED:
        await this.onCommitReceived(event.data, draw);
        break;

      // candidate send a reveal
      case DrawEventType.REVEAL_RECEIVED:
        await this.onRevealReceived(event.data, draw);
        break;

      // received ack from other candidate
      case DrawEventType.ACK:
        draw.setAck(event.data, event.from.id)
        if (draw.updateStatus()) {
          await DrawService.updateStatus(draw.uuid, draw.status);
        }
        /** @TODO save status of draw in firebase */

      default:
        break;
    }

    // updates the status in the instace of the draw
    if (draw.updateStatus()) {
      /** @TODO post STATUS_CHANGED DrawEvent */
    }
  }

  private static async onCandidateSubscribed(candidate: Candidate, draw: Draw) {
    draw.addStakeholder(new Candidate(candidate), true);

    if (draw.candidatesCount === draw.spots) {
      await DrawService.sendAck(draw.uuid, DrawAck.JOIN);
    }
  }

  private static onCandidateUnsubscribed(candidate: Candidate, draw: Draw) {
    draw.removeStakeholder(new Candidate(candidate));
  }

  private static onCommitReceived(signedCommit: SignedCommit, draw: Draw) {
    try {
      draw.registerCommit(signedCommit);
    } catch (commitError) {
      /** @TODO post error to stream */
    }
  }

  private static onRevealReceived(signedReveal: SignedReveal, draw: Draw) {
    try {
      draw.registerReveal(signedReveal);
    } catch (commitError) {
      /** @TODO post error to stream */
    }
  }
}
