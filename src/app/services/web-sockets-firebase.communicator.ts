import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { WrappedSocket } from 'ngx-socket-io/src/socket-io.service';
import { Observable } from 'rxjs';
import { Communicator } from '../sdk/draw/communicators/communicator.service';
import { Candidate } from '../sdk/draw/entities/candidate.entity';
import { Draw } from '../sdk/draw/entities/draw.entity';
import { DrawEvent } from '../sdk/draw/interfaces/draw-event.interface';
import { PaginationResponse } from '../sdk/draw/interfaces/pagination-response.inteface';

export interface ConnectionConfig {
  socket: WrappedSocket;
  firebaseAuthToken: string;
  userId: string;
}

@Injectable()
export class WebSocketFirebaseCommunicator extends Communicator<ConnectionConfig, Socket> {

  socket?: WrappedSocket;
  firebaseAuthToken?: string;
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

    this.socket = params.socket;
    this.firebaseAuthToken = params.firebaseAuthToken;
    this.userId = params.userId;

    this.socket.ioSocket.query = {
      Authorization: params.firebaseAuthToken,
    };

    console.log(`🚀 ~ file: web-sockets-firebase.communicator.ts ~ line 32 ~ WebSocketFirebaseCommunicator ~ openConnection ~ this.socket.ioSocket`, this.socket.ioSocket);

    try {
      this.socket.connect();
      this.connected = true;
      return this.socket;
    } catch (err) {
      console.error('Couldn`t connect to the server', err);
      this.connected = false;
    }
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
      this.socket.emit('getDrawList');
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


        this.socket.emit('createDraw', drawBody);

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

        this.socket.emit('postToDraw', event);

      } catch (err) {
        console.error(err);
        throw new Error(err);
      }
    });
  }

  async getDraw(uuid: string): Promise<Draw> {
    setTimeout(() => {
      this.socket.emit('getDraw', {
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

        this.socket.emit('joinDraw', {
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

  async leaveDraw(uuid: string): Promise<true> {
    try {
      this.socket.emit('leaveDraw', {
        user: {
          id: this.userId,
        },
        drawUuid: uuid,
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

        this.socket.emit('listenDraw', {
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

}
