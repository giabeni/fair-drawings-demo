import { DrawData } from './interfaces/draw-data.interface';
import { Stakeholder } from './entities/stakeholder.entity';
import { Draw } from './entities/draw.entity';
import { DrawEvent } from './interfaces/draw-event.interface';
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
import { DrawAck } from './enums/draw-ack.enum';
import { DrawStatus } from '../../../interfaces/draw.interfaces';
import { CommitRevealService } from '../commit-reveal/commit-reveal.service';
import { SignedCommit } from '../commit-reveal/interfaces/signed-commit.interface';
import { Buffer} from 'buffer';
import { SignedReveal } from '../commit-reveal/interfaces/signed-reveal.interface';

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

  public static async joinDraw(draw: Draw, publicKey: CryptoKey): Promise<true> {
    return this._communicator.joinDraw(draw.uuid);
  }

  public static sendSignedCommit(uuid: string, rawCommit: RawCommit, privateKey: crypto.KeyObject) {
    const commit = CommitRevealService.createCommit(rawCommit);
    /** @TODO sign commit */

    const signedCommit: SignedCommit = {
      commit,
      signature: Buffer.from('dsadasdsadsad'),
    };

    return this._communicator.post({
      type: DrawEventType.COMMIT_RECEIVED,
      data: signedCommit,
    }, uuid);
  }

  public static sendSignedReveal(uuid: string, rawReveal: Reveal, privateKey: crypto.KeyObject) {
    const reveal = CommitRevealService.createReveal(rawReveal);
    /** @TODO sign reveal */

    const signedReveal: SignedReveal = {
      reveal,
      signature: Buffer.from('dsadasdsadsad'),
    };

    return this._communicator.post({
      type: DrawEventType.REVEAL_RECEIVED,
      data: signedReveal,
    }, uuid);
  }

  public static sendAck(uuid: string, type: DrawAck) {
    return this._communicator.post({
      type: DrawEventType.ACK,
      data: type,
    }, uuid);
  }

  public static updateStatus(uuid: string, status: DrawStatus) {
    return this._communicator.post({
      type: DrawEventType.STATUS_CHANGED,
      data: status,
    }, uuid);
  }

  /**
   * ****** DRAFT *******
   * Main Flow:
   *
   * 1. Set connector
   *
   * 2. Start connection
   *
   * 3. Get list of draws
   *
   * 4. Create draw
   *    > Every one in the connection must be able to see
   *
   * 5. Add owner as candidate
   * 6. Others candidates join draw
   *    > All previous candidates must be informed
   *
   * 8. Each candidate send his commit
   *    > All other must be informed
   *      >> Keys must be validated
   *      >> Commit must be validated
   *      >> All candidates must agree about the received value
   *
   * 9. When all candidates sent their commit
   *    > Trigger status change of draw
   *    > Consensus of all status change
   *
   *
   */
}
