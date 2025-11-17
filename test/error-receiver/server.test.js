import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../error-receiver/server';

// Mock console.log to avoid output during tests
vi.spyOn(console, 'log').mockImplementation(() => {});

describe('Error Receiver Server', () => {
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