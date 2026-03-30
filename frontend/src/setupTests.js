import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Automatically cleanup React Testing Library after each test
afterEach(() => {
  cleanup();
});
