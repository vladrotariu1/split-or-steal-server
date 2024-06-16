import {Injectable} from '@nestjs/common';
import {Server} from 'socket.io';

@Injectable()
export class WebSocketConfig {
    private wsServer: Server;


    getWsServer() {
        return this.wsServer;
    }

    setWsServer(wsServer: Server) {
        this.wsServer = wsServer;
    }
}