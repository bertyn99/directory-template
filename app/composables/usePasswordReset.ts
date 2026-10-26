export const usePasswordReset = () => {
  const step = useState<'request' | 'verify' | 'reset'>('reset-password-step', () => 'request')
  const email = useState<string>('reset-password-email', () => '')

  const setStep = (newStep: 'request' | 'verify' | 'reset') => {
    step.value = newStep
  }

  const setEmail = (newEmail: string) => {
    email.value = newEmail
  }

  return {
    step,
    email,
    setStep,
    setEmail
  }
}
