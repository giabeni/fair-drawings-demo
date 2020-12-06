import { Commit } from '../../commit-reveal/interfaces/commit.interface';
import { Reveal } from '../../commit-reveal/interfaces/reveal.interface';
import { Candidate } from '../entities/candidate.entity';
import { DrawAckType } from '../enums/draw-ack-type.enum';

export type DrawAck = (
  { type: DrawAckType.ALL_JOINED, candidates: Candidate[] } |
  { type: DrawAckType.ALL_COMMITED, commits: Commit[] }  |
  { type: DrawAckType.ALL_REVEALED, reveals: Reveal[] } |
  { type: DrawAckType.FINISHED, winner: Candidate }
);
