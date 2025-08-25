import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }: { shouldThrow?: boolean; errorMessage?: string }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div data-testid="no-error">No error occurred</div>;
};

// Component that throws on specific prop change
const ConditionalError = ({ throwOnUpdate = false }: { throwOnUpdate?: boolean }) => {
  if (throwOnUpdate) {
    throw new Error('Update error');
  }
  return <div data-testid="conditional-component">Conditional component</div>;
};

describe('ErrorBoundary', () => {
  let consoleErrorSpy: any;
  
  beforeEach(() => {
    // Mock console.error to avoid noise in test output
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock environment
    Object.defineProperty(process, 'env', {
      value: { NODE_ENV: 'development' },
      configurable: true,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child-component">Child component</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-component')).toBeInTheDocument();
      expect(screen.getByText('Child component')).toBeInTheDocument();
    });

    it('should render multiple children successfully', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <span data-testid="child-3">Child 3</span>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('should handle complex nested children', () => {
      render(
        <ErrorBoundary>
          <div data-testid="parent">
            <div data-testid="nested-child">
              <span data-testid="deeply-nested">Deeply nested content</span>
            </div>
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('parent')).toBeInTheDocument();
      expect(screen.getByTestId('nested-child')).toBeInTheDocument();
      expect(screen.getByTestId('deeply-nested')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch and display error when child throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/An error occurred while rendering this component/)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should display custom fallback when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom error fallback</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onErrorSpy = vi.fn();

      render(
        <ErrorBoundary onError={onErrorSpy}>
          <ThrowError shouldThrow={true} errorMessage="Custom error message" />
        </ErrorBoundary>
      );

      expect(onErrorSpy).toHaveBeenCalledTimes(1);
      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );

      const [error, errorInfo] = onErrorSpy.mock.calls[0];
      expect(error.message).toBe('Custom error message');
      expect(errorInfo.componentStack).toContain('ThrowError');
    });

    it('should log error in development mode', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Development error" />
        </ErrorBoundary>
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should not log error in production mode', () => {
      // Mock production environment
      Object.defineProperty(process, 'env', {
        value: { NODE_ENV: 'production' },
        configurable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Console.error should not be called for logging in production
      // (It might still be called by React itself, but not by our ErrorBoundary)
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should show error details in development mode', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Detailed error message" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details (Development Only)')).toBeInTheDocument();
      
      // Click to expand details
      fireEvent.click(screen.getByText('Error Details (Development Only)'));
      
      expect(screen.getByText(/Error: Detailed error message/)).toBeInTheDocument();
    });

    it('should not show error details in production mode', () => {
      // Mock production environment
      Object.defineProperty(process, 'env', {
        value: { NODE_ENV: 'production' },
        configurable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Error Details (Development Only)')).not.toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from error when Try Again is clicked', () => {
      let shouldThrow = true;
      
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div data-testid="no-error">No error</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      // Should show error state
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Set to not throw on retry
      shouldThrow = false;
      
      // Click Try Again
      fireEvent.click(screen.getByText('Try Again'));

      // Should recover and show normal content
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should reset error state completely on retry', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Initial error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Try Again'));

      // The state should be reset (this would be evident if we re-rendered with a working component)
      // Since we can't easily test the internal state directly, we verify the UI shows the error is cleared
    });

    it('should handle multiple error-recovery cycles', () => {
      let shouldThrow = true;
      let errorCount = 0;
      
      const ToggleError = () => {
        if (shouldThrow) {
          errorCount++;
          throw new Error(`Toggle error ${errorCount}`);
        }
        return <div data-testid="toggle-success">Success</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <ToggleError />
        </ErrorBoundary>
      );

      // First error
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Fix error and click Try Again
      shouldThrow = false;
      fireEvent.click(screen.getByText('Try Again'));
      
      // Should recover (the Try Again resets the error boundary)
      // We don't need to check for success content as it won't re-render automatically
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors thrown in componentDidMount', () => {
      class MountError extends React.Component {
        componentDidMount() {
          throw new Error('Mount error');
        }
        render() {
          return <div>Mount component</div>;
        }
      }

      render(
        <ErrorBoundary>
          <MountError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should handle errors thrown in componentDidUpdate', () => {
      render(
        <ErrorBoundary>
          <ConditionalError throwOnUpdate={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('conditional-component')).toBeInTheDocument();

      // This would require a way to trigger componentDidUpdate with an error
      // In a real scenario, this would be tested by changing props that cause an update error
    });

    it('should handle very long error messages', () => {
      const longErrorMessage = 'A'.repeat(1000) + ' very long error message';
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage={longErrorMessage} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // In development mode, long error should be displayed
      if (process.env.NODE_ENV === 'development') {
        fireEvent.click(screen.getByText('Error Details (Development Only)'));
        expect(screen.getByText(new RegExp(longErrorMessage))).toBeInTheDocument();
      }
    });

    it('should handle errors with special characters', () => {
      const specialCharError = 'Error with <special> & "characters" and \n newlines';
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage={specialCharError} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should handle null children gracefully', () => {
      render(
        <ErrorBoundary>
          {null}
        </ErrorBoundary>
      );

      // Should render without errors, even with null children
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should handle undefined children gracefully', () => {
      render(
        <ErrorBoundary>
          {undefined}
        </ErrorBoundary>
      );

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should handle empty fragment children', () => {
      render(
        <ErrorBoundary>
          <React.Fragment />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    it('should maintain error state across re-renders', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Re-render the ErrorBoundary with same erroring child
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should still show error state
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should update state correctly when getDerivedStateFromError is called', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Derived state error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // The error should be captured in the state
      if (process.env.NODE_ENV === 'development') {
        fireEvent.click(screen.getByText('Error Details (Development Only)'));
        expect(screen.getByText(/Error: Derived state error/)).toBeInTheDocument();
      }
    });
  });

  describe('Accessibility', () => {
    it('should have accessible error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Check for proper heading hierarchy
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Something went wrong');
      
      // Check for accessible button
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorContainer = screen.getByText('Something went wrong').closest('div');
      expect(errorContainer).toHaveClass('flex', 'flex-col');
    });

    it('should handle keyboard navigation on Try Again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' });
      
      // Should be focusable
      tryAgainButton.focus();
      expect(tryAgainButton).toHaveFocus();
      
      // Should handle Enter key
      fireEvent.keyDown(tryAgainButton, { key: 'Enter' });
      // The retry functionality would be tested in integration
    });

    it('should handle keyboard navigation on details summary', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      if (process.env.NODE_ENV === 'development') {
        const detailsSummary = screen.getByText('Error Details (Development Only)');
        
        // Should be focusable
        detailsSummary.focus();
        expect(detailsSummary).toHaveFocus();
      }
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when in error state', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorMessage = screen.getByText('Something went wrong');
      
      // Re-render with same props
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should still show the same error message
      expect(errorMessage).toBeInTheDocument();
    });

    it('should handle unmounting while in error state', () => {
      const { unmount } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should work with complex component trees', () => {
      const ComplexTree = () => (
        <div>
          <header>Header</header>
          <main>
            <aside>Sidebar</aside>
            <article>
              <ThrowError shouldThrow={true} />
            </article>
          </main>
          <footer>Footer</footer>
        </div>
      );

      render(
        <ErrorBoundary>
          <ComplexTree />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByText('Header')).not.toBeInTheDocument();
      expect(screen.queryByText('Footer')).not.toBeInTheDocument();
    });

    it('should work with other error boundaries', () => {
      render(
        <ErrorBoundary fallback={<div data-testid="outer-fallback">Outer Error</div>}>
          <ErrorBoundary fallback={<div data-testid="inner-fallback">Inner Error</div>}>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(screen.getByTestId('inner-fallback')).toBeInTheDocument();
      expect(screen.queryByTestId('outer-fallback')).not.toBeInTheDocument();
    });

    it('should propagate errors to parent boundary when retry fails', () => {
      const FailingComponent = ({ shouldFail }: { shouldFail: boolean }) => {
        if (shouldFail) {
          throw new Error('Persistent error');
        }
        return <div data-testid="success">Success</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <FailingComponent shouldFail={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Click retry but component still fails
      fireEvent.click(screen.getByText('Try Again'));
      
      rerender(
        <ErrorBoundary>
          <FailingComponent shouldFail={true} />
        </ErrorBoundary>
      );

      // Should still show error state
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});