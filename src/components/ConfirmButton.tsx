"use client";

export default function ConfirmButton({
  action,
  label,
  message,
  className,
}: {
  action: () => Promise<void>;
  label: string;
  message?: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message ?? "متأكد؟ Are you sure?")) e.preventDefault();
      }}
    >
      <button className={className ?? "btn-danger"}>{label}</button>
    </form>
  );
}
