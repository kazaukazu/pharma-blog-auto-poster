import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import React from 'react';

// Polyfills for testing environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
}));

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => children,
  LineChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'line-chart' }, children),
  Line: () => React.createElement('div', { 'data-testid': 'line' }),
  XAxis: () => React.createElement('div', { 'data-testid': 'x-axis' }),
  YAxis: () => React.createElement('div', { 'data-testid': 'y-axis' }),
  CartesianGrid: () => React.createElement('div', { 'data-testid': 'cartesian-grid' }),
  Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
  Legend: () => React.createElement('div', { 'data-testid': 'legend' }),
  BarChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'bar-chart' }, children),
  Bar: () => React.createElement('div', { 'data-testid': 'bar' }),
  PieChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'pie-chart' }, children),
  Pie: () => React.createElement('div', { 'data-testid': 'pie' }),
  Cell: () => React.createElement('div', { 'data-testid': 'cell' }),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'yyyy/MM/dd HH:mm') {
      return '2023/12/01 10:00';
    }
    if (formatStr === 'MM/dd') {
      return '12/01';
    }
    return '2023-12-01';
  }),
  parseISO: jest.fn((dateStr) => new Date(dateStr)),
  subMonths: jest.fn((date, months) => new Date(date.getTime() - months * 30 * 24 * 60 * 60 * 1000)),
}));

jest.mock('date-fns/locale', () => ({
  ja: {},
}));

// Setup localStorage mock
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Setup sessionStorage mock
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock as any;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console outputs
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});