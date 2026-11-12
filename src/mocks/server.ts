import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Node/Vitest MSW request interception server for integration and contract tests. */
export const server = setupServer(...handlers);
