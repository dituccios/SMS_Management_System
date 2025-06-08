import { test, expect } from '@playwright/test';
import { faker } from 'faker';

test.describe('Authentication Security Tests', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  const apiURL = process.env.API_BASE_URL || 'http://localhost:3001/api/v1';

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('should prevent SQL injection in login form', async ({ page }) => {
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "admin' /*",
    ];

    for (const payload of sqlInjectionPayloads) {
      await page.fill('[data-testid="email-input"]', payload);
      await page.fill('[data-testid="password-input"]', 'password');
      await page.click('[data-testid="login-button"]');

      // Should not be logged in
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page).toHaveURL(/.*login.*/);
    }
  });

  test('should prevent XSS attacks in login form', async ({ page }) => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src="x" onerror="alert(\'XSS\')">',
      '<svg onload="alert(\'XSS\')">',
    ];

    for (const payload of xssPayloads) {
      await page.fill('[data-testid="email-input"]', payload);
      await page.fill('[data-testid="password-input"]', 'password');
      await page.click('[data-testid="login-button"]');

      // Check that script is not executed
      const alertDialogs = [];
      page.on('dialog', dialog => {
        alertDialogs.push(dialog);
        dialog.dismiss();
      });

      await page.waitForTimeout(1000);
      expect(alertDialogs).toHaveLength(0);
    }
  });

  test('should enforce rate limiting on login attempts', async ({ page, request }) => {
    const email = 'test@example.com';
    const password = 'wrongpassword';

    // Make multiple failed login attempts
    for (let i = 0; i < 10; i++) {
      const response = await request.post(`${apiURL}/auth/login`, {
        data: { email, password }
      });
      
      if (i < 5) {
        expect(response.status()).toBe(401); // Unauthorized
      } else {
        expect(response.status()).toBe(429); // Too Many Requests
      }
    }
  });

  test('should require strong passwords', async ({ page }) => {
    await page.goto('/auth/register');

    const weakPasswords = [
      '123456',
      'password',
      'qwerty',
      'abc123',
      '12345678',
    ];

    for (const weakPassword of weakPasswords) {
      await page.fill('[data-testid="email-input"]', faker.internet.email());
      await page.fill('[data-testid="password-input"]', weakPassword);
      await page.fill('[data-testid="confirm-password-input"]', weakPassword);
      await page.click('[data-testid="register-button"]');

      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toContainText(/weak|strong|requirements/i);
    }
  });

  test('should implement secure session management', async ({ page, context }) => {
    // Login with valid credentials
    await page.fill('[data-testid="email-input"]', 'owner@sms.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/.*dashboard.*/);

    // Check that session cookie is secure
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(cookie => cookie.name.includes('session') || cookie.name.includes('token'));
    
    if (sessionCookie) {
      expect(sessionCookie.secure).toBe(true);
      expect(sessionCookie.httpOnly).toBe(true);
      expect(sessionCookie.sameSite).toBe('Strict');
    }
  });

  test('should implement proper logout functionality', async ({ page, context }) => {
    // Login
    await page.fill('[data-testid="email-input"]', 'owner@sms.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/.*dashboard.*/);

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Should be redirected to login
    await expect(page).toHaveURL(/.*login.*/);

    // Session cookie should be cleared
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(cookie => cookie.name.includes('session') || cookie.name.includes('token'));
    expect(sessionCookie).toBeUndefined();
  });

  test('should prevent CSRF attacks', async ({ page, request }) => {
    // Login to get session
    await page.fill('[data-testid="email-input"]', 'owner@sms.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/.*dashboard.*/);

    // Try to make a request without CSRF token
    const response = await request.post(`${apiURL}/sms/documents`, {
      data: {
        title: 'Test Document',
        content: 'Test content'
      }
    });

    // Should be rejected due to missing CSRF token
    expect(response.status()).toBe(403);
  });

  test('should implement account lockout after failed attempts', async ({ page, request }) => {
    const email = 'test@example.com';
    const wrongPassword = 'wrongpassword';

    // Make multiple failed login attempts
    for (let i = 0; i < 6; i++) {
      const response = await request.post(`${apiURL}/auth/login`, {
        data: { email, password: wrongPassword }
      });
      
      if (i < 5) {
        expect(response.status()).toBe(401);
      } else {
        expect(response.status()).toBe(423); // Locked
      }
    }

    // Even with correct password, account should be locked
    const response = await request.post(`${apiURL}/auth/login`, {
      data: { email, password: 'correctpassword' }
    });
    expect(response.status()).toBe(423);
  });

  test('should validate JWT tokens properly', async ({ page, request }) => {
    // Test with invalid JWT token
    const invalidTokens = [
      'invalid.jwt.token',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
      '',
      'Bearer invalid',
    ];

    for (const token of invalidTokens) {
      const response = await request.get(`${apiURL}/sms/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      expect(response.status()).toBe(401);
    }
  });

  test('should implement proper password reset security', async ({ page }) => {
    await page.goto('/auth/forgot-password');

    // Test with invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.click('[data-testid="reset-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

    // Test with valid email
    await page.fill('[data-testid="email-input"]', 'owner@sms.com');
    await page.click('[data-testid="reset-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // Should not reveal if email exists or not
    await page.fill('[data-testid="email-input"]', 'nonexistent@example.com');
    await page.click('[data-testid="reset-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});
