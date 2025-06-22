export * from '../../../shared/types';
import { User } from '../../../shared/types';

// Frontend-specific types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface FormErrors {
  [key: string]: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  title: string;
  render?: (value: any, record: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface BadgeProps {
  variant: 'success' | 'warning' | 'error' | 'info' | 'secondary';
  children: React.ReactNode;
  className?: string;
}

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface InputProps {
  label?: string;
  error?: string;
  required?: boolean;
  className?: string;
  [key: string]: any;
}

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps {
  label?: string;
  error?: string;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  [key: string]: any;
}

export interface DashboardStats {
  totalSites: number;
  activeSites: number;
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  failedPosts: number;
  claudeRequests: number;
  successRate: number;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }>;
}

export interface SiteFormData {
  name: string;
  url: string;
  username: string;
  password: string;
  region: string;
  pharmacy_name: string;
  pharmacy_features: string;
  category_id?: number;
}

export interface PostFormData {
  title: string;
  content: string;
  topic_id?: string;
  template_id?: string;
  scheduled_at?: string;
  meta_description?: string;
  tags?: string[];
}

export interface ScheduleFormData {
  frequency: string;
  time_slot: string;
  specific_time?: string;
  timezone: string;
  skip_holidays: boolean;
  max_monthly_posts: number;
  cron_expression?: string;
}

export interface ClaudeRequestFormData {
  site_info: {
    region: string;
    pharmacy_name: string;
    pharmacy_features?: string;
  };
  article_config: {
    topic: string;
    tone: string;
    target_length: number;
    keywords: string[];
    exclude_keywords: string[];
  };
  template: {
    structure: string;
    seo_focus: boolean;
  };
}