/**
 * Validation utility functions
 */

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, containing at least one letter and one number
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validateRequired = (value: string | undefined | null): string | null => {
  if (!value || value.trim() === '') {
    return 'この項目は必須です';
  }
  return null;
};

export const validateEmail = (email: string): string | null => {
  if (!email) {
    return 'メールアドレスを入力してください';
  }
  if (!isValidEmail(email)) {
    return '有効なメールアドレスを入力してください';
  }
  return null;
};

export const validateUrl = (url: string): string | null => {
  if (!url) {
    return 'URLを入力してください';
  }
  if (!isValidUrl(url)) {
    return '有効なURLを入力してください';
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'パスワードを入力してください';
  }
  if (password.length < 8) {
    return 'パスワードは8文字以上で入力してください';
  }
  if (!isValidPassword(password)) {
    return 'パスワードは英数字を含む8文字以上で入力してください';
  }
  return null;
};

export const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
  if (!confirmPassword) {
    return 'パスワード（確認）を入力してください';
  }
  if (password !== confirmPassword) {
    return 'パスワードが一致しません';
  }
  return null;
};

export interface ValidationRule {
  field: string;
  value: any;
  rules: string[];
}

export const validateForm = (rules: ValidationRule[]): Record<string, string> => {
  const errors: Record<string, string> = {};

  rules.forEach(({ field, value, rules: fieldRules }) => {
    for (const rule of fieldRules) {
      let error: string | null = null;

      switch (rule) {
        case 'required':
          error = validateRequired(value);
          break;
        case 'email':
          error = validateEmail(value);
          break;
        case 'url':
          error = validateUrl(value);
          break;
        case 'password':
          error = validatePassword(value);
          break;
        default:
          break;
      }

      if (error) {
        errors[field] = error;
        break; // Stop at first error for this field
      }
    }
  });

  return errors;
};