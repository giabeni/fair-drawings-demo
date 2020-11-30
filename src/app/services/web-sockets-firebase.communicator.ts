import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { WrappedSocket } from 'ngx-socket-io/src/socket-io.service';
import { Observable } from 'rxjs';
import { PaginationResponse, Draw, DrawData, DrawEvent } from '../../interfaces/draw.interfaces';
import { Communicator } from './communicator';

export interface ConnectionConfig {
  socket: WrappedSocket;
  firebaseAuthToken: string;
  userId: string;
}

@Injectable()
export class WebSocketFirebaseCommunicator extends Communicator {

  socket?: WrappedSocket;
  firebaseAuthToken?: string;
  userId?: string;
  connected = false;

  async openConnection(params: ConnectionConfig): Promise<any> {
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


        this.socket.emit('createDraw', draw);

      } catch (err) {
        console.error(err);
        throw new Error(err);
      }
    });

  }

  broadcast(event: DrawEvent): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  post(event: DrawEvent, uuid: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async getDraw(uuid: string): Promise<Draw> {
    setTimeout(() => {
      this.socket.emit('getDraw', {
        user: {
          id: this.userId,
        },
        drawId: uuid,
      });
    }, 100);
    return this.socket.fromOneTimeEvent<Draw>('getDraw');
  }

  async listen(uuid: string): Promise<Observable<DrawEvent>> {
    return new Promise<Observable<DrawEvent>>((resolve, reject) => {
      try {
        const timeout = setTimeout(() => {
          reject(new Error('TIMEOUT:JOIN_DRAW'));
        }, 5000);

        this.socket.on('drawJoined', (drawJoined) => {
          clearTimeout(timeout);
          resolve(this.socket.fromEvent<DrawEvent>('drawEvent'));
        });

        this.socket.emit('joinDraw', {
          user: {
            id: this.userId,
          },
          drawId: uuid,
        });

      } catch (err) {
        console.error(err);
        throw new Error(err);
      }
    });
  }

}
