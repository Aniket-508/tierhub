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

const SignUpForm = ({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) => {
  const navigate = useNavigate({
    from: "/",
  });

  const form = useForm({
    defaultValues: {
      email: "",
      name: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          name: value.name,
          password: value.password,
        },
        {
          onError: (error: unknown) => {
            const err = error as {
              error?: { message?: string; statusText?: string };
            };
            toast.error(err.error?.message || err.error?.statusText);
          },
          onSuccess: () => {
            navigate({
              to: "/dashboard",
            });
            toast.success("Sign up successful");
          },
        }
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.string().email("Invalid email address"),
        name: z.string().min(2, "Name must be at least 2 characters"),
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
      <h1 className="mb-6 text-center text-3xl font-bold">Create Account</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <form.Field name="name">
            {(field) => <FormField field={field} label="Name" />}
          </form.Field>
        </div>

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
              {isSubmitting ? "Submitting..." : "Sign Up"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-4 text-center">
        <Button
          variant="link"
          onClick={onSwitchToSignIn}
          className="text-indigo-600 hover:text-indigo-800"
        >
          Already have an account? Sign In
        </Button>
      </div>
    </div>
  );
};

export default SignUpForm;
