// spec: features/projects/task-types.feature
// seed: tests/seed.spec.ts

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost';
const USERNAME = process.env.E2E_USERNAME ?? 'admin';
const PASSWORD = process.env.E2E_PASSWORD ?? 'e2e-admin-password';
const TEST_PROJECT_PREFIX = 'E2E_TYPE_';
const RUN_ID = Date.now().toString(36).slice(-5).toUpperCase();

async function authRequest(request: APIRequestContext): Promise<void> {
  await request.post(`${BASE_URL}/api/v1/auth/login`, {
    data: { username: USERNAME, password: PASSWORD, rememberMe: false },
  });
}

async function cleanupTestProjects(request: APIRequestContext): Promise<void> {
  await authRequest(request);

  const allProjects: Array<{ id: string; name: string }> = [];
  let page = 1;

  while (true) {
    const listResp = await request.get(`${BASE_URL}/api/v1/projects?page=${page}&page_size=100`);
    if (!listResp.ok()) break;
    const body = await listResp.json();
    const items: Array<{ id: string; name: string }> = body?.data?.items ?? [];
    if (items.length === 0) break;
    allProjects.push(...items);
    const { page: currentPage, page_size, total } = body.data as { page: number; page_size: number; total: number };
    if (currentPage * page_size >= total) break;
    page++;
  }

  await Promise.all(
    allProjects
      .filter((p) => p.name.startsWith(TEST_PROJECT_PREFIX))
      .map((p) => request.delete(`${BASE_URL}/api/v1/projects/${p.id}`)),
  );
}

async function createProject(request: APIRequestContext, name: string): Promise<string> {
  const resp = await request.post(`${BASE_URL}/api/v1/projects`, {
    data: { name },
  });
  const body = await resp.json();
  return body.data.id as string;
}

async function createTaskType(request: APIRequestContext, projectId: string, name: string): Promise<string> {
  const resp = await request.post(`${BASE_URL}/api/v1/projects/${projectId}/task-types`, {
    data: { name },
  });
  const body = await resp.json();
  return body.data.id as string;
}

const signIn = async (page: Page) => {
  await page.goto(`${BASE_URL}/`);
  await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })).toBeVisible();
};

const navigateToProjectSettings = async (page: Page, projectId: string) => {
  await page.goto(`${BASE_URL}/projects/${projectId}/settings`);
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
};

test.describe('Task Types Management', () => {
  // ---------------------------------------------------------------------------
  // Rule: Viewing task types
  // ---------------------------------------------------------------------------

  test.describe('Viewing task types', () => {
    let projectId: string;

    test.beforeEach(async ({ request, context }) => {
      await cleanupTestProjects(request);
      projectId = await createProject(request, `E2E_TYPE_VIEW_${RUN_ID}`);
      await context.clearCookies();
      await context.clearPermissions();
    });

    test.afterEach(async ({ request }) => {
      await cleanupTestProjects(request);
    });

    test('Task Types section is reachable from the settings sidebar', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);

      // When the user clicks "Task Types" in the settings sidebar
      await page.getByRole('button', { name: 'Task Types' }).click();

      // The "Task Types" section heading should be visible
      await expect(page.getByRole('heading', { name: 'Task Types', level: 3 })).toBeVisible();

      // The section should display a description mentioning categorising tasks with custom types
      await expect(page.getByText(/categoris/i)).toBeVisible();
    });

    test('Default task types are pre-populated for a new project', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);

      // When the user clicks "Task Types" in the settings sidebar
      await page.getByRole('button', { name: 'Task Types' }).click();

      // The task types table should contain a type named "Bug"
      await expect(page.getByRole('table').getByText('Bug', { exact: true })).toBeVisible();

      // The task types table should contain a type named "Story"
      await expect(page.getByRole('table').getByText('Story', { exact: true })).toBeVisible();

      // The task types table should contain a type named "Task"
      await expect(page.getByRole('table').getByText('Task', { exact: true })).toBeVisible();
    });

    test('Task types table shows the expected columns', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);

      // When the user clicks "Task Types" in the settings sidebar
      await page.getByRole('button', { name: 'Task Types' }).click();

      // The task types table should have columns "Icon", "Name", and "Description"
      await expect(page.getByRole('columnheader', { name: 'Icon' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Description' })).toBeVisible();
    });

    test('Each task type row has Edit and Delete action buttons', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);

      // When the user clicks "Task Types" in the settings sidebar
      await page.getByRole('button', { name: 'Task Types' }).click();

      // Every task type row should have an "Edit type" button
      await expect(page.getByRole('button', { name: 'Edit type' }).first()).toBeVisible();

      // Every task type row should have a "Delete type" button
      await expect(page.getByRole('button', { name: 'Delete type' }).first()).toBeVisible();
    });

    test('"New type" button is visible on the Task Types section', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);

      // When the user clicks "Task Types" in the settings sidebar
      await page.getByRole('button', { name: 'Task Types' }).click();

      // The "New type" button should be visible
      await expect(page.getByRole('button', { name: 'New type' })).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule: Creating a task type
  // ---------------------------------------------------------------------------

  test.describe('Creating a task type', () => {
    let projectId: string;

    test.beforeEach(async ({ request, context }) => {
      await cleanupTestProjects(request);
      projectId = await createProject(request, `E2E_TYPE_CREATE_${RUN_ID}`);
      await context.clearCookies();
      await context.clearPermissions();
    });

    test.afterEach(async ({ request }) => {
      await cleanupTestProjects(request);
    });

    test('Opening the create-type dialog', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks the "New type" button
      await page.getByRole('button', { name: 'New type' }).click();

      // The "Create task type" dialog should open
      const dialog = page.getByRole('dialog', { name: 'Create task type' });
      await expect(dialog).toBeVisible();

      // The dialog should contain a required "Name" field
      await expect(dialog.getByRole('textbox', { name: 'Name' })).toBeVisible();

      // The dialog should contain an optional icon picker
      await expect(dialog.getByRole('button', { name: 'Bug' })).toBeVisible();

      // The dialog should contain a colour picker
      await expect(dialog.locator('label[title="Custom color"]')).toBeVisible();

      // The dialog should contain an optional "Description" field
      await expect(dialog.getByRole('textbox', { name: 'Description (optional)' })).toBeVisible();
    });

    test('"Create type" button is disabled while the name field is empty', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks the "New type" button
      await page.getByRole('button', { name: 'New type' }).click();

      // The "Create type" button should be disabled
      await expect(
        page.getByRole('dialog', { name: 'Create task type' }).getByRole('button', { name: 'Create type' }),
      ).toBeDisabled();
    });

    test('"Create type" button becomes enabled after typing a name', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks the "New type" button
      await page.getByRole('button', { name: 'New type' }).click();
      const dialog = page.getByRole('dialog', { name: 'Create task type' });

      // And the user fills the type name with "E2E Epic"
      await dialog.getByRole('textbox', { name: 'Name' }).fill('E2E Epic');

      // The "Create type" button should be enabled
      await expect(dialog.getByRole('button', { name: 'Create type' })).toBeEnabled();
    });

    test('Icon picker lists the available preset icons', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks the "New type" button
      await page.getByRole('button', { name: 'New type' }).click();
      const dialog = page.getByRole('dialog', { name: 'Create task type' });

      // The icon picker should offer all preset icons
      const icons = [
        'Bug', 'Feature', 'Story', 'Epic', 'Task', 'Idea',
        'Security', 'Chore', 'Branch', 'Critical', 'Important', 'Goal',
        'Warning', 'Doc', 'Feedback', 'Package', 'Build', 'Test',
        'Improvement', 'Refactor', 'Generic', 'Ticket', 'Checklist',
      ];
      for (const icon of icons) {
        await expect(dialog.getByRole('button', { name: icon })).toBeVisible();
      }
    });

    test('Creating a type with only a name succeeds', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks the "New type" button
      await page.getByRole('button', { name: 'New type' }).click();
      const dialog = page.getByRole('dialog', { name: 'Create task type' });

      // And the user fills the type name with "E2E Name Only"
      await dialog.getByRole('textbox', { name: 'Name' }).fill('E2E Name Only');

      // And the user clicks "Create type"
      await dialog.getByRole('button', { name: 'Create type' }).click();

      // Then the dialog should close
      await expect(dialog).not.toBeVisible();

      // And the task types table should contain a type named "E2E Name Only"
      await expect(page.getByRole('table').getByText('E2E Name Only', { exact: true })).toBeVisible();
    });

    test('Creating a type with name and description succeeds', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks the "New type" button
      await page.getByRole('button', { name: 'New type' }).click();
      const dialog = page.getByRole('dialog', { name: 'Create task type' });

      // And the user fills the type name with "E2E Described Type"
      await dialog.getByRole('textbox', { name: 'Name' }).fill('E2E Described Type');

      // And the user fills the type description with "Used for exploratory work"
      await dialog.getByRole('textbox', { name: 'Description (optional)' }).fill('Used for exploratory work');

      // And the user clicks "Create type"
      await dialog.getByRole('button', { name: 'Create type' }).click();

      // Then the dialog should close
      await expect(dialog).not.toBeVisible();

      // And the task types table should contain a type named "E2E Described Type"
      await expect(page.getByRole('table').getByText('E2E Described Type', { exact: true })).toBeVisible();

      // And the row for "E2E Described Type" should display the description
      const row = page.getByRole('row').filter({ hasText: 'E2E Described Type' });
      await expect(row).toContainText('Used for exploratory work');
    });

    test('Creating a type with a selected icon displays the icon in the table', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks the "New type" button
      await page.getByRole('button', { name: 'New type' }).click();
      const dialog = page.getByRole('dialog', { name: 'Create task type' });

      // And the user fills the type name with "E2E Iconic Type"
      await dialog.getByRole('textbox', { name: 'Name' }).fill('E2E Iconic Type');

      // And the user selects the "Epic" icon
      await dialog.getByRole('button', { name: 'Epic' }).click();

      // And the user clicks "Create type"
      await dialog.getByRole('button', { name: 'Create type' }).click();

      // Then the dialog should close
      await expect(dialog).not.toBeVisible();

      // And the task types table should contain a type named "E2E Iconic Type"
      await expect(page.getByRole('table').getByText('E2E Iconic Type', { exact: true })).toBeVisible();

      // And the row for "E2E Iconic Type" should display an icon
      const row = page.getByRole('row').filter({ hasText: 'E2E Iconic Type' });
      await expect(row.getByRole('cell').first().locator('svg')).toBeVisible({ timeout: 15000 });
    });

    test('Creating a type with a custom colour succeeds', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks the "New type" button
      await page.getByRole('button', { name: 'New type' }).click();
      const dialog = page.getByRole('dialog', { name: 'Create task type' });

      // And the user fills the type name with "E2E Coloured Type"
      await dialog.getByRole('textbox', { name: 'Name' }).fill('E2E Coloured Type');

      // And the user enters a custom colour "#ef4444"
      await dialog.getByRole('button', { name: '#ef4444' }).click();

      // And the user clicks "Create type"
      await dialog.getByRole('button', { name: 'Create type' }).click();

      // Then the dialog should close
      await expect(dialog).not.toBeVisible();

      // And the task types table should contain a type named "E2E Coloured Type"
      await expect(page.getByRole('table').getByText('E2E Coloured Type', { exact: true })).toBeVisible();
    });

    test('Cancelling the create-type dialog discards changes', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks the "New type" button
      await page.getByRole('button', { name: 'New type' }).click();
      const dialog = page.getByRole('dialog', { name: 'Create task type' });

      // And the user fills the type name with "E2E Should Not Exist Type"
      await dialog.getByRole('textbox', { name: 'Name' }).fill('E2E Should Not Exist Type');

      // And the user clicks "Cancel"
      await dialog.getByRole('button', { name: 'Cancel' }).click();

      // Then the dialog should close
      await expect(dialog).not.toBeVisible();

      // And the task types table should not contain a type named "E2E Should Not Exist Type"
      await expect(
        page.getByRole('table').getByText('E2E Should Not Exist Type', { exact: true }),
      ).not.toBeVisible();
    });

    test('Closing the create-type dialog with the Close button discards changes', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks the "New type" button
      await page.getByRole('button', { name: 'New type' }).click();
      const dialog = page.getByRole('dialog', { name: 'Create task type' });

      // And the user fills the type name with "E2E Should Not Exist via X"
      await dialog.getByRole('textbox', { name: 'Name' }).fill('E2E Should Not Exist via X');

      // And the user clicks the Close button on the dialog
      await dialog.getByRole('button', { name: 'Close' }).click();

      // Then the dialog should close
      await expect(dialog).not.toBeVisible();

      // And the task types table should not contain a type named "E2E Should Not Exist via X"
      await expect(
        page.getByRole('table').getByText('E2E Should Not Exist via X', { exact: true }),
      ).not.toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule: Editing a task type
  // ---------------------------------------------------------------------------

  test.describe('Editing a task type', () => {
    let projectId: string;

    test.beforeEach(async ({ request, context }) => {
      await cleanupTestProjects(request);
      projectId = await createProject(request, `E2E_TYPE_EDIT_${RUN_ID}`);
      await createTaskType(request, projectId, 'E2E Edit Me Type');
      await context.clearCookies();
      await context.clearPermissions();
    });

    test.afterEach(async ({ request }) => {
      await cleanupTestProjects(request);
    });

    test('Opening the edit-type dialog pre-fills existing values', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks "Edit type" for the type named "E2E Edit Me Type"
      await page
        .getByRole('row')
        .filter({ hasText: 'E2E Edit Me Type' })
        .getByRole('button', { name: 'Edit type' })
        .click();

      // The "Edit task type" dialog should open
      const dialog = page.getByRole('dialog', { name: 'Edit task type' });
      await expect(dialog).toBeVisible();

      // The "Name" field should be pre-filled with "E2E Edit Me Type"
      await expect(dialog.getByRole('textbox', { name: 'Name' })).toHaveValue('E2E Edit Me Type');
    });

    test('Saving a new name updates the type in the table', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks "Edit type" for the type named "E2E Edit Me Type"
      await page
        .getByRole('row')
        .filter({ hasText: 'E2E Edit Me Type' })
        .getByRole('button', { name: 'Edit type' })
        .click();
      const dialog = page.getByRole('dialog', { name: 'Edit task type' });

      // And the user clears the name and types "E2E Edited Type Name"
      await dialog.getByRole('textbox', { name: 'Name' }).clear();
      await dialog.getByRole('textbox', { name: 'Name' }).fill('E2E Edited Type Name');

      // And the user clicks "Save changes"
      await dialog.getByRole('button', { name: 'Save changes' }).click();

      // Then the dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 15000 });

      // And the task types table should contain a type named "E2E Edited Type Name"
      await expect(page.getByRole('table').getByText('E2E Edited Type Name', { exact: true })).toBeVisible();

      // And the task types table should not contain a type named "E2E Edit Me Type"
      await expect(page.getByRole('table').getByText('E2E Edit Me Type', { exact: true })).not.toBeVisible();
    });

    test('Adding a description to an existing type updates it in the table', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks "Edit type" for the type named "E2E Edit Me Type"
      await page
        .getByRole('row')
        .filter({ hasText: 'E2E Edit Me Type' })
        .getByRole('button', { name: 'Edit type' })
        .click();
      const dialog = page.getByRole('dialog', { name: 'Edit task type' });

      // And the user fills the type description with "Now has a description"
      await dialog.getByRole('textbox', { name: 'Description (optional)' }).fill('Now has a description');

      // And the user clicks "Save changes"
      await dialog.getByRole('button', { name: 'Save changes' }).click();

      // Then the dialog should close
      await expect(dialog).not.toBeVisible();

      // And the row for "E2E Edit Me Type" should display the description
      const row = page.getByRole('row').filter({ hasText: 'E2E Edit Me Type' });
      await expect(row).toContainText('Now has a description');
    });

    test('Changing the icon updates it in the table row', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks "Edit type" for the type named "E2E Edit Me Type"
      await page
        .getByRole('row')
        .filter({ hasText: 'E2E Edit Me Type' })
        .getByRole('button', { name: 'Edit type' })
        .click();
      const dialog = page.getByRole('dialog', { name: 'Edit task type' });

      // And the user selects the "Feature" icon
      await dialog.getByRole('button', { name: 'Feature' }).click();

      // And the user clicks "Save changes"
      await dialog.getByRole('button', { name: 'Save changes' }).click();

      // Then the dialog should close
      await expect(dialog).not.toBeVisible();

      // And the row for "E2E Edit Me Type" should display an icon
      const row = page.getByRole('row').filter({ hasText: 'E2E Edit Me Type' });
      await expect(row.getByRole('cell').first().locator('svg')).toBeVisible({ timeout: 15000 });
    });

    test('Cancelling the edit-type dialog discards changes', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks "Edit type" for the type named "E2E Edit Me Type"
      await page
        .getByRole('row')
        .filter({ hasText: 'E2E Edit Me Type' })
        .getByRole('button', { name: 'Edit type' })
        .click();
      const dialog = page.getByRole('dialog', { name: 'Edit task type' });

      // And the user clears the name and types "E2E Should Not Save Type"
      await dialog.getByRole('textbox', { name: 'Name' }).clear();
      await dialog.getByRole('textbox', { name: 'Name' }).fill('E2E Should Not Save Type');

      // And the user clicks "Cancel"
      await dialog.getByRole('button', { name: 'Cancel' }).click();

      // Then the dialog should close
      await expect(dialog).not.toBeVisible();

      // And the task types table should still contain a type named "E2E Edit Me Type"
      await expect(page.getByRole('table').getByText('E2E Edit Me Type', { exact: true })).toBeVisible();

      // And the task types table should not contain a type named "E2E Should Not Save Type"
      await expect(page.getByRole('table').getByText('E2E Should Not Save Type', { exact: true })).not.toBeVisible();
    });

    test('Clearing the name field disables the save button', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks "Edit type" for the type named "E2E Edit Me Type"
      await page
        .getByRole('row')
        .filter({ hasText: 'E2E Edit Me Type' })
        .getByRole('button', { name: 'Edit type' })
        .click();
      const dialog = page.getByRole('dialog', { name: 'Edit task type' });

      // And the user clears the name field
      await dialog.getByRole('textbox', { name: 'Name' }).clear();

      // Then the "Save changes" button should be disabled
      await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule: Deleting a task type
  // ---------------------------------------------------------------------------

  test.describe('Deleting a task type', () => {
    let projectId: string;

    test.beforeEach(async ({ request, context }) => {
      await cleanupTestProjects(request);
      projectId = await createProject(request, `E2E_TYPE_DELETE_${RUN_ID}`);
      await createTaskType(request, projectId, 'E2E Delete Me Type');
      await context.clearCookies();
      await context.clearPermissions();
    });

    test.afterEach(async ({ request }) => {
      await cleanupTestProjects(request);
    });

    test('Opening the delete-type dialog shows a confirmation message', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks "Delete type" for the type named "E2E Delete Me Type"
      await page
        .getByRole('row')
        .filter({ hasText: 'E2E Delete Me Type' })
        .getByRole('button', { name: 'Delete type' })
        .click();

      // The "Delete task type" dialog should open
      const dialog = page.getByRole('dialog', { name: 'Delete task type' });
      await expect(dialog).toBeVisible();

      // The dialog should identify the type being deleted by name
      await expect(dialog).toContainText('E2E Delete Me Type');
    });

    test('Confirming deletion removes the type from the table', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks "Delete type" for the type named "E2E Delete Me Type"
      await page
        .getByRole('row')
        .filter({ hasText: 'E2E Delete Me Type' })
        .getByRole('button', { name: 'Delete type' })
        .click();
      const dialog = page.getByRole('dialog', { name: 'Delete task type' });

      // And the user confirms by clicking "Delete type" in the dialog
      await dialog.getByRole('button', { name: 'Delete type' }).click();

      // Then the dialog should close
      await expect(dialog).not.toBeVisible();

      // And the task types table should not contain a type named "E2E Delete Me Type"
      await expect(page.getByRole('table').getByText('E2E Delete Me Type', { exact: true })).not.toBeVisible();
    });

    test('Cancelling the delete-type dialog keeps the type in the table', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks "Delete type" for the type named "E2E Delete Me Type"
      await page
        .getByRole('row')
        .filter({ hasText: 'E2E Delete Me Type' })
        .getByRole('button', { name: 'Delete type' })
        .click();
      const dialog = page.getByRole('dialog', { name: 'Delete task type' });

      // And the user clicks "Cancel" in the delete confirmation dialog
      await dialog.getByRole('button', { name: 'Cancel' }).click();

      // Then the dialog should close
      await expect(dialog).not.toBeVisible();

      // And the task types table should still contain a type named "E2E Delete Me Type"
      await expect(page.getByRole('table').getByText('E2E Delete Me Type', { exact: true })).toBeVisible();
    });

    test('Closing the delete-type dialog with the Close button keeps the type', async ({ page }) => {
      await signIn(page);
      await navigateToProjectSettings(page, projectId);
      await page.getByRole('button', { name: 'Task Types' }).click();

      // When the user clicks "Delete type" for the type named "E2E Delete Me Type"
      await page
        .getByRole('row')
        .filter({ hasText: 'E2E Delete Me Type' })
        .getByRole('button', { name: 'Delete type' })
        .click();
      const dialog = page.getByRole('dialog', { name: 'Delete task type' });

      // And the user clicks the Close button on the dialog
      await dialog.getByRole('button', { name: 'Close' }).click();

      // Then the task types table should still contain a type named "E2E Delete Me Type"
      await expect(page.getByRole('table').getByText('E2E Delete Me Type', { exact: true })).toBeVisible();
    });
  });
});
