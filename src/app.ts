import http from "http";

require('dotenv').config();
import express, {NextFunction, Request, Response} from 'express';
import config from 'config';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import {AppDataSource} from './utils/data-source';
import AppError from './utils/appError';
import authRouter from './routes/auth.routes';
import userRouter from './routes/user.routes';
import worldRouter from './routes/world.routes';
import redisRouter from './routes/redis.routes';
import validateEnv from './utils/validateEnv';
import redisClient from './utils/connectRedis';
import {Server} from "socket.io";


const whitelist = [
  "http://127.0.0.1:3000",
  "http://192.168.1.3:3000"
]

const PLAYER_STATES = {
  IDLING: 'IDLING',
  RUNNING: 'RUNNING',
  DUCKING: 'DUCKING',
  JUMPING: 'JUMPING',
  DEAD: 'DEAD',
}

interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
}

interface ClientToServerEvents {
  hello: () => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  name: string;
  age: number;
}

function getRandomInt(min: number, max: number) {
  min = Math.floor(min);
  max = Math.floor(max) + 1;
  return Math.floor(Math.random() * (max - min) + min);
}

async function spawn(io: any) {
  while (true) {
    const data = []
    for (let i = 0; i < 3; i++) {
      const type = getRandomInt(0, 1)
      const gameWidth = 500
      const width = 24
      const height = 24
      const min = gameWidth * 3 / 20
      const max = gameWidth * 17 / 20

      let x = min, y = min, r = 1;

      const t = getRandomInt(min, max)
      const p = getRandomInt(0, 3)
      switch (p) {
        case 0:
          x = t
          y = min - height / 2
          r = 0
          break
        case 1:
          x = max + height / 2
          y = t
          r = 1
          break
        case 2:
          x = t
          y = max + height / 2
          r = 2
          break
        case 3:
          x = min - height / 2
          y = t
          r = -1
          break
      }
      const now = new Date()
      data.push({
        type: type,
        width: width,
        height: height,
        position: p,
        radian: r,
        x: x,
        y: y,
        time_start: now.getTime() + 3000,
        time_end: now.getTime() + 6000
      })
    }
    await redisClient.set('current_obstacles', JSON.stringify(data))
    io.emit('spawn', data)
    await new Promise(r => setTimeout(r, 5000));
  }
}

AppDataSource.initialize()
  .then(async () => {
    // VALIDATE ENV
    await redisClient.set('current_players', '{}')
    validateEnv();

    const app = express();
    const server = http.createServer(app);

    const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
      cors: {
        origin: whitelist,
        methods: ["GET", "POST"]
      },
    });
    const rawCurrentPlayers = await redisClient.get('current_players');
    const currentPlayers = rawCurrentPlayers ? JSON.parse(rawCurrentPlayers) : {};
    io.on('connection', (socket: any) => {
      socket.on('new_player', function () {
        const player = {
          id: socket.id,
          x: 0,
          y: 0,
          state: PLAYER_STATES.IDLING,
          created: new Date().getTime(),
          updated: 0,
          score: 0,
          totalScore: 0
        };
        socket.player = player;
        currentPlayers[socket.id] = player;
        // @ts-ignore
        io.emit('new_player', player);
        redisClient.get('current_obstacles').then(data => {
          socket.emit('current_obstacles', data);
        })

        socket.on('player_flip', function () {
          // @ts-ignore
          io.emit('player_flip', socket.player.id);
        });

        socket.on('player_kick', function (data: any) {
          // @ts-ignore
          io.emit('player_kick', {
            id: socket.player.id,
            ...data
          });
        });

        socket.on('player_die', function () {
          // @ts-ignore
          io.emit('player_die', socket.player.id);
        });

        socket.on('player_move', function (data: any) {
          const player = currentPlayers[socket.player.id];
          const now = new Date().getTime();
          if (player.state !== PLAYER_STATES.RUNNING && data.state === PLAYER_STATES.RUNNING) {
            player.updated = now;
          }
          if (player.state === PLAYER_STATES.RUNNING && data.state === PLAYER_STATES.DEAD) {
            player.totalScore = player.totalScore + (now - player.updated) / 1000;
          }
          if (player.state === PLAYER_STATES.RUNNING) {
            player.score = (now - player.updated) / 1000;
          }
          if (player.state !== data.state) {
            player.state = data.state;
          }
          currentPlayers[socket.player.id] = {
            ...player,
            ...data
          };
          // @ts-ignore
          io.emit('player_move', {
            id: socket.player.id,
            ...data,
            score: player.score,
            totalScore: player.totalScore
          });
        });

        socket.on('disconnect', function () {
          // @ts-ignore
          io.emit('player_remove', socket.player.id);
          delete currentPlayers[socket.id];
          redisClient.set('current_players', JSON.stringify(currentPlayers))
        });
      });
    });

    // 1. Body parser
    app.use(express.json({limit: '10kb'}));

    // 2. Logger
    if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

    // 3. Cookie Parser
    app.use(cookieParser());

    // 4. Cors
    app.use(
      cors({
        origin: whitelist,
        credentials: true,
      })
    );

    // ROUTES
    app.use('/api/auth', authRouter);
    app.use('/api/users', userRouter);
    app.use('/api/worlds', worldRouter);
    app.use('/', redisRouter);

    // UNHANDLED ROUTE
    app.all('*', (req: Request, res: Response, next: NextFunction) => {
      next(new AppError(404, `Route ${req.originalUrl} not found`));
    });

    // GLOBAL ERROR HANDLER
    app.use(
      (error: AppError, req: Request, res: Response, next: NextFunction) => {
        error.status = error.status || 'error';
        error.statusCode = error.statusCode || 500;

        res.status(error.statusCode).json({
          status: error.status,
          message: error.message,
        });
      }
    );

    const port = config.get<number>('port');
    server.listen(port);

    console.log(`Server started on port: ${port}`);

    spawn(io).then(() => {
      console.log("HEHE");
    })

    setInterval(() => {
      redisClient.set('current_players', JSON.stringify(currentPlayers))
    }, 800);

  })
  .catch((error) => console.log(error));
