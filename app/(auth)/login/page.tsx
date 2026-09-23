"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "osp-ui-kit";
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoginForm
      brandName="One St. Peter"
      title="Chapels log"
      subtitle="Sign in to continue."
      usernameLabel="Username"
      isLoading={isLoading}
      showRememberMe
      showForgotPassword={false}
      showSignup={false}
      showBiometricLogin={true}
      showGoogleLogin={true}
      onGoogleLogin={() => router.push("/")}
      onFacebookLogin={() => router.push("/")}
      onBiometricLogin={() => router.push("/")}
      onLogin={async (username, password, { remember }) => {
        setIsLoading(true);
        try {
          // Rejecting here is what surfaces the message in the form, so let
          // signIn's error propagate rather than swallowing it.
          await signIn(username, password, { remember });
          router.replace("/");
        } finally {
          setIsLoading(false);
        }
      }}
    />
  );
}
