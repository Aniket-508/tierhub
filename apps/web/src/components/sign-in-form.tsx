import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@tierhub/ui/components/button";
import { Input } from "@tierhub/ui/components/input";
import { Label } from "@tierhub/ui/components/label";
import { useCallback } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";

interface FormFieldLike {
  handleBlur: () => void;
  handleChange: (value: string) => void;
  name: string;
  state: {
    meta: {
      errors: ({ message?: string } | undefined)[];
    };
    value: string;
  };
}

const FormField = ({
  field,
  label,
  type = "text",
}: {
  field: unknown;
  label: string;
  type?: string;
}) => {
  const f = field as FormFieldLike;
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      f.handleChange(e.target.value);
    },
    [f]
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={f.name}>{label}</Label>
      <Input
        id={f.name}
        name={f.name}
        type={type}
        value={f.state.value}
        onBlur={f.handleBlur}
        onChange={handleChange}
      />
      {f.state.meta.errors.map((error) => (
        <p key={error?.message} className="text-red-500">
          {error?.message}
        </p>
      ))}
    </div>
  );
};

const SignInForm = ({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) => {
  const navigate = useNavigate({
    from: "/",
  });

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
          onSuccess: () => {
            navigate({
              to: "/dashboard",
            });
            toast.success("Sign in successful");
          },
        }
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  const subscribeSelector = useCallback(
    (state: { canSubmit: boolean; isSubmitting: boolean }) => ({
      canSubmit: state.canSubmit,
      isSubmitting: state.isSubmitting,
    }),
    []
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      form.handleSubmit();
    },
    [form]
  );

  return (
    <div className="mx-auto mt-10 w-full max-w-md p-6">
      <h1 className="mb-6 text-center text-3xl font-bold">Welcome Back</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <form.Field name="email">
            {(field) => <FormField field={field} label="Email" type="email" />}
          </form.Field>
        </div>

        <div>
          <form.Field name="password">
            {(field) => (
              <FormField field={field} label="Password" type="password" />
            )}
          </form.Field>
        </div>

        <form.Subscribe selector={subscribeSelector}>
          {({
            canSubmit,
            isSubmitting,
          }: {
            canSubmit: boolean;
            isSubmitting: boolean;
          }) => (
            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Sign In"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-4 text-center">
        <Button
          variant="link"
          onClick={onSwitchToSignUp}
          className="text-indigo-600 hover:text-indigo-800"
        >
          Need an account? Sign Up
        </Button>
      </div>
    </div>
  );
};

export default SignInForm;
