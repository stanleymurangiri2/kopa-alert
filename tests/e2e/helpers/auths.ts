import { expect, Page } from "@playwright/test";

export interface LoginCredentials {
  email: string;
  password: string;
}

export const TEST_USERS = {
  superAdmin: {
    email:
      process.env.E2E_SUPER_ADMIN_EMAIL ??
      "superadmin@example.com",
    password:
      process.env.E2E_SUPER_ADMIN_PASSWORD ??
      "Password123!",
  },

  businessAdmin: {
    email:
      process.env.E2E_BUSINESS_ADMIN_EMAIL ??
      "admin@example.com",
    password:
      process.env.E2E_BUSINESS_ADMIN_PASSWORD ??
      "Password123!",
  },

  employee: {
    email:
      process.env.E2E_EMPLOYEE_EMAIL ??
      "employee@example.com",
    password:
      process.env.E2E_EMPLOYEE_PASSWORD ??
      "Password123!",
  },
} satisfies Record<string, LoginCredentials>;

/**
 * Login using the application's login page.
 */
export async function login(
  page: Page,
  credentials: LoginCredentials
) {
  await page.goto("/login");

  await page
    .getByLabel(/email/i)
    .fill(credentials.email);

  await page
    .getByLabel(/password/i)
    .fill(credentials.password);

  await page
    .getByRole("button", {
      name: /sign in|login/i,
    })
    .click();

  await page.waitForLoadState(
    "networkidle"
  );

  await expect(page).not.toHaveURL(
    /\/login/
  );
}

/**
 * Logout.
 */
export async function logout(
  page: Page
) {
  await page
    .getByRole("button", {
      name: /logout|sign out/i,
    })
    .click();

  await page.waitForLoadState(
    "networkidle"
  );

  await expect(page).toHaveURL(
    /\/login/
  );
}

/**
 * Login as Super Admin.
 */
export async function loginAsSuperAdmin(
  page: Page
) {
  await login(
    page,
    TEST_USERS.superAdmin
  );
}

/**
 * Login as Business Admin.
 */
export async function loginAsBusinessAdmin(
  page: Page
) {
  await login(
    page,
    TEST_USERS.businessAdmin
  );
}

/**
 * Login as Employee.
 */
export async function loginAsEmployee(
  page: Page
) {
  await login(
    page,
    TEST_USERS.employee
  );
}

/**
 * Verify user is authenticated.
 */
export async function expectAuthenticated(
  page: Page
) {
  await expect(page).not.toHaveURL(
    /\/login/
  );

  await expect(
    page.getByRole("navigation")
  ).toBeVisible();
}

/**
 * Verify user is logged out.
 */
export async function expectLoggedOut(
  page: Page
) {
  await expect(page).toHaveURL(
    /\/login/
  );
}

/**
 * Visit a protected page and ensure
 * authentication is required.
 */
export async function expectRequiresLogin(
  page: Page,
  path: string
) {
  await page.goto(path);

  await page.waitForLoadState(
    "networkidle"
  );

  await expect(page).toHaveURL(
    /\/login/
  );
}

/**
 * Login and navigate to a page.
 */
export async function loginAndVisit(
  page: Page,
  credentials: LoginCredentials,
  path: string
) {
  await login(page, credentials);

  await page.goto(path);

  await page.waitForLoadState(
    "networkidle"
  );
}