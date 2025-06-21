import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ConfirmDialogProps } from '../../types';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import Button from './Button';
import { clsx } from 'clsx';

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '確認',
  cancelText = 'キャンセル',
  type = 'info',
}) => {
  const iconMap = {
    danger: AlertTriangle,
    warning: AlertCircle,
    info: Info,
  };

  const iconColorMap = {
    danger: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
  };

  const backgroundColorMap = {
    danger: 'bg-red-100',
    warning: 'bg-yellow-100',
    info: 'bg-blue-100',
  };

  const Icon = iconMap[type];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className={clsx(
                      'mx-auto flex h-12 w-12 items-center justify-center rounded-full',
                      backgroundColorMap[type]
                    )}>
                      <Icon className={clsx('h-6 w-6', iconColorMap[type])} />
                    </div>
                  </div>
                  <div className="ml-4">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      {title}
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">{message}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <Button variant="outline" onClick={onClose}>
                    {cancelText}
                  </Button>
                  <Button
                    variant={type === 'danger' ? 'danger' : 'primary'}
                    onClick={onConfirm}
                  >
                    {confirmText}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ConfirmDialog;