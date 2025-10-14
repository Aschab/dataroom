import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Register } from '../Register'

// Mock the auth context and toast
vi.mock('../../lib/AuthContext', () => ({
  useAuth: () => ({
    register: vi.fn(),
    user: null,
  }),
}))

vi.mock('../../components/common/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}))

describe('Register Page', () => {
  it('renders register form', () => {
    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    )

    expect(screen.getByRole('heading', { name: 'Create account' })).toBeTruthy()
    expect(screen.getByPlaceholderText('John Doe')).toBeTruthy()
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy()
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy()
  })

  it('renders register button', () => {
    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    )

    const registerButton = screen.getByRole('button', { name: /create account/i })
    expect(registerButton).toBeTruthy()
  })

  it('renders link to login page', () => {
    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    )

    expect(screen.getByText(/already have an account/i)).toBeTruthy()
    expect(screen.getByText('Sign in')).toBeTruthy()
  })
})
