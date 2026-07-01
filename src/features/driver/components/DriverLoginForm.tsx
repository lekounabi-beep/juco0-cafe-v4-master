"use client";

import { useEffect, useState } from "react";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { useIsStandalone } from "@/hooks/useIsStandalone";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { EspressoBackground } from "@/components/EspressoBackground";
import { authenticateDriver, verifyDriverSession } from "../../../../app/actions/driver-login";
import { setDriverSession, clearDriverSession } from "@/lib/auth/driver-session";

export function DriverLoginForm() {
  const { replaceWhenReady } = useSafeRouter();
  const isStandalone = useIsStandalone();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [invalidFields, setInvalidFields] = useState(false);

  useEffect(() => {
    verifyDriverSession().then((ok) => {
      if (ok) {
        window.location.replace("/driver");
      }
    });
  }, []);

  const attemptLogin = async (loginUsername: string, loginPassword: string) => {
    setError("");
    setInvalidFields(false);

    if (!loginUsername || !loginPassword) {
      setError("Συμπλήρωσε όλα τα πεδία");
      triggerInvalid();
      return false;
    }

    setLoading(true);

    const result = await authenticateDriver(username.trim(), password);

    if (result.status === "success") {
      setDriverSession({
        driver_id: result.id,
        full_name: result.full_name,
      });
      replaceWhenReady("/driver");
      return true;
    }

    if (result.status === "rate_limited") {
      const minutes = Math.max(1, Math.ceil(result.retryAfterSec / 60));
      setError(`Πολλές αποτυχημένες προσπάθειες. Δοκίμασε ξανά σε ${minutes} λεπτά.`);
    } else {
      setError(
        "Λάθος username ή κωδικός. Χρησιμοποίησε ακριβώς το username που σου έδωσε το κατάστημα.",
      );
    }
    triggerInvalid();
    setLoading(false);
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await attemptLogin(username, password);
  };

  const triggerInvalid = () => {
    setInvalidFields(true);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const inputClass = (invalid: boolean) =>
    `w-full min-h-[48px] rounded-xl border px-4 py-3 text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 transition-colors ${
      invalid
        ? "border-red-500/60 bg-red-500/10 focus:border-red-500/80 focus:ring-red-500/20"
        : "border-white/10 bg-white/5 focus:border-primary/40 focus:ring-primary/20"
    }`;

  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          {!isStandalone && (
            <Link
              href="/"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
              aria-label="Επιστροφή στην αρχική"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
            J
          </span>
          <span className="font-display text-base font-semibold text-white">Juco Driver</span>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-57px)] max-w-md flex-col px-4 py-10">
        <div className={`flex flex-1 flex-col ${shake ? "driver-login-shake" : ""}`}>
          <div className="mb-8 text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Σύνδεση οδηγού
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Χρησιμοποίησε τα στοιχεία που σου έδωσε το κατάστημα.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="driver-username"
                className="mb-2 block text-sm font-medium text-white/85"
              >
                Username
              </label>
              <input
                id="driver-username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setInvalidFields(false);
                }}
                placeholder="π.χ. γιαννης"
                autoComplete="username"
                className={inputClass(invalidFields)}
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="driver-password"
                className="mb-2 block text-sm font-medium text-white/85"
              >
                Password
              </label>
              <input
                id="driver-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setInvalidFields(false);
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                className={inputClass(invalidFields)}
                disabled={loading}
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm text-red-100"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  Σύνδεση...
                </span>
              ) : (
                "Σύνδεση"
              )}
            </button>
          </form>

          <p className="mt-auto pt-10 text-center text-xs leading-relaxed text-white/45">
            Πρόβλημα με τη σύνδεση; Επικοινώνησε με το κατάστημα.
          </p>
        </div>
      </main>

      <style jsx global>{`
        @keyframes driver-login-shake-keyframes {
          0%,
          100% {
            transform: translateX(0);
          }
          20%,
          60% {
            transform: translateX(-6px);
          }
          40%,
          80% {
            transform: translateX(6px);
          }
        }
        .driver-login-shake {
          animation: driver-login-shake-keyframes 0.45s ease-in-out;
        }
      `}</style>
    </div>
  );
}
