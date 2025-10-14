import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '../Button'

describe('Button', () => {
  it('renders with children text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeTruthy()
  })

  it('applies variant classes correctly', () => {
    const { container } = render(<Button variant="primary">Primary</Button>)
    const button = container.querySelector('button')
    expect(button?.className).toContain('bg-blue-600')
  })

  it('applies disabled state correctly', () => {
    const { container } = render(<Button disabled>Disabled</Button>)
    const button = container.querySelector('button')
    expect(button?.disabled).toBe(true)
    expect(button?.className).toContain('opacity-50')
  })

  it('renders with custom className', () => {
    const { container } = render(<Button className="w-full">Full Width</Button>)
    const button = container.querySelector('button')
    expect(button?.className).toContain('w-full')
  })

  it('shows loading spinner when loading', () => {
    const { container } = render(<Button loading>Loading</Button>)
    const spinner = container.querySelector('svg.animate-spin')
    expect(spinner).toBeTruthy()
  })
})
