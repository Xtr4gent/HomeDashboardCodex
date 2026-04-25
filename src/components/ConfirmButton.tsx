"use client";

type ConfirmButtonProps = {
  children: React.ReactNode;
  message: string;
  className?: string;
};

export function ConfirmButton({ children, message, className }: ConfirmButtonProps) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
