import { Stakeholder } from './stakeholder.entity';
import { DrawStatus } from '../enums/draw-status.enum';
import { DrawData } from '../interfaces/draw-data.interface';
import { SecurityService } from '../../security/security.service';
import { Commit } from '../../commit-reveal/interfaces/commit.interface';
import { Reveal } from '../../commit-reveal/interfaces/reveal.interface';
import { Candidate } from './candidate.entity';
import { SignedCommit } from '../../commit-reveal/interfaces/signed-commit.interface';
import { CommitRevealService } from '../../commit-reveal/commit-reveal.service';
import { v4 as uuidv4 } from 'uuid';
import { DrawEventType } from '../enums/draw-event-type.enum';
import { SignedReveal } from '../../commit-reveal/interfaces/signed-reveal.interface';
import { DrawErrorEvent, DrawEvent } from '../interfaces/draw-event.interface';
import { DrawAckType } from '../enums/draw-ack-type.enum';
import { DrawAck } from '../interfaces/draw-ack.interface';
import { DrawService } from '../draw.service';

export class Draw<D = DrawData> {
  /**
   * Unique identifier of a draw
   */
  public readonly uuid?: string;

  /**
   * Additional information related to the draw.
   * Using the D generic type (default is any);
   */
  public readonly data?: D;

  /**
   * The maximum number of candidates required to automatically start the draw.
   */
  private _spots: number = 4;

  /**
   * The minimum number of candidates required to automatically start the draw.
   */
  private _minSpots: number = 4;

  /**
   * The user id of the creator user
   */
  private _creatorId?: string;

  /**
   * Current phase of draw.
   */
  private _status?: DrawStatus;

  /**
   * The candidate that was drawn
   */
  private _winner?: Candidate;

  /**
   * List of participants that can contribute to the draw.
   * Not all of them must be elegible to be drawn.
   */
  public readonly stakeholders: Stakeholder[] = [];

  /**
   * List of all commits registered in the draw
   */
  public readonly commits: (Commit & { valid?: boolean })[] = [];

  /**
   * List of all reveals registered in the draw
   */
  public readonly reveals: (Reveal & { valid?: boolean })[] = [];

  /**
   * Table of all acknoledgements sent by other peers
   */
  private _acks = {
    ALL_JOINED: {},
    ALL_COMMITED: {},
    ALL_REVEALED: {},
    ALL_FINISHED: {},
  };

  /**
   * History of all event previously sent
   */
  private _eventsHistory: {
    event: DrawEvent,
    receivedAt: Date,
  }[] = [];

  /**
   * The list of errors ocurred in the proccess
   */
  private readonly _errors: DrawErrorEvent[] = [];

  /**
   * Get only the elegible stakeholders.
   */
  public get candidates(): Candidate[] {
    return this.stakeholders && this.stakeholders.length ?
      this.stakeholders
        .filter((stakeholder) => stakeholder.eligible)
        .map((stakeholder) => new Candidate(stakeholder))
        :
      [];
  }

  /**
   * Get the number of elegible stakeholders.
   */
  public get candidatesCount() {
    return this.candidates.length;
  }

  /**
   * Returns the current status of the draw
   */
  public get status() {
    return this._status;
  }

  /**
   * Returns the number of spots in the draw
   */
  public get spots() {
    return this._spots;
  }

  /**
   * @returns the winner of the Draw or undefined in case it is not finished yet
   */
  public get winner() {
    return this._winner;
  }

  constructor(spotCount: number, creatorId: string, data?: D);
  constructor(draw?: Draw<D>);

  constructor(...args: (number|Draw|string|D)[]) {
    if (args.length === 3) {
      this._spots = args[0] as number;
      this._status = DrawStatus.PENDING;
      this._creatorId = String(args[1]);
      this.data = args[2] as D;
      this.uuid = uuidv4();
    } else if (args.length === 1 && !!args[0]) {
      const draw = args[0] as Draw;
      this._status = draw.status || DrawStatus.PENDING;
      this.data = draw.data as D;
      this._spots = Number(draw.spots);
      this.uuid = String(draw.uuid);
      if (draw.stakeholders && draw.stakeholders.length > 0) {
        this.addStakeholders(draw.stakeholders);
      } else {
        this.stakeholders = [];
      }

      if (draw.status === DrawStatus.FINISHED && draw.winner) {
        this._winner = new Candidate(draw.winner);
      }

    }

  }

  /**
   * Fires auto update of the draw status.
   * @returns true if status has changed and false if not.
   */
  public async updateStatus() {
    const previousStatus = this._status;

    if (this.hasErrors()) {
      this._status = DrawStatus.INVALIDATED;
      return this._status;
    }

    if (
      this.candidates.length < this.spots
    ) {
        this._status = DrawStatus.PENDING;
    }
    else if (
      previousStatus === DrawStatus.PENDING &&
      this.spots === this.candidates.length &&
      this.checkAcksByType(DrawAckType.ALL_JOINED)
    ) {
        this._status = DrawStatus.COMMIT;
    }
    else if (
      previousStatus === DrawStatus.COMMIT &&
      this.commits.length === this.candidates.length &&
      this.checkAcksByType(DrawAckType.ALL_COMMITED)
    ) {
        this._status = DrawStatus.REVEAL;
    }
    else if (
      previousStatus === DrawStatus.REVEAL &&
      this.reveals.length === this.candidates.length &&
      this.checkAcksByType(DrawAckType.ALL_REVEALED)
    ) {
        await this.computeWinner();
        this._status = DrawStatus.FINISHED;
    }

    return previousStatus !== this._status ? this._status : false;
  }

  /**
   * Register a new stakeholder in the Draw.
   * If stakeholder is already added, then, updates its information.
   * @param stakeholder the Stakeholder instance.
   * @param elegible wether force stakeholder's elegibility in the draw
   */
  public addStakeholder(stakeholder: Stakeholder, eligible?: boolean) {
    const existentStakeholder = this.stakeholders.find((stkholder) => stkholder.id === stakeholder.id);

    stakeholder.eligible = !!eligible;

    if (existentStakeholder) {
      Object.assign(existentStakeholder, stakeholder);
    } else {
      this.stakeholders.push(stakeholder);
    }
  }

  /**
   * Register new stakeholders in the Draw.
   * @param stakeholders the Stakeholder array instance.
   * @param elegible wether force stakeholder's elegibility in the draw
   */
  public addStakeholders(stakeholders: Stakeholder[], eligible?: boolean) {
    for (const stakeholder of stakeholders) {
      this.addStakeholder(stakeholder, eligible === undefined ? stakeholder.eligible : eligible);
    }
  }

  /**
   * Removes a stakeholder from the Draw.
   * @param stakeholder the Stakeholder instance.
   */
  public removeStakeholder(stakeholder: Stakeholder | string) {
    let foundIndex: number;

    if (typeof stakeholder === 'string') {
      foundIndex = this.stakeholders.findIndex((stkholder) => stkholder.id === stakeholder);
    } else {
      foundIndex = this.stakeholders.findIndex((stkholder) => stkholder.id === stakeholder.id);
    }

    if (foundIndex === -1) {
      throw new Error('ERR_REMOVE_STKHOLDER: Id not found at stakeholders list');
    }

    return this.stakeholders.splice(foundIndex, 1);
  }

  /**
   * Checks if event hasn't been received yet.
   * @param event the event object.
   */
  public isNewEvent(event: DrawEvent) {
    const oldEvent = this._eventsHistory.find(ev => ev.event.eventId === event.eventId);
    return !oldEvent;
  }

  /**
   * Saves the event in the history and sort list descending.
   * @param event the event object.
   */
  public recordEvent(event: DrawEvent) {
    this._eventsHistory.push({
      event,
      receivedAt: new Date(),
    });

    this._eventsHistory = this._eventsHistory.sort(
      (a, b) => b.receivedAt.getTime() - a.receivedAt.getTime()
    );
  }

  /**
   * Register the ack sent by a candidate
   * @param type the phase type of the ack.
   * @param userId the id of the user
   */
  public setAck(ack: DrawAck, userId: string) {
    if (!DrawService.validateAck(this, ack)) {
      /** @TODO invalidate draw */
      throw new Error('INVALID ACK ' + ack.type);
    }
    if (!this._acks[ack.type]) {
      this._acks[ack.type] = {};
    }
    this._acks[ack.type][userId] = true;
  }

  /**
   * Check if user has sent specific ack
   * @param type the ack phase type.
   * @param userId the id of the user.
   */
  public checkAck(type: DrawAckType, userId: string) {
    return !!(this._acks[type][userId]);
  }

  /**
   * Checks if all users sent the specific ack type.
   * @param type the ack phase type.
   */
  public checkAcksByType(type: DrawAckType) {
    return Object
      .values(this._acks[type])
      .filter(val => !!val)
      .length === this.spots;
  }


  /**
   * Checks if user is a eligible candidate of the draw
   * @param userId the id of the candidate
   */
  public isCandidate(userId: string) {
    return !!this.candidates.find((drawCandidate) => drawCandidate.id === userId);
  }

  /**
   * Gets the eligible candidate with de userId or undefined
   * @param userId the id of the candidate
   */
  public getCandidateByUserId(userId: string) {
    return this.candidates.find((drawCandidate) => drawCandidate.id === userId);
  }

  /**
   * Gets the commit sent previously with the same userId of candidate.id
   * @param candidate the instance of the candidate
   */
  public getCommitByCandidate(candidate: Candidate) {
    return !!candidate && this.commits.find((commit) => commit.userId === candidate.id);
  }

  /**
   * Gets the reveal sent previously with the same userId of candidate.id
   * @param candidate the instance of the candidate
   */
  public getRevealByCandidate(candidate: Candidate) {
    return !!candidate &&  this.reveals.find((reveal) => reveal.userId === candidate.id);
  }

  /**
   * Saves a new commit to the draw proccess
   * @param signedCommit the encrypted commit object
   * @returns true if registration succeeded
   * @throws Error DrawEventType for commit, if there was any error
   */
  public async registerCommit(signedCommit: SignedCommit, valid: boolean) {
    if (this.status !== DrawStatus.COMMIT) {
      throw new Error('FORBIDDEN_DRAW_STATUS');
    }
    this.commits.push({ ...signedCommit.commit, valid });

    return true;
  }

  /**
   * Saves a new reveal to the draw proccess
   * @param signedReveal the encrypted reveal object
   * @returns true if registration succeeded
   * @throws Error DrawEventType for reveals, if there was any error
   */
  public async registerReveal(signedReveal: SignedReveal, valid: boolean) {
    if (this.status !== DrawStatus.REVEAL) {
      throw new Error('FORBIDDEN_DRAW_STATUS');
    }

    this.reveals.push({ ...signedReveal.reveal, valid });
    return true;
  }

  public setError(errorEvent: DrawErrorEvent) {
    this._errors.push(errorEvent);
  }

  public getErrors() {
    return this._errors;
  }

  public hasErrors() {
    return this._errors.length > 0;
  }

  private async computeWinner() {
    console.log('Computing winner....');
    if (this.status !== DrawStatus.REVEAL || this.candidates.length <= 0) {
      throw new Error('FORBIDDEN_DRAW_STATUS');
    }

    // checks if all reveals are valid
    const areAllRevealsValid = !this.reveals.find((reveal) => !reveal.valid);
    console.log('All reveals valid?', areAllRevealsValid);

    if (!areAllRevealsValid) {
      /** @TODO post INVALID_REVEAL_MASK */
      /** @TODO set status to INVALIDATED */
      return DrawEventType.INVALID_REVEAL_MASK;
    }

    // winner index being the rest of the division betwwen sum and number of candidates
    const winnerIndex = this.getWinnerIndex();
    console.log('Winner index is', winnerIndex);

    const winnerCandidate = this.getCandidateWithIndex(winnerIndex);
    // avoiding out of range index
    if (!!winnerCandidate) {
      this._winner = winnerCandidate;
      await DrawService.sendWinner(this);
      return this._winner;
    } else {
      throw new Error('WINNER_INDEX_OUT_OF_RANGE');
    }
  }

  public getCandidateWithIndex(index: number) {
    return this.candidates.find(candidate => candidate.isAtIndex(index));
  }

  /** share values vector */
  public getValues() {
    return this.reveals.map((reveal) => {
      const share = Number(reveal.data);
      if (isNaN(share)) {
        throw new Error('INVALID_REVEAL_DATA');
      } else {
        return share;
      }
    });
  }

  /** Returns the sum of values revealed */
  public getSum() {
    return this.getValues()
      .reduce((acc, value) => acc + value, 0);
  }

  /** Returns the index of the winner candidate */
  public getWinnerIndex() {
    return this.getSum() % this.candidates.length;
  }

}
