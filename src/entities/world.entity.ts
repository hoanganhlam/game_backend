import { Column, Entity } from 'typeorm';
import Model from './model.entity';

@Entity('worlds')
export class World extends Model {
  @Column("text", { array: true })
  players: string[];
}
