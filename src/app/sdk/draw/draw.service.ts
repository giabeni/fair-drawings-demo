import { DrawData } from './interfaces/draw-data.interface';
import { Stakeholder } from './entities/stakeholder.entity';
import { Draw } from './entities/draw.entity';
import { DrawErrorEvent, DrawEvent } from './interfaces/draw-event.interface';
import { Observable, Subject } from 'rxjs';
import { Commit } from '../commit-reveal/interfaces/commit.interface';
import * as crypto from 'crypto';
import { Reveal } from '../commit-reveal/interfaces/reveal.interface';
import { RawCommit } from '../commit-reveal/interfaces/raw-commit.interface';
import { Communicator } from './communicators/communicator.service';
import { PaginationResponse } from './interfaces/pagination-response.inteface';
import { DrawEventType } from './enums/draw-event-type.enum';
import { DrawEventEngine } from './draw-event.engine';
import { Candidate } from './entities/candidate.entity';
import { DrawStatus } from '../../../interfaces/draw.interfaces';
import { CommitRevealService } from '../commit-reveal/commit-reveal.service';
import { SignedCommit } from '../commit-reveal/interfaces/signed-commit.interface';
import { Buffer} from 'buffer';
import { SignedReveal } from '../commit-reveal/interfaces/signed-reveal.interface';
import { DrawAck } from './interfaces/draw-ack.interface';
import { DrawAckType } from './enums/draw-ack-type.enum';
import { deepEqual } from './utils/object.functions';
import { SecurityService } from '../security/security.service';

/**
 * Static class to handle actions for Draws
 */
export class DrawService<D = DrawData> {
  private static _communicator: Communicator;

  public static setCommunicator(communicator: Communicator) {
    this._communicator = communicator;
  }

  public static getCommunicator() {
    return this._communicator;
  }

  public static async createDraw(draw: Draw): Promise<DrawEvent> {
    return await this._communicator.createDraw(draw);
  }

  public static async getDraws(page = 1, perPage = 25): Promise<PaginationResponse<Draw>> {
    const list = await DrawService._communicator.getDrawsList(page, perPage).catch((error) => {
      throw new Error(error);
    });

    return list;
  }

  public static async subscribeToDrawsList(): Promise<Observable<Draw[]>> {
    return await DrawService._communicator.subscribeToDrawsList().catch((error) => {
      throw new Error(error);
    });
  }

  public static async getDraw(uuid: string): Promise<Draw | undefined> {
    const draw = await this._communicator.getDraw(uuid);
    return new Draw(draw);
  }

  public static async watchDraw(uuid: string, drawInstance: Draw) {
    try {
      // gets the initial static state of the draw
      const draw = await this.getDraw(uuid);

      if (!draw) {
        throw new Error('ERR_DRAW_NOT_FOUND');
      }

      drawInstance = draw;

      // start listening to the draw
      const drawStream = await DrawService._communicator.listen(uuid);

      return new Observable<{ draw: Draw, event: DrawEvent}>
        ((subject: any) => {
          // event engine to handle updates in the draw
          drawStream.subscribe(async (event) => {
            // checks if the event hasn't already been received
            if (drawInstance.isNewEvent(event)) {
              await DrawEventEngine.handleEvent(event, drawInstance);

              // records this event in the event history
              drawInstance.recordEvent(event);
              // sends the updated draw to the client
              subject.next({
                draw: drawInstance,
                event,
              });
            }
          });
        });
    } catch (error) {
      throw error;
    }
  }

  public static async joinDraw(draw: Draw): Promise<true> {
    return this._communicator.joinDraw(draw.uuid);
  }

  public static async leaveDraw(draw: Draw): Promise<true> {
    return this._communicator.leaveDraw(draw);
  }

  public static async sendSignedCommit(uuid: string, rawCommit: RawCommit, privateKey: JsonWebKey) {
    const commit = CommitRevealService.createCommit(rawCommit);

    console.log(`🚀 ~ file: draw.service.ts ~ line 110 ~ DrawService<D ~ sendSignedCommit ~ commit`, commit);
    const encodedCommit = new TextEncoder().encode(JSON.stringify(commit));
    const signature = await SecurityService.sign(encodedCommit, privateKey);

    const signedCommit: SignedCommit = {
      commit,
      signature,
    };

    return this._communicator.post({
      type: DrawEventType.COMMIT_RECEIVED,
      data: signedCommit,
    }, uuid);
  }

  public static async sendSignedReveal(uuid: string, rawReveal: Reveal, privateKey: JsonWebKey) {
    const reveal = CommitRevealService.createReveal(rawReveal);

    const encodedReveal = new TextEncoder().encode(JSON.stringify(reveal));
    const signature = await SecurityService.sign(encodedReveal, privateKey);

    const signedReveal: SignedReveal = {
      reveal,
      signature,
    };

    return this._communicator.post({
      type: DrawEventType.REVEAL_RECEIVED,
      data: signedReveal,
    }, uuid);
  }

  public static sendAck(draw: Draw, type: DrawAckType) {
    let ack: DrawAck;

    switch (type) {
      case DrawAckType.ALL_JOINED:
        ack = {
          type,
          candidates: draw.candidates,
        };
        break;
      case DrawAckType.ALL_COMMITED:
        ack = {
          type,
          commits: draw.commits,
        };
        break;
      case DrawAckType.ALL_REVEALED:
        ack = {
          type,
          reveals: draw.reveals,
        };
        break;
      case DrawAckType.FINISHED:
        ack = {
          type,
          winner: draw.winner,
        };
        break;
    }
    return this._communicator.post({
      type: DrawEventType.ACK,
      data: ack,
    }, draw.uuid);
  }

  public static validateAck(draw: Draw, ack: DrawAck) {
    switch (ack.type) {
      case DrawAckType.ALL_JOINED:
        return  ack.candidates.length === draw.candidates.length &&
                ack.candidates.every(
                  (ackCandidate) => draw.candidates.find(drawCandidate => ackCandidate.id === drawCandidate.id)
                );
      case DrawAckType.ALL_COMMITED:
        return  ack.commits.length === draw.commits.length &&
                ack.commits.every(
                  (ackCommit) => draw.commits.find(drawCommit => deepEqual(drawCommit, ackCommit))
                );
      case DrawAckType.ALL_REVEALED:
        return  ack.reveals.length === draw.reveals.length &&
                ack.reveals.every(
                  (ackReveal) => draw.reveals.find(drawReveal => deepEqual(drawReveal, ackReveal))
                );
      case DrawAckType.FINISHED:
        return ack.winner.id === draw.winner.id;

      default:
        return false;
    }
  }

  public static sendWinner(draw: Draw) {
    if (!draw.winner) {
      throw new Error('WINNER_NOT_FOUND');
    }
    return this.sendAck(draw, DrawAckType.FINISHED);
  }

  public static updateStatus(draw: Draw, status: DrawStatus) {
    return this._communicator.post({
      type: DrawEventType.STATUS_CHANGED,
      data: status,
    }, draw.uuid);
  }

  /**
   * Checks the format, the sender and the signature of a commit
   * @param signedCommit the commit with the sender signature
   */
  public static async checkCommit(draw: Draw, signedCommit: SignedCommit) {

    // check commit format
    if (!CommitRevealService.checkCommitFormat(signedCommit.commit)) {
      /** @TODO post WRONG_COMMIT_FORMAT */
      return DrawEventType.WRONG_COMMIT_FORMAT;
    }
    console.log('Check commit ===> FORMAT OK');

    // check if candidate is subscribed to the draw
    const candidate = draw.getCandidateByUserId(signedCommit.commit.userId);
    if (!candidate) {
      /** @TODO post FORBIDDEN_COMMIT_USER_ID */
      return DrawEventType.FORBIDDEN_COMMIT_USER_ID;
    }
    console.log('Check commit ===> CANDIDATE ID OK', candidate);

    // checks if player hasn't already sent his commit
    if (!!draw.getCommitByCandidate(candidate)) {
      /** @TODO post DUPLICATE_COMMIT */
      return DrawEventType.DUPLICATE_COMMIT;
    }
    console.log('Check commit ===> DUPLICATE OK');

    // checks signature of commit
    if (!candidate.publicKey) {
      /** @TODO post UNAUTHORIZED_COMMIT_SIGNATURE */
      return DrawEventType.UNAUTHORIZED_COMMIT_SIGNATURE;
    }
    console.log('Check commit ===> CANDIDATE PUBLIC KEY OK');

    console.log(`🚀 ~ file: draw.entity.ts ~ line 378 ~ Draw<D ~ checkCommit ~ signedCommit.commit`, signedCommit.commit);
    const encodedCommit = new TextEncoder().encode(JSON.stringify(signedCommit.commit));

    const isSignatureValid = await SecurityService.verifySignature(
      encodedCommit,
      candidate.publicKey,
      signedCommit.signature,
    );

    if (!isSignatureValid) {
      /** @TODO post UNAUTHORIZED_COMMIT_SIGNATURE */
      return DrawEventType.UNAUTHORIZED_COMMIT_SIGNATURE;
    }
    console.log('Check commit ===> SIGNATURE OK');

    return true;
  }

  /**
   * Checks the sender and the signature of a reveal
   * @param signedReveal the reveal with the sender signature
   */
  public static async checkReveal(draw: Draw, signedReveal: SignedReveal) {
    // check if candidate is subscribed to the draw
    const candidate = draw.getCandidateByUserId(signedReveal.reveal.userId);
    if (!candidate || !candidate.eligible) {
      /** @TODO post FORBIDDEN_REVEAL_USER_ID */
      return DrawEventType.FORBIDDEN_REVEAL_USER_ID;
    }

    // checks if player hasn't already sent his reveal
    if (!!draw.getRevealByCandidate(candidate)) {
      /** @TODO post DUPLICATE_REVEAL */
      return DrawEventType.DUPLICATE_REVEAL;
    }

    /** @TODO !IMPORTANT! - Validar assinatura */

    // checks signature of reveal
    if (!candidate.publicKey) {
      /** @TODO post UNAUTHORIZED_REVEAL_SIGNATURE */
      return DrawEventType.UNAUTHORIZED_REVEAL_SIGNATURE;
    }

    const encodedReveal = new TextEncoder().encode(JSON.stringify(signedReveal.reveal));

    const isSignatureValid = await SecurityService.verifySignature(
      encodedReveal,
      candidate.publicKey,
      signedReveal.signature,
    );

    if (!isSignatureValid) {
      /** @TODO post UNAUTHORIZED_REVEAL_SIGNATURE */
      return DrawEventType.UNAUTHORIZED_REVEAL_SIGNATURE;
    }

    // Gets commit sent by candidate
    const commit = draw.getCommitByCandidate(candidate);
    if (!commit) {
      /** @TODO handle unpredicted errors */
      return DrawEventType.FORBIDDEN_REVEAL_USER_ID;
    }

    const isRevealMatchingCommit = CommitRevealService.validateReveal(signedReveal.reveal, commit);
    if (!isRevealMatchingCommit) {
      /** @TODO post INVALID_REVEAL_MASK */
      /** @TODO set status to INVALIDATED */
      return DrawEventType.INVALID_REVEAL_MASK;
    }

    return true;
  }

  public static async sendError(draw: Draw, errorEvent: DrawErrorEvent) {
    return this._communicator.post(errorEvent, draw.uuid);
  }
}
