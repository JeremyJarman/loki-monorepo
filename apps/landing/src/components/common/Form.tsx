import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from './Button';

interface EmailFormData {
  email: string;
}

interface EmailFormProps {
  onSubmit: (email: string) => void;
  onError?: (error: Error) => void;
  buttonText?: string;
  placeholder?: string;
}

export const EmailForm: React.FC<EmailFormProps> = ({
  onSubmit,
  onError,
  buttonText = 'Join Waitlist',
  placeholder = 'Enter your email',
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EmailFormData>();

  const onFormSubmit = async (data: EmailFormData) => {
    try {
      await onSubmit(data.email);
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col sm:flex-row gap-3 max-w-md">
      <div className="flex-1">
        <input
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-lg border-2 border-neutral-light focus:border-primary focus:outline-none transition-colors"
          aria-label="Email address"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-secondary" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting} className="whitespace-nowrap">
        {isSubmitting ? 'Joining...' : buttonText}
      </Button>
    </form>
  );
};
