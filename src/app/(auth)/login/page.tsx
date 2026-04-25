import { redirect } from "next/navigation";
import { loginAction } from "@/app/(auth)/login/actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUser } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <main className="login-page">
      <div className="login-theme-toggle">
        <ThemeToggle />
      </div>
      <section className="login-card">
        <div className="brand-block login-brand">
          <div className="brand-mark">HD</div>
          <div>
            <p className="eyebrow">Home Dashboard</p>
            <h1>Welcome home</h1>
          </div>
        </div>

        {params.error ? <p className="form-error">{params.error}</p> : null}

        <form action={loginAction} className="stacked-form">
          <label>
            Username or email
            <input name="identifier" type="text" autoComplete="username" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="primary-button">Sign in</button>
        </form>
      </section>
    </main>
  );
}
