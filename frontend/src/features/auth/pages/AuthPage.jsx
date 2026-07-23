import { Link } from 'react-router-dom'
import { ArrowLeft, Lock, Mail, User, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthField from '../components/AuthField'
import AuthShell from '../components/AuthShell'
import { GoogleButton, PrimaryButton, SecondaryButton } from '../components/AuthButtons'
import useAuthForm from '../hooks/useAuthForm'

function AuthAlert({ children, variant = 'danger' }) {
  const styles =
    variant === 'danger'
      ? 'border-danger/20 bg-danger/10 text-danger'
      : 'border-success/20 bg-success/10 text-success'

  return (
    <div className={`rounded-input border px-3.5 py-3 text-sm leading-relaxed ${styles}`} role="alert">
      {children}
    </div>
  )
}

function StepIndicator({ step }) {
  return (
    <div className="mb-6 flex items-center gap-2" aria-label={`Step ${step} of 2`}>
      {[1, 2].map((n) => (
        <div key={n} className="flex flex-1 items-center gap-2">
          <div
            className={[
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition duration-normal',
              n <= step
                ? 'bg-primary text-on-primary shadow-sm'
                : 'border border-border bg-card text-muted'
            ].join(' ')}
          >
            {n}
          </div>
          {n < 2 && (
            <div
              className={[
                'h-0.5 flex-1 rounded-full transition duration-normal',
                step > 1 ? 'bg-primary' : 'bg-border'
              ].join(' ')}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default function AuthPage({ mode }) {
  const {
    error,
    form,
    isSignup,
    signupStep,
    googleLoading,
    submitting,
    continueSignup,
    backToSignupStep1,
    handleSubmit,
    startGoogleAuth,
    updateField
  } = useAuthForm(mode)

  const title = isSignup
    ? signupStep === 1
      ? 'Create your account'
      : 'Almost there'
    : 'Welcome back'
  const subtitle = isSignup
    ? signupStep === 1
      ? 'Join your team in one unified workspace.'
      : 'Tell us a bit about you to finish setup.'
    : 'Sign in to continue to your workspaces.'

  return (
    <AuthShell mode={mode}>
      <div className="relative">
        {/* Mode toggle tabs */}
        <div className="mb-8 grid grid-cols-2 rounded-input border border-border bg-card-sunken/60 p-1">
          <Link
            to="/signin"
            className={[
              'rounded-control px-3 py-2.5 text-center text-sm font-semibold transition duration-normal',
              !isSignup
                ? 'bg-card text-text shadow-sm'
                : 'text-muted hover:text-text'
            ].join(' ')}
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className={[
              'rounded-control px-3 py-2.5 text-center text-sm font-semibold transition duration-normal',
              isSignup
                ? 'bg-card text-text shadow-sm'
                : 'text-muted hover:text-text'
            ].join(' ')}
          >
            Sign up
          </Link>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={isSignup ? `signup-${signupStep}` : 'signin'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          >
            <div className="mb-7">
              <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-[1.75rem]">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
            </div>

            {isSignup && <StepIndicator step={signupStep} />}

            {(isSignup ? signupStep === 1 : true) && (
              <>
                <GoogleButton
                  onClick={startGoogleAuth}
                  disabled={submitting || googleLoading}
                  loading={googleLoading}
                />

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    or email
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              </>
            )}

            {error && (
              <div className="mb-4">
                <AuthAlert>{error}</AuthAlert>
              </div>
            )}

            {!isSignup && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <AuthField
                  icon={Mail}
                  label="Email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="you@company.com"
                />

                <AuthField
                  icon={Lock}
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder="Enter your password"
                  hint={
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  }
                />

                <div className="pt-1">
                  <PrimaryButton disabled={submitting} loading={submitting}>
                    {submitting ? 'Signing in...' : 'Sign in'}
                  </PrimaryButton>
                </div>
              </form>
            )}

            {isSignup && signupStep === 1 && (
              <form onSubmit={continueSignup} className="space-y-4">
                <AuthField
                  icon={Mail}
                  label="Work email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="you@company.com"
                />

                <AuthField
                  icon={Lock}
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder="At least 8 characters"
                />

                <p className="text-xs leading-relaxed text-muted">
                  By continuing you agree to Teamora&apos;s terms and privacy policy.
                </p>

                <div className="pt-1">
                  <PrimaryButton disabled={submitting} loading={submitting}>
                    {submitting ? 'Checking...' : 'Continue'}
                  </PrimaryButton>
                </div>
              </form>
            )}

            {isSignup && signupStep === 2 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <AuthField
                  icon={User}
                  label="Full name"
                  autoComplete="name"
                  required
                  value={form.fullName}
                  onChange={(event) => updateField('fullName', event.target.value)}
                  placeholder="Alex Morgan"
                />

                <AuthField
                  icon={Users}
                  label="Username"
                  autoComplete="username"
                  required
                  value={form.username}
                  onChange={(event) => updateField('username', event.target.value)}
                  placeholder="alex"
                />

                <div className="flex flex-col gap-2.5 pt-1">
                  <PrimaryButton disabled={submitting} loading={submitting}>
                    {submitting ? 'Creating account...' : 'Create account'}
                  </PrimaryButton>
                  <SecondaryButton type="button" disabled={submitting} onClick={backToSignupStep1}>
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    Back
                  </SecondaryButton>
                </div>
              </form>
            )}

            <p className="mt-8 text-center text-sm text-muted">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
              <Link
                to={isSignup ? '/signin' : '/signup'}
                className="font-semibold text-primary hover:underline"
              >
                {isSignup ? 'Sign in' : 'Create one'}
              </Link>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </AuthShell>
  )
}
