import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * E2E tests for Phase 1 authentication flow.
 * Requires a running MongoDB instance (uses the .env MONGO_URI or a test DB).
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const testUser = {
    name: 'E2E User',
    email: `e2e-${Date.now()}@langro.test`,
    password: 'testpassword1',
  };

  describe('POST /auth/register', () => {
    it('should register a new user and return 201 with a cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 409 when email is already registered', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('should return 400 for invalid registration data', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'A', email: 'not-an-email', password: '123' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully and return 200 with a cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.user.email).toBe(testUser.email);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 for wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return 401 without auth cookie', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should return current user with valid auth cookie', async () => {
      // Login to get cookie
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const cookie = loginRes.headers['set-cookie'];

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.email).toBe(testUser.email);
      expect(res.body.passwordHash).toBeUndefined();
    });
  });

  describe('POST /auth/logout', () => {
    it('should clear the auth cookie on logout', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const cookie = loginRes.headers['set-cookie'];

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookie)
        .expect(200);

      // Cookie should be cleared (set to empty or expired)
      const setCookieHeader = res.headers['set-cookie'] as string[] | undefined;
      expect(setCookieHeader?.some((c: string) => c.startsWith('token=;') || c.includes('Expires=Thu, 01 Jan 1970'))).toBe(true);
    });
  });
});
