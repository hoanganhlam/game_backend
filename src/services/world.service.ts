import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere
} from 'typeorm';
import { World } from '../entities/world.entity';
import { AppDataSource } from '../utils/data-source';

const repository = AppDataSource.getRepository(World);

export const findWorlds = async (
  where: FindOptionsWhere<World> = {},
  select: FindOptionsSelect<World> = {},
  relations: FindOptionsRelations<World> = {}
) => {
  return await repository.find({
    where,
    select,
    relations,
  });
};
