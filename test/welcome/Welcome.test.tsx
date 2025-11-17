import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Welcome } from '../../app/welcome/welcome';

describe('Welcome', () => {
  it('renders the main welcome layout', () => {
    render(<Welcome />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText("What's next?")).toBeInTheDocument();
  });

  it('renders both light and dark logos', () => {
    render(<Welcome />);

    const logos = screen.getAllByAltText('React Router');
    expect(logos).toHaveLength(2);

    const lightLogo = logos.find(logo => logo.classList.contains('dark:hidden'));
    const darkLogo = logos.find(logo => logo.classList.contains('dark:block'));

    expect(lightLogo).toHaveAttribute('src', expect.stringContaining('logo-light.svg'));
    expect(lightLogo).toHaveClass('block', 'w-full', 'dark:hidden');

    expect(darkLogo).toHaveAttribute('src', expect.stringContaining('logo-dark.svg'));
    expect(darkLogo).toHaveClass('hidden', 'w-full', 'dark:block');
  });

  it('renders navigation links correctly', () => {
    render(<Welcome />);

    expect(screen.getByText('React Router Docs')).toBeInTheDocument();
    expect(screen.getByText('Join Discord')).toBeInTheDocument();
  });

  it('renders links with correct href attributes', () => {
    render(<Welcome />);

    const docsLink = screen.getByText('React Router Docs').closest('a');
    expect(docsLink).toHaveAttribute('href', 'https://reactrouter.com/docs');

    const discordLink = screen.getByText('Join Discord').closest('a');
    expect(discordLink).toHaveAttribute('href', 'https://rmx.as/discord');
  });

  it('renders SVG icons for each resource', () => {
    render(<Welcome />);

    const svgs = document.querySelectorAll('svg');
    expect(svgs).toHaveLength(2); // Two SVG icons
  });

  it('applies correct CSS classes to navigation', () => {
    const { container } = render(<Welcome />);

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('rounded-3xl', 'border', 'border-gray-200', 'p-6', 'dark:border-gray-700', 'space-y-4');
  });

  it('applies correct CSS classes to links', () => {
    render(<Welcome />);

    const links = screen.getAllByRole('link');
    links.forEach(link => {
      expect(link).toHaveClass('group', 'flex', 'items-center', 'gap-3', 'self-stretch', 'p-3', 'leading-normal', 'text-blue-700', 'hover:underline', 'dark:text-blue-500');
    });
  });

  it('applies correct CSS classes to icons', () => {
    render(<Welcome />);

    const svgs = document.querySelectorAll('svg');
    svgs.forEach(svg => {
      expect(svg).toHaveClass('stroke-gray-600', 'group-hover:stroke-current', 'dark:stroke-gray-300');
    });
  });

  it('renders the main container with correct classes', () => {
    const { container } = render(<Welcome />);

    const mainContainer = container.querySelector('.flex.items-center.justify-center.pt-16.pb-4');
    expect(mainContainer).toBeInTheDocument();

    const innerContainer = mainContainer?.querySelector('.flex-1.flex.flex-col.items-center.gap-16.min-h-0');
    expect(innerContainer).toBeInTheDocument();
  });

  it('renders header with correct structure', () => {
    render(<Welcome />);

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('flex', 'flex-col', 'items-center', 'gap-9');

    const logoContainer = header.querySelector('.w-\\[500px\\].max-w-\\[100vw\\].p-4');
    expect(logoContainer).toBeInTheDocument();
  });

  it('renders navigation section with correct responsive classes', () => {
    render(<Welcome />);

    const navSection = screen.getByText("What's next?").parentElement?.parentElement;
    expect(navSection).toHaveClass('max-w-[300px]', 'w-full', 'space-y-6', 'px-4');
  });

  it('ensures links open in new tab with security attributes', () => {
    render(<Welcome />);

    const links = screen.getAllByRole('link');
    links.forEach(link => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noreferrer');
    });
  });
});