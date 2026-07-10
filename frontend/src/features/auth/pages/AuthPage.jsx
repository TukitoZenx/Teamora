import { Link } from 'react-router-dom'
import { Lock, Mail, User, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import AuthField from '../components/AuthField'
import AuthShell from '../components/AuthShell'
import { GoogleButton, PrimaryButton } from '../components/AuthButtons'
import useAuthForm from '../hooks/useAuthForm'

export default function AuthPage({ mode }) {
  const {
    error,
    form,
    isSignup,
    signupStep,
    googleLoading,
    submitting,
    continueSignup,
    handleSubmit,
    startGoogleAuth,
    updateField
  } = useAuthForm(mode)

  return (
    <AuthShell>
      <motion.div
        key={isSignup ? `signup-${signupStep}` : 'signin'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
      >
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mt-3 text-sm text-muted sm:text-base">
            {isSignup
              ? 'Join your team in a unified collaboration workspace.'
              : 'Sign in to continue to your workspaces.'}
          </p>
        </div>

        {(isSignup ? signupStep === 1 : true) && (
          <>
            <GoogleButton onClick={startGoogleAuth} disabled={submitting || googleLoading} loading={googleLoading} />

            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        {error && (
          <div className="mb-4 rounded-card border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {!isSignup && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthField
              icon={Mail}
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="you@example.com"
            />

            <AuthField
              icon={Lock}
              label="Password"
              type="password"
              required
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="Password"
            />

            <div className="flex justify-end text-sm">
              <Link to="/forgot-password" className="font-medium text-primary hover:underline">
                Forgot password
              </Link>
            </div>

            <PrimaryButton disabled={submitting} loading={submitting}>
              {submitting ? 'Please wait...' : 'Sign In'}
            </PrimaryButton>
          </form>
        )}

        {isSignup && signupStep === 1 && (
          <form onSubmit={continueSignup} className="space-y-4">
            <AuthField
              icon={Mail}
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="you@example.com"
            />

            <AuthField
              icon={Lock}
              label="Password"
              type="password"
              required
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="Password"
            />

            <PrimaryButton disabled={submitting} loading={submitting}>
              {submitting ? 'Please wait...' : 'Continue'}
            </PrimaryButton>
          </form>
        )}

        {isSignup && signupStep === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthField
              icon={User}
              label="Full Name"
              required
              value={form.fullName}
              onChange={(event) => updateField('fullName', event.target.value)}
              placeholder="Alex Morgan"
            />

            <AuthField
              icon={Users}
              label="Username"
              required
              value={form.username}
              onChange={(event) => updateField('username', event.target.value)}
              placeholder="alex"
            />

            <PrimaryButton disabled={submitting} loading={submitting}>
              {submitting ? 'Please wait...' : 'Create Account'}
            </PrimaryButton>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-muted">
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <Link to={isSignup ? '/signin' : '/signup'} className="font-medium text-primary hover:underline">
            {isSignup ? 'Sign In' : 'Create Account'}
          </Link>
        </p>
      </motion.div>
    </AuthShell>
  )
}
