import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Settings } from '../../app/components/Settings';

describe('Settings', () => {
  const defaultProps = {
    showSettings: true,
    flipSpeed: '0.8',
    setFlipSpeed: vi.fn(),
    isPreloaded: false,
    isPreloading: false,
    handlePreloadCards: vi.fn(),
  };

  it('renders with props when showSettings is true', () => {
    render(<Settings {...defaultProps} />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Card Flip Speed: 0.8s')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByText('📥')).toBeInTheDocument();
    expect(screen.getByText('Download for Offline')).toBeInTheDocument();
  });

  it('does not render when showSettings is false', () => {
    render(<Settings {...defaultProps} showSettings={false} />);

    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('displays instant for flipSpeed of 0', () => {
    render(<Settings {...defaultProps} flipSpeed={'0'} />);

    expect(screen.getByText('Card Flip Speed: Instant')).toBeInTheDocument();
  });

  it('calls setFlipSpeed when slider value changes', () => {
    const setFlipSpeed = vi.fn();
    render(<Settings {...defaultProps} setFlipSpeed={setFlipSpeed} />);

    const slider = screen.getByRole('slider');
    fireEvent.input(slider, { target: { value: '1.5' } });

    expect(setFlipSpeed).toHaveBeenCalledWith('1.5');
  });

  it('renders preload button with correct states', () => {
    const { rerender } = render(<Settings {...defaultProps} />);

    expect(screen.getByText('Download for Offline')).toBeInTheDocument();
    expect(screen.getByRole('button')).not.toBeDisabled();

    rerender(<Settings {...defaultProps} isPreloading={true} />);
    expect(screen.getByText('Downloading...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();

    rerender(<Settings {...defaultProps} isPreloaded={true} />);
    expect(screen.getByText('Cards Downloaded')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls handlePreloadCards when button is clicked', () => {
    const handlePreloadCards = vi.fn();
    render(<Settings {...defaultProps} handlePreloadCards={handlePreloadCards} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handlePreloadCards).toHaveBeenCalledTimes(1);
  });

  it('shows additional text when preloaded', () => {
    render(<Settings {...defaultProps} isPreloaded={true} />);

    expect(screen.getByText('All cards are cached for offline use')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Settings {...defaultProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('keeps clicks inside the panel from closing it (stopPropagation on panel sections)', () => {
    // Home's <main> closes the settings panel on any click that reaches it,
    // so the panel's sections must stop click propagation.
    const onOutsideClick = vi.fn();
    render(
      <div onClick={onOutsideClick}>
        <Settings {...defaultProps} />
      </div>,
    );

    // Control: a click on the panel root itself bubbles to the parent
    fireEvent.click(screen.getByText('Settings'));
    expect(onOutsideClick).toHaveBeenCalledTimes(1);

    // Clicks inside each section (slider, preload, privacy) must not bubble
    fireEvent.click(screen.getByRole('slider'));
    fireEvent.click(screen.getByText('Download for Offline'));
    fireEvent.click(screen.getByText('Enable Analytics Tracking'));
    expect(onOutsideClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct CSS classes', () => {
    const { container } = render(<Settings {...defaultProps} />);

    expect(container.firstChild).toHaveClass('fixed', 'top-28', 'right-4', 'sm:top-20', 'z-50', 'bg-white', 'rounded-lg', 'shadow-xl', 'border', 'border-gray-200', 'p-4', 'min-w-64');
  });
});