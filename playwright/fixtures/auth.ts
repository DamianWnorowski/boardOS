import { Page } from '@playwright/test';

// Authentication setup for tests

export interface TestUser {
  email: string;
  password: string;
  role: 'admin' | 'scheduler' | 'viewer';
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: 'test-admin@boardos.test',
    password: 'Test123!@#',
    role: 'admin'
  },
  scheduler: {
    email: 'test-scheduler@boardos.test',
    password: 'Test123!@#',
    role: 'scheduler'
  },
  viewer: {
    email: 'test-viewer@boardos.test',
    password: 'Test123!@#',
    role: 'viewer'
  }
};

export class AuthHelper {
  constructor(private page: Page) {}

  async login(userType: keyof typeof TEST_USERS = 'scheduler') {
    const user = TEST_USERS[userType];
    
    // Check if already logged in
    const isLoggedIn = await this.isAuthenticated();
    if (isLoggedIn) {
      return;
    }

    // Navigate to login if not already there
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/login') && !currentUrl.includes('/auth')) {
      await this.page.goto('/login');
    }

    // Fill in login form
    await this.page.fill('[data-testid="email-input"], input[type="email"]', user.email);
    await this.page.fill('[data-testid="password-input"], input[type="password"]', user.password);
    
    // Submit form
    await this.page.click('[data-testid="login-button"], button[type="submit"]');
    
    // Wait for successful login
    await this.page.waitForURL('**/scheduler', { timeout: 10000 });
    
    // Verify login was successful
    await this.page.waitForSelector('[data-testid="app-root"], #app-root', { 
      state: 'visible',
      timeout: 10000 
    });
  }

  async logout() {
    // Click user menu
    const userMenu = this.page.locator('[data-testid="user-menu"], .user-menu');
    if (await userMenu.isVisible()) {
      await userMenu.click();
      
      // Click logout
      await this.page.click('[data-testid="logout-button"], button:has-text("Logout")');
      
      // Wait for redirect to login
      await this.page.waitForURL('**/login', { timeout: 5000 });
    }
  }

  async isAuthenticated(): Promise<boolean> {
    // Check for auth token in localStorage or session
    const hasAuthToken = await this.page.evaluate(() => {
      const token = localStorage.getItem('supabase.auth.token') || 
                   sessionStorage.getItem('supabase.auth.token');
      return !!token;
    });

    return hasAuthToken;
  }

  async setupAuthState() {
    // Set up authentication state directly (for faster tests)
    await this.page.addInitScript(() => {
      // Mock authentication state
      const mockAuthToken = 'mock-jwt-token';
      const mockUser = {
        id: 'test-user-id',
        email: 'test@boardos.test',
        role: 'scheduler'
      };
      
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: mockAuthToken,
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 3600000, // 1 hour from now
        user: mockUser
      }));
    });
  }

  async clearAuthState() {
    await this.page.evaluate(() => {
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.removeItem('supabase.auth.token');
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  async impersonateUser(role: 'admin' | 'scheduler' | 'viewer') {
    // Set up specific role for testing permissions
    await this.page.addInitScript((userRole) => {
      const mockUser = {
        id: `test-${userRole}-id`,
        email: `test-${userRole}@boardos.test`,
        role: userRole,
        permissions: this.getPermissionsForRole(userRole)
      };
      
      localStorage.setItem('boardos.user', JSON.stringify(mockUser));
    }, role);
  }

  private getPermissionsForRole(role: string) {
    const permissions: Record<string, string[]> = {
      admin: ['*'],
      scheduler: ['jobs.*', 'resources.*', 'assignments.*'],
      viewer: ['jobs.read', 'resources.read', 'assignments.read']
    };
    
    return permissions[role] || [];
  }
}

// Global auth setup for all tests
export async function globalAuthSetup(page: Page) {
  const auth = new AuthHelper(page);
  
  // Set up default auth state for most tests
  await auth.setupAuthState();
  
  return auth;
}

// Auth context for specific test scenarios
export async function setupAuthContext(page: Page, scenario: 'authenticated' | 'unauthenticated' | 'admin' | 'viewer') {
  const auth = new AuthHelper(page);
  
  switch (scenario) {
    case 'authenticated':
      await auth.setupAuthState();
      break;
    case 'unauthenticated':
      await auth.clearAuthState();
      break;
    case 'admin':
      await auth.impersonateUser('admin');
      break;
    case 'viewer':
      await auth.impersonateUser('viewer');
      break;
  }
  
  return auth;
}