import { PaginationResponse } from '../interfaces/pagination-response.inteface';
import { Draw } from '../entities/draw.entity';
import { DrawEvent } from '../interfaces/draw-event.interface';
import { Observable } from 'rxjs';
import { DrawData } from '../interfaces/draw-data.interface';
import { Stakeholder } from '../entities/stakeholder.entity';
import { Candidate } from '../entities/candidate.entity';

/**
 * Abstract class to handle sending and recieving of DrawEvents through all stakeholders.
 * Its children can implement the messages exchange using different technologies, provided that the methods are correclty strucutred.
 */
export abstract class Communicator<P = any, C = any> {
  /**
   * Starts the communications: handshakes, connectivity tests, peer recogintion...
   * @param params any settings used to start de communication
   * @returns C as connection object, containing any relevant information about the communication
   */
  abstract async openConnection(params?: P): Promise<C>;

  /**
   * Finishes the open connection
   */
  abstract async closeConnection(): Promise<boolean>;

  /**
   * Retrieves a subset of all available draws in the current communication.
   * @param page the subset index of the total draws
   * @param perPage the maximum length of the subset
   */
  abstract async getDrawsList(page: number, perPage: number): Promise<PaginationResponse<Draw>>;

  /**
   * Subscribes to all available draws in the current communication.
   * @param page the subset index of the total draws
   * @param perPage the maximum length of the subset
   */
  abstract async subscribeToDrawsList(): Promise<Observable<Draw[]>>;

  /**
   * Inserts a new draw instace in the repository and alert all subscribers in the connection.
   * @param draw the draw instance
   */
  abstract async createDraw(draw: Draw): Promise<DrawEvent>;

  /**
   * Returns the current public data of the draw with this uuid.
   * @param uuid the unique id of the draw
   */
  abstract async getDraw(uuid: string): Promise<Draw>;

  /**
   * Adds candidate to the draw room, and informs all others subscrivers
   * @param uuid unique id of the draw.
   */
  abstract async joinDraw(uuid: string): Promise<true>;

  /**
   * Remove candidate from the draw room, and informs all others subscrivers
   * @param uuid unique id of the draw.
   * @param candidate the candidate object to remove
   */
  abstract async leaveDraw(uuid: string): Promise<true>;

  /**
   * Alerts all active users in the connection.
   * @param event the event to alert all users present in the connection
   */
  abstract async broadcast(event: DrawEvent): Promise<boolean>;

  /**
   * Sends a update for a specific draw.
   * @param event the event to inform the users listening to a specif draw
   * @param uuid the unique identifier of the draw
   */
  abstract async post(event: DrawEvent, uuid: string): Promise<boolean>;

  /**
   * Receives the updates that happens in a specific draw.
   * @param uuid the unique identifier of the draw
   */
  abstract async listen(uuid: string): Promise<Observable<DrawEvent | undefined>>;

  constructor() {}
}
