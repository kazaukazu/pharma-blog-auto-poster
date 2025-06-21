import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import { apiService } from '../services/api';
import '@testing-library/jest-dom';

// Mock API service
jest.mock('../services/api');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {component}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('LoginPage', () => {
    it('renders login form correctly', () => {
      renderWithProviders(<LoginPage />);

      expect(screen.getByLabelText(/メールアドレス/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/パスワード/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ログイン/i })).toBeInTheDocument();
      expect(screen.getByText(/アカウント登録/i)).toBeInTheDocument();
    });

    it('handles successful login', async () => {
      const mockResponse = {
        data: {
          user: {
            id: '1',
            name: 'Test User',
            email: 'test@example.com',
          },
          token: 'mock-token',
        },
      };

      mockedApiService.login.mockResolvedValueOnce(mockResponse);

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/パスワード/i);
      const loginButton = screen.getByRole('button', { name: /ログイン/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockedApiService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('displays error message on login failure', async () => {
      mockedApiService.login.mockRejectedValueOnce({
        response: {
          data: {
            error: '認証情報が正しくありません',
          },
        },
      });

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/パスワード/i);
      const loginButton = screen.getByRole('button', { name: /ログイン/i });

      fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/認証情報が正しくありません/i)).toBeInTheDocument();
      });
    });

    it('validates required fields', async () => {
      renderWithProviders(<LoginPage />);

      const loginButton = screen.getByRole('button', { name: /ログイン/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/メールアドレスを入力してください/i)).toBeInTheDocument();
        expect(screen.getByText(/パスワードを入力してください/i)).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const loginButton = screen.getByRole('button', { name: /ログイン/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/有効なメールアドレスを入力してください/i)).toBeInTheDocument();
      });
    });
  });

  describe('RegisterPage', () => {
    it('renders registration form correctly', () => {
      renderWithProviders(<RegisterPage />);

      expect(screen.getByLabelText(/名前/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/メールアドレス/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^パスワード$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/パスワード（確認）/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /アカウント作成/i })).toBeInTheDocument();
    });

    it('handles successful registration', async () => {
      const mockResponse = {
        data: {
          user: {
            id: '1',
            name: 'New User',
            email: 'new@example.com',
          },
          token: 'mock-token',
        },
      };

      mockedApiService.register.mockResolvedValueOnce(mockResponse);

      renderWithProviders(<RegisterPage />);

      const nameInput = screen.getByLabelText(/名前/i);
      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/^パスワード$/i);
      const confirmPasswordInput = screen.getByLabelText(/パスワード（確認）/i);
      const registerButton = screen.getByRole('button', { name: /アカウント作成/i });

      fireEvent.change(nameInput, { target: { value: 'New User' } });
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockedApiService.register).toHaveBeenCalledWith({
          name: 'New User',
          email: 'new@example.com',
          password: 'password123',
        });
      });
    });

    it('validates password confirmation', async () => {
      renderWithProviders(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^パスワード$/i);
      const confirmPasswordInput = screen.getByLabelText(/パスワード（確認）/i);
      const registerButton = screen.getByRole('button', { name: /アカウント作成/i });

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(screen.getByText(/パスワードが一致しません/i)).toBeInTheDocument();
      });
    });

    it('validates password strength', async () => {
      renderWithProviders(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^パスワード$/i);
      const registerButton = screen.getByRole('button', { name: /アカウント作成/i });

      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(screen.getByText(/パスワードは8文字以上で入力してください/i)).toBeInTheDocument();
      });
    });

    it('validates required fields', async () => {
      renderWithProviders(<RegisterPage />);

      const registerButton = screen.getByRole('button', { name: /アカウント作成/i });
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(screen.getByText(/名前を入力してください/i)).toBeInTheDocument();
        expect(screen.getByText(/メールアドレスを入力してください/i)).toBeInTheDocument();
        expect(screen.getByText(/パスワードを入力してください/i)).toBeInTheDocument();
      });
    });

    it('displays error message on registration failure', async () => {
      mockedApiService.register.mockRejectedValueOnce({
        response: {
          data: {
            error: 'このメールアドレスは既に登録されています',
          },
        },
      });

      renderWithProviders(<RegisterPage />);

      const nameInput = screen.getByLabelText(/名前/i);
      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/^パスワード$/i);
      const confirmPasswordInput = screen.getByLabelText(/パスワード（確認）/i);
      const registerButton = screen.getByRole('button', { name: /アカウント作成/i });

      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(screen.getByText(/このメールアドレスは既に登録されています/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    it('clears errors when user starts typing', async () => {
      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const loginButton = screen.getByRole('button', { name: /ログイン/i });

      // Trigger validation error
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/メールアドレスを入力してください/i)).toBeInTheDocument();
      });

      // Start typing to clear error
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      await waitFor(() => {
        expect(screen.queryByText(/メールアドレスを入力してください/i)).not.toBeInTheDocument();
      });
    });

    it('shows loading state during login', async () => {
      mockedApiService.login.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const passwordInput = screen.getByLabelText(/パスワード/i);
      const loginButton = screen.getByRole('button', { name: /ログイン/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      // Button should be disabled and show loading state
      expect(loginButton).toBeDisabled();
    });
  });
});