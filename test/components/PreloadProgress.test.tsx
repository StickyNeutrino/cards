import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PreloadProgress } from '../../app/components/PreloadProgress';
import fc from 'fast-check';

describe('PreloadProgress', () => {
  it('does not render when isVisible is false', () => {
    render(<PreloadProgress current={0} total={10} isVisible={false} isPreloading={true} />);

    expect(screen.queryByText('Downloading cards for offline use...')).not.toBeInTheDocument();
  });

  it('renders with preloading indicator when isPreloading is true', () => {
    render(<PreloadProgress current={5} total={10} isVisible={true} isPreloading={true} />);

    expect(screen.getByText('Downloading cards for offline use...')).toBeInTheDocument();
  });

  it('renders with preloading indicator when isPreloading is false', () => {
    render(<PreloadProgress current={5} total={10} isVisible={true} isPreloading={false} />);

    expect(screen.getByText('Preloading cards for offline use...')).toBeInTheDocument();
  });

  it('displays correct progress text', () => {
    render(<PreloadProgress current={3} total={7} isVisible={true} isPreloading={true} />);

    expect(screen.getByText('3/7')).toBeInTheDocument();
  });

  it('calculates progress bar width correctly', () => {
    render(<PreloadProgress current={2} total={4} isVisible={true} isPreloading={true} />);

    const progressBar = screen.getByText('2/4').previousElementSibling?.firstElementChild;
    expect(progressBar).toHaveStyle({ width: '50%' });
  });

  it('shows 0% progress when current is 0', () => {
    render(<PreloadProgress current={0} total={5} isVisible={true} isPreloading={true} />);

    const progressBar = screen.getByText('0/5').previousElementSibling?.firstElementChild;
    expect(progressBar).toHaveStyle({ width: '0%' });
  });

  it('shows 100% progress when current equals total', () => {
    render(<PreloadProgress current={10} total={10} isVisible={true} isPreloading={true} />);

    const progressBar = screen.getByText('10/10').previousElementSibling?.firstElementChild;
    expect(progressBar).toHaveStyle({ width: '100%' });
  });

  it('handles edge case where total is 0', () => {
    render(<PreloadProgress current={0} total={0} isVisible={true} isPreloading={true} />);

    const progressBar = screen.getByText('0/0').previousElementSibling?.firstElementChild;
    expect(progressBar).toHaveStyle({ width: '0%' });
  });

  it('applies correct CSS classes', () => {
    const { container } = render(<PreloadProgress current={1} total={2} isVisible={true} isPreloading={true} />);

    expect(container.firstChild).toHaveClass('fixed', 'top-4', 'left-1/2', 'transform', '-translate-x-1/2', 'z-50', 'bg-white/90', 'backdrop-blur-sm', 'rounded-lg', 'shadow-lg', 'px-4', 'py-2', 'border', 'border-gray-200');
    const progressBar = screen.getByText('1/2').previousElementSibling?.firstElementChild;
    expect(progressBar).toHaveClass('h-full', 'bg-green-500', 'transition-all', 'duration-300', 'ease-out');
  });

  it('renders all required elements', () => {
    render(<PreloadProgress current={1} total={3} isVisible={true} isPreloading={false} />);

    expect(screen.getByText('Preloading cards for offline use...')).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
    const progressBar = screen.getByText('1/3').previousElementSibling?.firstElementChild;
    expect(progressBar).toBeInTheDocument();
  });

  it('handles large numbers correctly', () => {
    render(<PreloadProgress current={500} total={1000} isVisible={true} isPreloading={true} />);

    expect(screen.getByText('500/1000')).toBeInTheDocument();
    const progressBar = screen.getByText('500/1000').previousElementSibling?.firstElementChild;
    expect(progressBar).toHaveStyle({ width: '50%' });
  });

  it('validates prop types implicitly through TypeScript', () => {
    // This test ensures the component accepts the expected prop types
    expect(() => render(<PreloadProgress current={1} total={2} isVisible={true} isPreloading={false} />)).not.toThrow();
  });

  it('progress bar width matches progress value', () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 1 }), (progress) => {
        const { container } = render(<PreloadProgress current={progress * 100} total={100} isVisible={true} isPreloading={true} />);
        const progressBar = container.querySelector('.bg-green-500');
        expect(progressBar).toHaveStyle({ width: `${progress * 100}%` });
      })
    );
  });
});