import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../error-receiver/server';

// Mock console.log to avoid output during tests
vi.spyOn(console, 'log').mockImplementation(() => {});

describe('Error Receiver Server', () => {
  afterEach(() => {
    delete process.env.RATE_LIMIT;
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.TRUST_PROXY;
  });

  describe('POST /report', () => {
    it('should accept valid error report and return 200', async () => {
      const errorReport = {
        message: 'Test error',
        stack: 'Error stack trace',
        userAgent: 'Test User Agent',
        url: 'http://example.com'
      };

      const response = await request(app)
        .post('/report')
        .send(errorReport)
        .expect(200);

      expect(response.text).toBe('Error report received');
    });

    it('should handle empty body', async () => {
      const response = await request(app)
        .post('/report')
        .send({})
        .expect(200);

      expect(response.text).toBe('Error report received');
    });

    it('should handle large error reports', async () => {
      const largeReport = {
        message: 'Large error'.repeat(1000),
        stack: 'Stack trace'.repeat(500),
        additionalData: 'x'.repeat(10000)
      };

      const response = await request(app)
        .post('/report')
        .send(largeReport)
        .expect(200);

      expect(response.text).toBe('Error report received');
    });

    it('should handle invalid JSON gracefully', async () => {
      // Express should handle invalid JSON with express.json() middleware
      // It should return 400 for bad JSON
      await request(app)
        .post('/report')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle missing body', async () => {
      const response = await request(app)
        .post('/report')
        .expect(200);

      expect(response.text).toBe('Error report received');
    });

    it('should log the error report', async () => {
      const errorReport = { message: 'Test log' };

      await request(app)
        .post('/report')
        .send(errorReport);

      expect(console.log).toHaveBeenCalledWith(
        'Received error report:',
        JSON.stringify(errorReport, null, 2)
      );
    });

    it('should reject a non-object report', async () => {
      await request(app)
        .post('/report')
        .set('Content-Type', 'application/json')
        .send('["not", "an object"]')
        .expect(400);

      await request(app)
        .post('/report')
        .set('Content-Type', 'application/json')
        .send('"a string"')
        .expect(400);
    });

    it('should truncate oversized report fields before logging them', async () => {
      const oversized = 'x'.repeat(10 * 1024);

      await request(app)
        .post('/report')
        .send({ message: oversized })
        .expect(200);

      const calls = console.log.mock.calls.filter(([label]) => label === 'Received error report:');
      expect(calls.length).toBeGreaterThan(0);
      const logged = JSON.parse(calls[calls.length - 1][1]);
      expect(logged.message.length).toBeLessThanOrEqual(8 * 1024 + '…[truncated]'.length);
      expect(logged.message.endsWith('…[truncated]')).toBe(true);
    });
  });

  describe('Rate limiting', () => {
    it('refuses reports past the configured ceiling for one address', async () => {
      // A fresh app instance with a tiny ceiling and its own hit table, so
      // the earlier requests of this file don't count against it.
      vi.resetModules();
      process.env.RATE_LIMIT = '3';
      const limited = (await import('../../error-receiver/server')).default;

      for (let i = 0; i < 3; i++) {
        await request(limited)
          .post('/report')
          .send({ message: `report ${i}` })
          .expect(200);
      }
      await request(limited)
        .post('/report')
        .send({ message: 'flood' })
        .expect(429);

      // The health endpoint is never rate limited.
      await request(limited).get('/health').expect(200);
    });
  });

  describe('Origin allowlist', () => {
    it('pins CORS to the configured origins when ALLOWED_ORIGINS is set', async () => {
      vi.resetModules();
      process.env.ALLOWED_ORIGINS = 'https://cards.example.org';
      const pinned = (await import('../../error-receiver/server')).default;

      const allowed = await request(pinned)
        .post('/report')
        .set('Origin', 'https://cards.example.org')
        .send({ message: 'hello' })
        .expect(200);
      expect(allowed.headers['access-control-allow-origin']).toBe('https://cards.example.org');

      const stranger = await request(pinned)
        .post('/report')
        .set('Origin', 'https://evil.example')
        .send({ message: 'hello' })
        .expect(200);
      expect(stranger.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('GET /health', () => {
    it('should return OK status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.text).toBe('OK');
    });

    it('should handle query parameters', async () => {
      const response = await request(app)
        .get('/health?test=1')
        .expect(200);

      expect(response.text).toBe('OK');
    });
  });

  describe('CORS', () => {
    it('should allow CORS requests', async () => {
      const response = await request(app)
        .options('/report')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Error scenarios', () => {
    it('should return 404 for unknown routes', async () => {
      await request(app)
        .get('/unknown')
        .expect(404);
    });

    it('should handle non-POST requests to /report', async () => {
      await request(app)
        .get('/report')
        .expect(404); // Since no GET handler
    });
  });
});