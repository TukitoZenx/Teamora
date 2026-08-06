import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from './useAuth'
import { checkEmailAvailability, getGoogleAuthUrl } from '../services/auth'

const validateEmail = (email) => /\S+@\S+\.\S+/.test(email)

export const getFriendlyAuthError = (message = '') => {
  const lower = message.toLowerCase()

  if (lower.includes('valid email')) return 'Please enter a valid email address.'
  if (lower.includes('invalid credentials')) return 'Wrong email or password.'
  if (lower.includes('server unavailable')) return 'Server unavailable. Please try again.'
  if (lower.includes('network')) return 'Network error. Please try again.'
  if (lower.includes('email is already in use') || lower.includes('email already exists'))
    return 'Email already exists.'
  if (lower.includes('username is already in use') || lower.includes('username already exists'))
    return 'Username already exists.'
  if (lower.includes('authentication required')) return 'Session expired. Please sign in again.'
  if (lower.includes('reset link') || lower.includes('expired')) return 'This reset link is invalid or has expired.'
  if (lower.includes('email service') || lower.includes('reset email'))
    return 'We could not send the reset email. Please try again later.'

  return message || 'Something went wrong. Please try again.'
}

export default function useAuthForm(mode) {
  const isSignup = mode === 'signup'
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: ''
  })
  const [signupStep, setSignupStep] = useState(1)
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const updateField = (field, value) => {
    setError('')
    setForm((current) => ({ ...current, [field]: value }))
  }

  const validateCredentials = ({ requireStrongPassword = false } = {}) => {
    if (!validateEmail(form.email)) {
      setError('Please enter a valid email address.')
      return false
    }

    if (!form.password.trim()) {
      setError('Password is required.')
      return false
    }

    if (requireStrongPassword && form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return false
    }

    return true
  }

  const continueSignup = async (event) => {
    event.preventDefault()
    setError('')

    if (!validateCredentials({ requireStrongPassword: true })) return

    setSubmitting(true)
    try {
      const result = await checkEmailAvailability(form.email)
      if (result && result.available === false) {
        setError('Email already exists.')
        return
      }
      setSignupStep(2)
    } catch (authError) {
      setError(getFriendlyAuthError(authError.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!validateCredentials({ requireStrongPassword: isSignup })) return

    if (isSignup && (!form.fullName.trim() || !form.username.trim())) {
      setError('Full name and username are required.')
      return
    }

    setSubmitting(true)
    try {
      let nextUser = null
      if (isSignup) {
        nextUser = await register(form)
        toast.success('Account created successfully.')
      } else {
        nextUser = await login({ email: form.email, password: form.password })
        toast.success('Welcome back!')
      }

      // Avoid a dashboard flash for incomplete Google/local profiles.
      if (nextUser && nextUser.profileComplete === false) {
        navigate('/complete-profile', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (authError) {
      setError(getFriendlyAuthError(authError.message))
    } finally {
      setSubmitting(false)
    }
  }

  const backToSignupStep1 = () => {
    setError('')
    setSignupStep(1)
  }

  const startGoogleAuth = () => {
    setError('')
    setGoogleLoading(true)
    sessionStorage.setItem('teamora-google-auth-started', 'true')
    window.location.replace(getGoogleAuthUrl())
  }

  return {
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
  }
}
