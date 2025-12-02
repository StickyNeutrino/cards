import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HamburgerMenu } from '../../app/components/HamburgerMenu';

describe('HamburgerMenu', () => {
  const defaultProps = {
    mode: 'plants' as const,
    changeModeClicked: vi.fn(),
    settingsClicked: vi.fn(),
    cardListsClicked: vi.fn(),
  };

  it('renders with plants mode', () => {
    render(<HamburgerMenu {...defaultProps} />);

    expect(screen.getByText('🌿 Plants')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/gear-solid-full.svg');
  });

  it('renders with birds mode', () => {
    render(<HamburgerMenu {...defaultProps} mode="birds" />);

    expect(screen.getByText('🐦 Birds')).toBeInTheDocument();
  });

  it('renders with both mode', () => {
    render(<HamburgerMenu {...defaultProps} mode="both" />);

    expect(screen.getByText('🌿🐦 Both')).toBeInTheDocument();
  });

  it('calls changeModeClicked when mode button is clicked', () => {
    const changeModeClicked = vi.fn();
    render(<HamburgerMenu {...defaultProps} changeModeClicked={changeModeClicked} />);

    const modeButton = screen.getByText('🌿 Plants');
    fireEvent.click(modeButton);

    expect(changeModeClicked).toHaveBeenCalledTimes(1);
  });

  it('calls settingsClicked when settings button is clicked', () => {
    const settingsClicked = vi.fn();
    render(<HamburgerMenu {...defaultProps} settingsClicked={settingsClicked} />);

    const settingsButton = screen.getByRole('img').parentElement!;
    fireEvent.click(settingsButton);

    expect(settingsClicked).toHaveBeenCalledTimes(1);
  });

  it('forwards ref to the container div', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<HamburgerMenu {...defaultProps} ref={(el) => { ref.current = el; }} />);

    // The ref should be set to the hamburger-menu div
    expect(ref.current).toBeInTheDocument();
    expect(ref.current).toHaveClass('hamburger-menu');
  });

  it('applies correct CSS classes', () => {
    const { container } = render(<HamburgerMenu {...defaultProps} />);

    expect(container.firstChild).toHaveClass('hamburger-menu');
    expect(screen.getByText('🌿 Plants')).toHaveClass('menu-button');
    expect(screen.getByRole('img').parentElement).toHaveClass('menu-button', 'ml-2');
  });

  it('has correct accessibility attributes for settings button', () => {
    render(<HamburgerMenu {...defaultProps} />);

    const settingsButton = screen.getByRole('img').parentElement!;
    expect(settingsButton).toHaveAttribute('title', 'Settings');
  });

  it('renders all buttons', () => {
    render(<HamburgerMenu {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('handles all mode prop values correctly', () => {
    const { rerender } = render(<HamburgerMenu {...defaultProps} mode="plants" />);
    expect(screen.getByText('🌿 Plants')).toBeInTheDocument();

    rerender(<HamburgerMenu {...defaultProps} mode="birds" />);
    expect(screen.getByText('🐦 Birds')).toBeInTheDocument();

    rerender(<HamburgerMenu {...defaultProps} mode="both" />);
    expect(screen.getByText('🌿🐦 Both')).toBeInTheDocument();
  });
});