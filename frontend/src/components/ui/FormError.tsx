interface FormErrorProps {
  message?: string | string[] | null;
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  const messages = Array.isArray(message) ? message : [message];

  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2"
    >
      {messages.map((msg, i) => (
        <p key={i} className="text-sm text-red-700">
          {msg}
        </p>
      ))}
    </div>
  );
}
