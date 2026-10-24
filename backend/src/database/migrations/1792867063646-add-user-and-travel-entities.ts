import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserAndTravelEntities1792867063646 implements MigrationInterface {
    name = 'AddUserAndTravelEntities1792867063646'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'agent', 'customer')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'customer', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "processed_notifications" ("event_id" uuid NOT NULL, "reservation_id" uuid NOT NULL, "message" text NOT NULL, "processed_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "UQ_52b9d8082116565bb1ed9ad7d2a" UNIQUE ("reservation_id"), CONSTRAINT "REL_52b9d8082116565bb1ed9ad7d2" UNIQUE ("reservation_id"), CONSTRAINT "PK_d9a5a273220184dc0fddebe8936" PRIMARY KEY ("event_id"))`);
        await queryRunner.query(`CREATE TYPE "public"."reservations_payment_status_enum" AS ENUM('PENDING', 'PAID', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "reservations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "traveler_count" integer NOT NULL, "unit_price" numeric(12,2) NOT NULL, "total_amount" numeric(14,2) NOT NULL, "payment_status" "public"."reservations_payment_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "customer_id" uuid NOT NULL, "created_by_id" uuid NOT NULL, "package_id" uuid NOT NULL, CONSTRAINT "CHK_836e750d3822940686a616768d" CHECK ("total_amount" >= 0), CONSTRAINT "CHK_92f9655bb2c8768ca930be1997" CHECK ("unit_price" >= 0), CONSTRAINT "CHK_8fd3d912c8f4100e7eeae0d024" CHECK ("traveler_count" > 0), CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_reservations_customer_id" ON "reservations"  ("customer_id") `);
        await queryRunner.query(`CREATE INDEX "idx_reservations_created_by_id" ON "reservations"  ("created_by_id") `);
        await queryRunner.query(`CREATE INDEX "idx_reservations_package_id" ON "reservations"  ("package_id") `);
        await queryRunner.query(`CREATE TABLE "packages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "destination" character varying(255) NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "price" numeric(12,2) NOT NULL, "total_capacity" integer NOT NULL, "available_slots" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_04a3b59e5fe46acb66bf6062c1" CHECK ("end_date" >= "start_date"), CONSTRAINT "CHK_ac8660ea09efa29246bf02dca9" CHECK ("available_slots" <= "total_capacity"), CONSTRAINT "CHK_39b99c6222f0602a0dd20d609f" CHECK ("available_slots" >= 0), CONSTRAINT "CHK_b0205b586455af261101f1da06" CHECK ("total_capacity" > 0), CONSTRAINT "CHK_e230df575217e42fd26f174d96" CHECK ("price" >= 0), CONSTRAINT "PK_020801f620e21f943ead9311c98" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "processed_notifications" ADD CONSTRAINT "FK_52b9d8082116565bb1ed9ad7d2a" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "FK_f63cb79a34cdf2d47ab23f31a8b" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "FK_28c987cc11002bde1fab90b8b24" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "FK_c9496fd4d6e5a4424db5e1e4526" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_c9496fd4d6e5a4424db5e1e4526"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_28c987cc11002bde1fab90b8b24"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_f63cb79a34cdf2d47ab23f31a8b"`);
        await queryRunner.query(`ALTER TABLE "processed_notifications" DROP CONSTRAINT "FK_52b9d8082116565bb1ed9ad7d2a"`);
        await queryRunner.query(`DROP TABLE "packages"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reservations_package_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reservations_created_by_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reservations_customer_id"`);
        await queryRunner.query(`DROP TABLE "reservations"`);
        await queryRunner.query(`DROP TYPE "public"."reservations_payment_status_enum"`);
        await queryRunner.query(`DROP TABLE "processed_notifications"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}
