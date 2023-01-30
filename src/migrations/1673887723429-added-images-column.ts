import { MigrationInterface, QueryRunner } from "typeorm";

export class addedImagesColumn1673887723429 implements MigrationInterface {
    name = 'addedImagesColumn1673887723429'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "username" character varying NOT NULL, "password" character varying NOT NULL, "avatar" character varying NOT NULL DEFAULT 'default.png', CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "worlds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "players" text array NOT NULL, CONSTRAINT "PK_8b447f7a2b28d3567db893ae7a6" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "worlds"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
