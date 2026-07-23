import { ArrowRight } from 'lucide-react'
import Button from '../../../components/ui/Button'

export const GoogleMark = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
    {/* Google brand colors are fixed by logo guidelines */}
    <path
      fill="#EA4335"
      d="M12 5.04c1.69 0 3.19.58 4.38 1.72l3.27-3.27C17.67 1.65 15.1.5 12 .5 7.65.5 3.89 2.99 2.06 6.62l3.8 2.95C6.75 6.91 9.22 5.04 12 5.04Z"
    />
    <path
      fill="#4285F4"
      d="M23.5 12.26c0-.78-.07-1.53-.2-2.26H12v4.27h6.46c-.28 1.5-1.13 2.77-2.41 3.62l3.72 2.89c2.17-2 3.73-4.95 3.73-8.52Z"
    />
    <path
      fill="#FBBC05"
      d="M5.86 14.43A7.16 7.16 0 0 1 5.48 12c0-.84.14-1.66.38-2.43l-3.8-2.95A11.44 11.44 0 0 0 .5 12c0 1.94.47 3.78 1.56 5.38l3.8-2.95Z"
    />
    <path
      fill="#34A853"
      d="M12 23.5c3.1 0 5.7-1.02 7.6-2.77l-3.72-2.89c-1.03.69-2.35 1.1-3.88 1.1-2.98 0-5.5-2.01-6.4-4.71l-3.8 2.95C3.62 21.02 7.48 23.5 12 23.5Z"
    />
  </svg>
)

export const PrimaryButton = ({ children, disabled, loading, className = '' }) => (
  <Button
    type="submit"
    size="lg"
    className={`h-12 w-full rounded-button text-sm font-semibold shadow-sm ${className}`}
    disabled={disabled}
    loading={loading}
  >
    {children}
    {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
  </Button>
)

export const GoogleButton = ({ onClick, disabled, loading }) => (
  <Button
    type="button"
    variant="secondary"
    size="lg"
    className="h-12 w-full rounded-button border-border/80 bg-card text-sm font-semibold shadow-sm"
    onClick={onClick}
    disabled={disabled || loading}
    loading={loading}
  >
    {!loading && <GoogleMark />}
    {loading ? 'Connecting...' : 'Continue with Google'}
  </Button>
)

export const SecondaryButton = ({ children, disabled, loading, onClick, type = 'button' }) => (
  <Button
    type={type}
    variant="secondary"
    size="lg"
    className="h-12 w-full rounded-button text-sm font-semibold"
    disabled={disabled}
    loading={loading}
    onClick={onClick}
  >
    {children}
  </Button>
)
