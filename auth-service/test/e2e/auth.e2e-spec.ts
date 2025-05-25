import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AuthModule } from "../../src/auth.module";
import { LoginDto } from "../../src/infrastructure/controllers/dtos/login.dto";

describe("AuthController (e2e)", () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("/auth/login (POST)", () => {
    it("should return 401 for invalid credentials", () => {
      const loginDto: LoginDto = {
        email: "nonexistent@example.com",
        password: "wrongpassword",
      };

      return request(app.getHttpServer())
        .post("/auth/login")
        .send(loginDto)
        .expect(401);
    });

    it("should return token and driver data for valid credentials", () => {
      // INFO: This test assumes the in-memory repository has
      // a driver with these credentials pre-populated
      const loginDto: LoginDto = {
        email: "juan@example.com", // Use an email that exists in the in-memory repository
        password: "password1",
      };

      return request(app.getHttpServer())
        .post("/auth/login")
        .send(loginDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.token).toBeDefined();
          expect(res.body.driver).toBeDefined();
          expect(res.body.driver.id).toBeDefined();
          expect(res.body.driver.email).toBe(loginDto.email);
          expect(res.body.driver.password).toBeUndefined();

          authToken = res.body.token;
        });
    });
  });

  describe("/auth/validate-token (POST)", () => {
    it("should return 401 for invalid token", () => {
      return request(app.getHttpServer())
        .post("/auth/validate-token")
        .send({ token: "invalid-token" })
        .expect(401);
    });

    it("should return valid=true and driverId for valid token", async () => {
      // First we make login to get a valid token
      const loginResponse = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: "juan@example.com",
          password: "password1",
        })
        .expect(200);
      
      const validToken = loginResponse.body.token;
      expect(validToken).toBeDefined();

      return request(app.getHttpServer())
        .post("/auth/validate-token")
        .send({ token: validToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.isValid).toBe(true);
          expect(res.body.driverId).toBeDefined();
        });
    });
  });

  describe("/auth/profile/:id (GET)", () => {
    it("should return 401 for non-existent driverId", () => {
      return request(app.getHttpServer())
        .get("/auth/profile/999")
        .expect(401);
    });

    it("should return driver profile for valid driverId", () => {
      let driverId = '1';

      return request(app.getHttpServer())
        .get(`/auth/profile/${driverId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(driverId);
          expect(res.body.name).toBeDefined();
          expect(res.body.email).toBeDefined();
          expect(res.body.password).toBeUndefined();
        });
    });
  });
});
