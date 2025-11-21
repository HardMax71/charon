import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    variant?: 'text' | 'scroll';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', variant = 'text', ...props }, ref) => {

        const variantClasses = {
            text: 'input-text',
            scroll: 'input-scroll'
        };

        return (
            <input
                ref={ref}
                className={`${variantClasses[variant]} ${className}`}
                {...props}
            />
        );
    }
);

Input.displayName = "Input";
