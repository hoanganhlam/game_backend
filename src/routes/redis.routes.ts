import express, {NextFunction, Request, Response} from 'express';
import redisClient from '../utils/connectRedis';

const getData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let obstacles:any = []
    let players:any = {}
    const obstacles_raw = await redisClient.get('current_obstacles')
    const players_raw = await redisClient.get('current_players')
    if (obstacles_raw) obstacles = JSON.parse(obstacles_raw);
    if (players_raw) players = JSON.parse(players_raw);
    res.status(200).json({
      status: 'success',
      data: {
        obstacles,
        players
      },
    });
  } catch (err: any) {
    next(err);
  }
};

const router = express.Router();

router
  .route('/')
  .get(getData);

export default router;
