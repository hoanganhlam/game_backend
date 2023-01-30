import express from 'express';
import {getWorldsHandler} from '../controllers/world.controller';

const router = express.Router();

router
  .route('/')
  .get(getWorldsHandler);

export default router;
