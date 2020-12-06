import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { WrappedSocket } from 'ngx-socket-io/src/socket-io.service';
import { Observable } from 'rxjs';
import { Communicator } from '../sdk/draw/communicators/communicator.service';
import { Candidate } from '../sdk/draw/entities/candidate.entity';
import { Draw } from '../sdk/draw/entities/draw.entity';
import { DrawEventType } from '../sdk/draw/enums/draw-event-type.enum';
import { DrawEvent } from '../sdk/draw/interfaces/draw-event.interface';
import { PaginationResponse } from '../sdk/draw/interfaces/pagination-response.inteface';

export interface ConnectionConfig {
  socket: WrappedSocket;
  firebaseAuthToken: string;
  userId: string;
  publicKey: JsonWebKey;
}

@Injectable()
export class WebSocketFirebaseCommunicator extends Communicator<ConnectionConfig, Socket> {

  socket?: WrappedSocket;
  firebaseAuthToken?: string;
  publicKey?: JsonWebKey;
  userId?: string;
  connected = false;

  async openConnection(params: ConnectionConfig): Promise<Socket> {
    if (!params.socket) {
      throw new Error('Missing SocketIo instance from "ngx-socket-io"');
    }
    if (!params.firebaseAuthToken) {
      throw new Error('Missing firbase auth token in parameters.');
    }
    if (!params.userId) {
      throw new Error('Missing firbase userId');
    }
    if (!params.publicKey) {
      throw new Error('Missing public key');
    }

    return new Promise<Socket>((resolve, reject) => {
      try {
        const timeout = setTimeout(() => {
          reject(new Error('TIMEOUT:CONNECTION'));
        }, 5000);

        this.socket = params.socket;
        this.firebaseAuthToken = params.firebaseAuthToken;
        this.userId = params.userId;
        this.publicKey = params.publicKey;

        try {
          this.socket.once('connectionApproved', (approved: boolean) => {
            clearTimeout(timeout);
            if (approved) {
              this.connected = true;
              resolve(this.socket);
            } else {
              this.connected = false;
              reject();
            }
          });

          this.socket.connect();
          this.emit('sendPublicKey', this.publicKey);
        } catch (err) {
          console.error('Couldn`t connect to the server', err);
          this.connected = false;
        }

      } catch (err) {
        console.error(err);
        throw new Error(err);
      }
    });
  }

  async closeConnection(): Promise<boolean> {
    if (!this.socket) {
      throw new Error('Cannot disconnect from empty connection');
    }

    try {
      this.socket.disconnect();
      this.connected = false;
      return true;
    } catch (err) {
      console.error('Couldn`t disconnect from the server', err);
      return false;
    }
  }

  getDrawsList(page: number, perPage: number): Promise<PaginationResponse<Draw>> {
    throw new Error('Method not implemented.');
  }

  async subscribeToDrawsList(): Promise<Observable<Draw[]>> {
    console.log('Subscribing to draws list...');
    setTimeout(() => {
      this.emit('getDrawList');
    }, 100);
    return this.socket.fromEvent<Draw[]>('getDrawList');
  }

  createDraw(draw: Draw): Promise<DrawEvent> {

    const drawBody = {
      data: draw.data,
      spots: draw.spots,
      uuid: draw.uuid,
    };

    return new Promise<DrawEvent>((resolve, reject) => {
      try {
        const timeout = setTimeout(() => {
          reject(new Error('TIMEOUT:CREATE_DRAW'));
        }, 5000);

        this.socket.on('myDrawCreated', (drawCreated) => {
          clearTimeout(timeout);
          resolve({
            type: 'DRAW_CREATED',
            timestamp: new Date().getTime(),
            data: drawCreated,
          } as DrawEvent);
        });


        this.emit('createDraw', drawBody);

      } catch (err) {
        console.error(err);
        throw new Error(err);
      }
    });

  }

  broadcast(event: DrawEvent): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async post(event: DrawEvent, uuid: string): Promise<boolean> {
    event.drawUuid = uuid;
    event.from = {
      id: this.userId,
    };
    return new Promise<true>((resolve, reject) => {
      try {
        const timeout = setTimeout(() => {
          reject(new Error('TIMEOUT:POST_TO_DRAW'));
        }, 5000);

        this.socket.on('eventPosted', () => {
          clearTimeout(timeout);
          resolve(true);
        });

        this.emit('postToDraw', event);

      } catch (err) {
        console.error(err);
        throw new Error(err);
      }
    });
  }

  async getDraw(uuid: string): Promise<Draw> {
    setTimeout(() => {
      this.emit('getDraw', {
        stakeholder: {
          id: this.userId,
        },
        drawUuid: uuid,
      });
    }, 100);
    return this.socket.fromOneTimeEvent<Draw>('getDraw');
  }

  async joinDraw(uuid: string) {
    return new Promise<true>((resolve, reject) => {
      try {
        const timeout = setTimeout(() => {
          reject(new Error('TIMEOUT:JOIN_DRAW'));
        }, 5000);

        this.socket.on('drawJoined', (drawJoined) => {
          clearTimeout(timeout);
          resolve(true);
        });

        this.emit('joinDraw', {
          stakeholder: {
            id: this.userId,
          },
          drawUuid: uuid,
        });

      } catch (err) {
        console.error(err);
        throw new Error(err);
      }
    });
  }

  async leaveDraw(draw: Draw): Promise<true> {
    try {
      const candidate = draw.getCandidateByUserId(this.userId);
      await this.post({
        type: DrawEventType.CANDIDATE_UNSUBSCRIBED,
        data: candidate,
      }, draw.uuid);

      this.emit('leaveDraw', {
        user: {
          id: this.userId,
        },
        drawUuid: draw.uuid,
      });

      return true;
    } catch (err) {
      console.error('Error leaveDraw event', err);
      throw new Error('Error emiting leaveDraw event');
    }
  }

  async listen(uuid: string): Promise<Observable<DrawEvent>> {
    return new Promise<Observable<DrawEvent>>((resolve, reject) => {
      try {
        const timeout = setTimeout(() => {
          reject(new Error('TIMEOUT:LISTEN_DRAW'));
        }, 5000);

        this.socket.on('drawListened', (drawListened) => {
          clearTimeout(timeout);
          resolve(this.socket.fromEvent<DrawEvent>('drawEvent'));
        });

        this.emit('listenDraw', {
          user: {
            id: this.userId,
          },
          drawUuid: uuid,
        });

      } catch (err) {
        console.error(err);
        throw new Error(err);
      }
    });
  }

  private emit(eventName: string, ...args: any[]) {
    return this.socket.emit(eventName, ...args, this.firebaseAuthToken);
  }

}
