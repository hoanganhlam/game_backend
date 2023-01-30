import { NextFunction, Request, Response } from 'express';
import { findWorlds } from '../services/world.service';

export const getWorldsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const posts = await findWorlds({}, {}, {});

    res.status(200).json({
      status: 'success',
      data: {
        posts,
      },
    });
  } catch (err: any) {
    next(err);
  }
};
