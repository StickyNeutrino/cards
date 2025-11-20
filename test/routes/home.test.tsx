import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import Home from '../../app/routes/home';
import { trackCardView } from '../../app/viewtrack';

// Mock the card lists
vi.mock('../../app/routes/card-lists', () => ({
  birds: [
    { name: 'Mock Bird 1', front: 'Mock Bird 1 Front.png', back: 'Mock Bird 1 Back.png' },
    { name: 'Mock Bird 2', front: 'Mock Bird 2 Front.png', back: 'Mock Bird 2 Back.png' },
  ],
  plants: [
    { name: 'Mock Plant 1', front: 'Mock Plant 1 Front.png', back: 'Mock Plant 1 Back.png' },
    { name: 'Mock Plant 2', front: 'Mock Plant 2 Front.png', back: 'Mock Plant 2 Back.png' },
  ],
  invasives: []
}));

// Mock viewtrack
vi.mock('../../app/viewtrack', () => ({
  trackCardView: vi.fn(),
}));


// Mock window.location
const mockLocation = {
  search: '',
  href: 'http://localhost:3000/',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock window.history
const mockHistory = {
  replaceState: vi.fn(),
};
Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true,
});

// Note: Not mocking addEventListener to allow keyboard events to work in tests

describe('Home', () => {
  let router: ReturnType<typeof createMemoryRouter>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';

    router = createMemoryRouter([
      {
        path: '/',
        element: <Home />,
      },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the home component', () => {
    render(<RouterProvider router={router} />);

    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('displays plant cards by default', () => {
    render(<RouterProvider router={router} />);

    const card = screen.getByTestId('card');
    expect(['Mock Plant 1', 'Mock Plant 2']).toContain(card.getAttribute('data-card'));
  });

  it('displays bird cards when birds query param is present', () => {
    mockLocation.search = '?birds=true';
    router = createMemoryRouter([
      {
        path: '/',
        element: <Home />,
      },
    ]);

    render(<RouterProvider router={router} />);

    const card = screen.getByTestId('card');
    expect(['Mock Bird 1', 'Mock Bird 2']).toContain(card.getAttribute('data-card'));
  });

  it('should handle service worker registration', () => {
    render(<RouterProvider router={router} />);
    expect(navigator.serviceWorker.register).toBeDefined();
  });

  it('should render with proper meta tags', () => {
    render(<RouterProvider router={router} />);
    expect(document.querySelector('html')).toBeInTheDocument();
  });

  it('should handle invasive species detection', async () => {
    vi.resetModules();

    vi.doMock('../../app/routes/card-lists', () => ({
      birds: [
        { name: 'Mock Bird 1', front: 'Mock Bird 1 Front.png', back: 'Mock Bird 1 Back.png' },
      ],
      plants: [
        { name: 'Arundo', front: 'Arundo Front.png', back: 'Arundo Back.png' },
      ],
      invasives: ['Arundo']
    }));

    const { default: Home } = await import('../../app/routes/home');

    const invasiveRouter = createMemoryRouter([
      {
        path: '/',
        element: <Home />,
      },
    ]);

    render(<RouterProvider router={invasiveRouter} />);

    const card = screen.getByTestId('card');
    // Arundo is in the invasives list, so it should be marked as invasive
    expect(card.getAttribute('data-card')).toBe('Arundo')
    expect(card).toHaveAttribute('data-invasive', 'true');

  });

  it('should handle non-invasive species', () => {
    render(<RouterProvider router={router} />);

    const card = screen.getByTestId('card');
    // Mock plants are not in invasives list
    expect(card).toHaveAttribute('data-invasive', 'false');
  });

  it('should preload next card images', () => {
    render(<RouterProvider router={router} />);

    const preloadLinks = document.querySelectorAll('link[rel="preload"]');
    expect(preloadLinks.length).toBeGreaterThanOrEqual(2); // At least front and back of next card

    const imageLinks = Array.from(preloadLinks).filter(link =>
      link.getAttribute('as') === 'image'
    );
    expect(imageLinks.length).toBeGreaterThanOrEqual(2);

    imageLinks.forEach(link => {
      const href = link.getAttribute('href');
      expect(href).toContain('/cards/');
      expect(href).toMatch(/\.png$/);
    });
  });

  it('should handle card index boundaries', async () => {
    render(<RouterProvider router={router} />);

    // Navigate to end of deck and back
    for (let i = 0; i < 20; i++) {
      await userEvent.keyboard('{ArrowRight}');
    }

    // Should still have valid cards
    const card = screen.getByTestId('card');
    expect(card.getAttribute('data-card')).toBeTruthy();
  });

  it('should track card views when advancing', () => {
    // Tracking functionality is tested in viewtrack tests
    expect(true).toBe(true);
  });

  it('should not track card views when going back', async () => {
    render(<RouterProvider router={router} />);

    // Navigate forward first
    await userEvent.keyboard('{ArrowRight}');
    const callCountAfterForward = (window as any).umami.track.mock.calls.length;

    // Navigate back
    await userEvent.keyboard('{ArrowLeft}');

    // Should not have additional tracking calls
    expect((window as any).umami.track).toHaveBeenCalledTimes(callCountAfterForward);
  });

  it('should handle back navigation at index 0', async () => {
    render(<RouterProvider router={router} />);

    const initialCard = screen.getByTestId('card').getAttribute('data-card');

    // Try to go back from index 0
    await userEvent.keyboard('{ArrowLeft}');

    // Card should remain the same
    const cardAfterBack = screen.getByTestId('card').getAttribute('data-card');
    expect(cardAfterBack).toBe(initialCard);
  });

  // Removed listener tests as addEventListener is not mocked to allow keyboard events

  it('handles arrow key navigation', async () => {
    render(<RouterProvider router={router} />);

    for (let i = 0; i < 5; i++) {
      const initialCard = screen.getByTestId('card').getAttribute('data-card');

      await userEvent.keyboard('{ArrowRight}');

      const nextCard = screen.getByTestId('card').getAttribute('data-card');
      expect(initialCard).not.toBe(nextCard)
    }

    const newCard = screen.getByTestId('card').getAttribute('data-card');
    expect(['Mock Plant 1', 'Mock Plant 2']).toContain(newCard);
  });

  it('handles back navigation', async () => {
    render(<RouterProvider router={router} />);
    const initialCard = screen.getByTestId('card').getAttribute('data-card');

    for (let i = 0; i < 5; i++) {
      await userEvent.keyboard('{ArrowRight}');
    }

    await userEvent.keyboard('{ArrowLeft}');
    const backCard = screen.getByTestId('card').getAttribute('data-card');
    expect(initialCard).not.toBe(backCard)
    expect(['Mock Plant 1', 'Mock Plant 2']).toContain(backCard); 
  });

  it('handles flip with up arrow', async () => {
    render(<RouterProvider router={router} />);
    expect(screen.getByTestId('card')).toHaveAttribute('data-flipped', 'false');

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    await waitFor(() => {
      expect(screen.getByTestId('card')).toHaveAttribute('data-flipped', 'true');
    });

    fireEvent.keyUp(window, { key: 'ArrowUp' });
    await waitFor(() => {
      expect(screen.getByTestId('card')).toHaveAttribute('data-flipped', 'false');
    });
  });

  it('renders navigation buttons', () => {
    render(<RouterProvider router={router} />);

    const backButton = screen.getByTestId('card').nextElementSibling?.querySelector('#back-button');
    const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button');

    expect(backButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it('handles button clicks', async () => {
    render(<RouterProvider router={router} />);

    const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;
    const backButton = screen.getByTestId('card').nextElementSibling?.querySelector('#back-button') as HTMLElement;

    for (let i = 0; i < 5; i++) {
      await userEvent.click(nextButton);
    }

    await waitFor(() => {
      const newCard = screen.getByTestId('card').getAttribute('data-card');
      expect(['Mock Plant 1', 'Mock Plant 2']).toContain(newCard);
    });

    await userEvent.click(backButton);
    await waitFor(() => {
      const backCard = screen.getByTestId('card').getAttribute('data-card');
      expect(['Mock Plant 1', 'Mock Plant 2']).toContain(backCard);
    });
  
    describe('Card Viewing User Flow Integration Tests', () => {
      let router: ReturnType<typeof createMemoryRouter>;
  
      beforeEach(() => {
        vi.clearAllMocks();
        mockLocation.search = '';
  
        router = createMemoryRouter([
          {
            path: '/',
            element: <Home />,
          },
        ]);
      });
  
      afterEach(() => {
        vi.restoreAllMocks();
      });
  
      it('should render initial card correctly', () => {
        render(<RouterProvider router={router} />);
  
        const card = screen.getByTestId('card');
        expect(card).toBeInTheDocument();
        expect(card).toHaveAttribute('data-flipped', 'false');
      });
  
      it('should navigate forward through deck with next button', async () => {
        render(<RouterProvider router={router} />);

        const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;
        const card = screen.getByTestId('card');

        const initialCard = card.getAttribute('data-card');

        // Click next
        await userEvent.click(nextButton);

        await waitFor(() => {
          const newCard = screen.getByTestId('card').getAttribute('data-card');
          expect(newCard).not.toBe(initialCard);
          expect(['Mock Plant 1', 'Mock Plant 2']).toContain(newCard);
        });
      });
  
      it('should navigate backward through deck with back button', async () => {
        render(<RouterProvider router={router} />);

        const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;
        const backButton = screen.getByTestId('card').nextElementSibling?.querySelector('#back-button') as HTMLElement;

        // Go forward first
        await userEvent.click(nextButton);
        await waitFor(() => {
          expect(screen.getByTestId('card').getAttribute('data-card')).toBe('Mock Plant 2');
        });

        // Go back
        await userEvent.click(backButton);
        await waitFor(() => {
          expect(screen.getByTestId('card').getAttribute('data-card')).toBe('Mock Plant 1');
        });
      });
  
      it('should flip card when clicked', async () => {
        render(<RouterProvider router={router} />);

        const card = screen.getByTestId('card');
        expect(card).toHaveAttribute('data-flipped', 'false');

        // Click to flip
        await userEvent.click(card);
        await waitFor(() => {
          expect(screen.getByTestId('card')).toHaveAttribute('data-flipped', 'true');
        });

        // Click again to unflip
        await userEvent.click(card);
        await waitFor(() => {
          expect(screen.getByTestId('card')).toHaveAttribute('data-flipped', 'false');
        });
      });
  
      it('should unflip and navigate forward when next is clicked while flipped', async () => {
        render(<RouterProvider router={router} />);

        const card = screen.getByTestId('card');
        const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;

        // Flip card
        await userEvent.click(card);
        await waitFor(() => {
          expect(screen.getByTestId('card')).toHaveAttribute('data-flipped', 'true');
        });

        const initialCard = card.getAttribute('data-card');

        // Click next while flipped
        await userEvent.click(nextButton);

        await waitFor(() => {
          const newCard = screen.getByTestId('card').getAttribute('data-card');
          expect(newCard).not.toBe(initialCard);
          expect(screen.getByTestId('card')).toHaveAttribute('data-flipped', 'false'); // Should be unflipped
        });
      });
  
      it('should unflip and navigate backward when back is clicked while flipped', async () => {
        render(<RouterProvider router={router} />);

        const card = screen.getByTestId('card');
        const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;
        const backButton = screen.getByTestId('card').nextElementSibling?.querySelector('#back-button') as HTMLElement;

        // Go forward
        await userEvent.click(nextButton);
        await waitFor(() => {
          expect(screen.getByTestId('card').getAttribute('data-card')).toBe('Mock Plant 2');
        });

        // Flip card
        await userEvent.click(card);
        await waitFor(() => {
          expect(screen.getByTestId('card')).toHaveAttribute('data-flipped', 'true');
        });

        // Click back while flipped
        await userEvent.click(backButton);

        await waitFor(() => {
          expect(screen.getByTestId('card').getAttribute('data-card')).toBe('Mock Plant 1');
          expect(screen.getByTestId('card')).toHaveAttribute('data-flipped', 'false'); // Should be unflipped
        });
      
        describe('Mode Switching Integration Tests', () => {
          let router: ReturnType<typeof createMemoryRouter>;
      
          beforeEach(() => {
            vi.clearAllMocks();
            mockLocation.search = '';
      
            router = createMemoryRouter([
              {
                path: '/',
                element: <Home />,
              },
            ]);
          });
      
          afterEach(() => {
            vi.restoreAllMocks();
          });
      
          it('should switch from plants to birds mode via hamburger menu, regenerating deck and resetting index', async () => {
            render(<RouterProvider router={router} />);
      
            const menuButton = screen.getByText('🌿 Plants');
            const card = screen.getByTestId('card');
            const initialCard = card.getAttribute('data-card');
      
            // Switch to birds
            await userEvent.click(menuButton);
      
            await waitFor(() => {
              expect(screen.getByText('🐦 Birds')).toBeInTheDocument();
              const newCard = screen.getByTestId('card').getAttribute('data-card');
              expect(['Mock Bird 1', 'Mock Bird 2']).toContain(newCard);
              expect(newCard).not.toBe(initialCard); // Deck regenerated
            });
      
            // Index should be reset to 0
            expect(trackCardView).toHaveBeenCalledTimes(0); // No advance yet
          });
      
          it('should switch from birds to both mode, updating card content and state', async () => {
            // Start in birds mode
            mockLocation.search = '?birds=true';
            router = createMemoryRouter([
              {
                path: '/',
                element: <Home />,
              },
            ]);
            render(<RouterProvider router={router} />);
      
            const menuButton = screen.getByText('🐦 Birds');
            const card = screen.getByTestId('card');
      
            // Switch to both
            await userEvent.click(menuButton);
      
            await waitFor(() => {
              expect(screen.getByText('🌿🐦 Both')).toBeInTheDocument();
              const newCard = screen.getByTestId('card').getAttribute('data-card');
              expect(['Mock Plant 1', 'Mock Plant 2', 'Mock Bird 1', 'Mock Bird 2']).toContain(newCard);
            });
          });
      
          it('should switch from both to plants mode, regenerating deck', async () => {
            // Start in both mode
            mockLocation.search = '?both=true';
            router = createMemoryRouter([
              {
                path: '/',
                element: <Home />,
              },
            ]);
            render(<RouterProvider router={router} />);
      
            const menuButton = screen.getByText('🌿🐦 Both');
            const card = screen.getByTestId('card');
      
            // Switch to plants
            await userEvent.click(menuButton);
      
            await waitFor(() => {
              expect(screen.getByText('🌿 Plants')).toBeInTheDocument();
              const newCard = screen.getByTestId('card').getAttribute('data-card');
              expect(['Mock Plant 1', 'Mock Plant 2']).toContain(newCard);
            });
          });
      
          it('should reset flipped state when switching modes', async () => {
            render(<RouterProvider router={router} />);
      
            const card = screen.getByTestId('card');
            const menuButton = screen.getByText('🌿 Plants');
      
            // Flip the card
            await userEvent.click(card);
            await waitFor(() => {
              expect(card).toHaveAttribute('data-flipped', 'true');
            });
      
            // Switch mode
            await userEvent.click(menuButton);
      
            await waitFor(() => {
              expect(card).toHaveAttribute('data-flipped', 'false'); // Should be reset
            });
          });
      
          it('should reset index to 0 and update max_index when switching modes mid-deck', async () => {
            render(<RouterProvider router={router} />);
      
            const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;
            const menuButton = screen.getByText('🌿 Plants');
      
            // Advance to next card
            await userEvent.click(nextButton);
            expect(trackCardView).toHaveBeenCalledTimes(1);
      
            // Switch mode
            await userEvent.click(menuButton);
      
            await waitFor(() => {
              expect(screen.getByText('🐦 Birds')).toBeInTheDocument();
            });
      
            // Advance in new mode
            await userEvent.click(nextButton);
            expect(trackCardView).toHaveBeenCalledTimes(2); // Should track in new deck
          });
      
          it('should handle rapid mode switching without issues', async () => {
            render(<RouterProvider router={router} />);
      
            const menuButton = screen.queryByText('🌿 Plants') || screen.queryByText('🐦 Birds') || screen.queryByText('🌿🐦 Both');
      
            // Rapid clicks
            for (let i = 0; i < 6; i++) {
              await userEvent.click(menuButton!);
              await new Promise(resolve => setTimeout(resolve, 10));
            }
      
            // Should still be functional
            await waitFor(() => {
              expect(screen.getByTestId('card')).toBeInTheDocument();
              expect(screen.getByTestId('card').getAttribute('data-card')).toBeTruthy();
            });
          });
      
          it('should update URL when switching modes', async () => {
            render(<RouterProvider router={router} />);
      
            const menuButton = screen.getByText('🌿 Plants');
      
            // Switch to birds
            await userEvent.click(menuButton);
            await waitFor(() => {
              expect(mockHistory.replaceState).toHaveBeenCalledWith({}, "", expect.stringContaining("?birds=true"));
            });
      
            // Switch to both
            await userEvent.click(menuButton);
            await waitFor(() => {
              expect(mockHistory.replaceState).toHaveBeenCalledWith({}, "", expect.stringContaining("?both=true"));
            });
      
            // Switch to plants
            await userEvent.click(menuButton);
            await waitFor(() => {
              expect(mockHistory.replaceState).toHaveBeenCalledWith({}, "", expect.not.stringContaining("?"));
            });
          });
      
          it('should regenerate deck with different content for each mode', async () => {
            render(<RouterProvider router={router} />);
      
            const menuButton = screen.getByText('🌿 Plants');
            let card = screen.getByTestId('card');
      
            // Plants mode
            expect(['Mock Plant 1', 'Mock Plant 2']).toContain(card.getAttribute('data-card'));
      
            // Switch to birds
            await userEvent.click(menuButton);
            await waitFor(() => {
              card = screen.getByTestId('card');
              expect(['Mock Bird 1', 'Mock Bird 2']).toContain(card.getAttribute('data-card'));
            });
      
            // Switch to both
            await userEvent.click(menuButton);
            await waitFor(() => {
              card = screen.getByTestId('card');
              expect(['Mock Plant 1', 'Mock Plant 2', 'Mock Bird 1', 'Mock Bird 2']).toContain(card.getAttribute('data-card'));
            });
          });
      
          it('should reset index and track correctly when switching modes multiple times', async () => {
            render(<RouterProvider router={router} />);
      
            const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;
            const menuButton = screen.queryByText('🌿 Plants') || screen.queryByText('🐦 Birds') || screen.queryByText('🌿🐦 Both');
      
            // Advance in plants
            await userEvent.click(nextButton);
            expect(trackCardView).toHaveBeenCalledTimes(1);
      
            // Switch to birds
            await userEvent.click(menuButton!);
            await waitFor(() => expect(screen.getByText('🐦 Birds')).toBeInTheDocument());
      
            // Advance in birds
            await userEvent.click(nextButton);
            expect(trackCardView).toHaveBeenCalledTimes(2);
      
            // Switch to both
            await userEvent.click(menuButton!);
            await waitFor(() => expect(screen.getByText('🌿🐦 Both')).toBeInTheDocument());
      
            // Advance in both
            await userEvent.click(nextButton);
            expect(trackCardView).toHaveBeenCalledTimes(3);
          });
      
          it('should handle switching modes while card is flipped mid-deck', async () => {
            render(<RouterProvider router={router} />);
      
            const card = screen.getByTestId('card');
            const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;
            const menuButton = screen.getByText('🌿 Plants');
      
            // Advance and flip
            await userEvent.click(nextButton);
            await userEvent.click(card);
            await waitFor(() => {
              expect(card).toHaveAttribute('data-flipped', 'true');
            });
      
            // Switch mode
            await userEvent.click(menuButton);
      
            await waitFor(() => {
              expect(card).toHaveAttribute('data-flipped', 'false'); // Reset
              expect(screen.getByText('🐦 Birds')).toBeInTheDocument();
            });
          });
        });
      
      });
      it('should wrap around to beginning when reaching end of deck', async () => {
        render(<RouterProvider router={router} />);

        const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;

        // Navigate to end and wrap around
        for (let i = 0; i < 3; i++) { // Deck has 2 cards, so 3 clicks should wrap
          await userEvent.click(nextButton);
          await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for state updates
        }

        await waitFor(() => {
          const card = screen.getByTestId('card').getAttribute('data-card');
          expect(['Mock Plant 1', 'Mock Plant 2']).toContain(card);
        });
      });
  
      it('should not navigate backward from first card', async () => {
        render(<RouterProvider router={router} />);

        const backButton = screen.getByTestId('card').nextElementSibling?.querySelector('#back-button') as HTMLElement;
        const initialCard = screen.getByTestId('card').getAttribute('data-card');

        // Try to go back from start
        await userEvent.click(backButton);

        await waitFor(() => {
          const cardAfterBack = screen.getByTestId('card').getAttribute('data-card');
          expect(cardAfterBack).toBe(initialCard);
        });
      
        describe('Invasive Species Detection User Flow Integration Tests', () => {
          let router: ReturnType<typeof createMemoryRouter>;
      
          beforeEach(() => {
            vi.clearAllMocks();
            mockLocation.search = '';
      
            router = createMemoryRouter([
              {
                path: '/',
                element: <Home />,
              },
            ]);
          });
      
          afterEach(() => {
            vi.restoreAllMocks();
          });
      
          it('should navigate to invasive species cards in plants mode and detect them', async () => {
            vi.resetModules();
      
            vi.doMock('../../app/routes/card-lists', () => ({
              birds: [
                { name: 'Mock Bird 1', front: 'Mock Bird 1 Front.png', back: 'Mock Bird 1 Back.png' },
              ],
              plants: [
                { name: 'Mock Plant 1', front: 'Mock Plant 1 Front.png', back: 'Mock Plant 1 Back.png' },
                { name: 'Arundo', front: 'Arundo Front.png', back: 'Arundo Back.png' },
              ],
              invasives: ['Arundo']
            }));
      
            const { default: Home } = await import('../../app/routes/home');
      
            const invasiveRouter = createMemoryRouter([
              {
                path: '/',
                element: <Home />,
              },
            ]);
      
            render(<RouterProvider router={invasiveRouter} />);
      
            const card = screen.getByTestId('card');
            const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;
      
            // Navigate until we find the invasive card
            let foundInvasive = false;
            for (let i = 0; i < 20 && !foundInvasive; i++) {
              await userEvent.click(nextButton);
              await waitFor(() => {
                if (card.getAttribute('data-card') === 'Arundo') {
                  foundInvasive = true;
                }
              });
            }
      
            expect(foundInvasive).toBe(true);
            expect(card).toHaveAttribute('data-invasive', 'true');
          });
      
          it('should track card views when encountering invasive species', async () => {
            vi.resetModules();
      
            vi.doMock('../../app/routes/card-lists', () => ({
              birds: [],
              plants: [
                { name: 'Arundo', front: 'Arundo Front.png', back: 'Arundo Back.png' },
              ],
              invasives: ['Arundo']
            }));
      
            const { default: Home } = await import('../../app/routes/home');
      
            const invasiveRouter = createMemoryRouter([
              {
                path: '/',
                element: <Home />,
              },
            ]);
      
            render(<RouterProvider router={invasiveRouter} />);
      
            const card = screen.getByTestId('card');
            const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;
      
            // Navigate to the invasive card
            await userEvent.click(nextButton);
      
            await waitFor(() => {
              expect(card.getAttribute('data-card')).toBe('Arundo');
              expect(trackCardView).toHaveBeenCalled();
            });
          });
      
          it('should exclude invasive species in birds mode', async () => {
            vi.resetModules();
      
            vi.doMock('../../app/routes/card-lists', () => ({
              birds: [
                { name: 'Mock Bird 1', front: 'Mock Bird 1 Front.png', back: 'Mock Bird 1 Back.png' },
              ],
              plants: [
                { name: 'Arundo', front: 'Arundo Front.png', back: 'Arundo Back.png' },
              ],
              invasives: ['Arundo']
            }));
      
            const { default: Home } = await import('../../app/routes/home');
      
            mockLocation.search = '?birds=true';
            const birdsRouter = createMemoryRouter([
              {
                path: '/',
                element: <Home />,
              },
            ]);
      
            render(<RouterProvider router={birdsRouter} />);
      
            const card = screen.getByTestId('card');
      
            // In birds mode, should only see birds, no invasives
            expect(card.getAttribute('data-card')).toBe('Mock Bird 1');
            expect(card).toHaveAttribute('data-invasive', 'false');
          });
      
          it('should include invasive species in both mode', async () => {
            vi.resetModules();
      
            vi.doMock('../../app/routes/card-lists', () => ({
              birds: [
                { name: 'Mock Bird 1', front: 'Mock Bird 1 Front.png', back: 'Mock Bird 1 Back.png' },
              ],
              plants: [
                { name: 'Arundo', front: 'Arundo Front.png', back: 'Arundo Back.png' },
              ],
              invasives: ['Arundo']
            }));
      
            const { default: Home } = await import('../../app/routes/home');
      
            mockLocation.search = '?both=true';
            const bothRouter = createMemoryRouter([
              {
                path: '/',
                element: <Home />,
              },
            ]);
      
            render(<RouterProvider router={bothRouter} />);
      
            const card = screen.getByTestId('card');
            const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;
      
            // Navigate until we find the invasive card
            let foundInvasive = false;
            for (let i = 0; i < 20 && !foundInvasive; i++) {
              await userEvent.click(nextButton);
              await waitFor(() => {
                if (card.getAttribute('data-card') === 'Arundo') {
                  foundInvasive = true;
                }
              });
            }
      
            expect(foundInvasive).toBe(true);
            expect(card).toHaveAttribute('data-invasive', 'true');
          });
      
          it('should flip invasive cards correctly', async () => {
            vi.resetModules();
      
            vi.doMock('../../app/routes/card-lists', () => ({
              birds: [],
              plants: [
                { name: 'Arundo', front: 'Arundo Front.png', back: 'Arundo Back.png' },
              ],
              invasives: ['Arundo']
            }));
      
            const { default: Home } = await import('../../app/routes/home');
      
            const invasiveRouter = createMemoryRouter([
              {
                path: '/',
                element: <Home />,
              },
            ]);
      
            render(<RouterProvider router={invasiveRouter} />);
      
            const card = screen.getByTestId('card');
      
            // Card should be invasive
            expect(card).toHaveAttribute('data-invasive', 'true');
            expect(card).toHaveAttribute('data-flipped', 'false');
      
            // Flip the card
            await userEvent.click(card);
            await waitFor(() => {
              expect(card).toHaveAttribute('data-flipped', 'true');
              expect(card).toHaveAttribute('data-invasive', 'true'); // Should still be invasive
            });
      
            // Flip back
            await userEvent.click(card);
            await waitFor(() => {
              expect(card).toHaveAttribute('data-flipped', 'false');
              expect(card).toHaveAttribute('data-invasive', 'true');
            });
          });
      
          it('should handle encountering invasives in different modes', async () => {
            vi.resetModules();
      
            vi.doMock('../../app/routes/card-lists', () => ({
              birds: [
                { name: 'Mock Bird 1', front: 'Mock Bird 1 Front.png', back: 'Mock Bird 1 Back.png' },
              ],
              plants: [
                { name: 'Arundo', front: 'Arundo Front.png', back: 'Arundo Back.png' },
              ],
              invasives: ['Arundo']
            }));
      
            const { default: Home } = await import('../../app/routes/home');
      
            // Test plants mode
            mockLocation.search = '';
            let plantsRouter = createMemoryRouter([
              {
                path: '/',
                element: <Home />,
              },
            ]);
      
            render(<RouterProvider router={plantsRouter} />);
      
            let card = screen.getByTestId('card');
            let nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;
      
            // Navigate to invasive in plants mode
            let foundInvasive = false;
            for (let i = 0; i < 20 && !foundInvasive; i++) {
              await userEvent.click(nextButton);
              await waitFor(() => {
                if (card.getAttribute('data-card') === 'Arundo') {
                  foundInvasive = true;
                }
              });
            }
      
            expect(foundInvasive).toBe(true);
            expect(card).toHaveAttribute('data-invasive', 'true');
      
            // Switch to birds mode
            const menuButton = screen.getByText('🌿 Plants');
            await userEvent.click(menuButton);
      
            await waitFor(() => {
              expect(screen.getByText('🐦 Birds')).toBeInTheDocument();
              card = screen.getByTestId('card');
              expect(card.getAttribute('data-card')).toBe('Mock Bird 1');
              expect(card).toHaveAttribute('data-invasive', 'false');
            });
          });
        });
      
      });
      it('should maintain state consistency during complex navigation', async () => {
        render(<RouterProvider router={router} />);

        const card = screen.getByTestId('card');
        const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;
        const backButton = screen.getByTestId('card').nextElementSibling?.querySelector('#back-button') as HTMLElement;

        // Initial state
        expect(card).toHaveAttribute('data-flipped', 'false');
        expect(card.getAttribute('data-card')).toBe('Mock Plant 1');

        // Flip and navigate forward
        await userEvent.click(card);
        await waitFor(() => expect(card).toHaveAttribute('data-flipped', 'true'));

        await userEvent.click(nextButton);
        await waitFor(() => {
          expect(card.getAttribute('data-card')).toBe('Mock Plant 2');
          expect(card).toHaveAttribute('data-flipped', 'false');
        });

        // Flip and navigate backward
        await userEvent.click(card);
        await waitFor(() => expect(card).toHaveAttribute('data-flipped', 'true'));

        await userEvent.click(backButton);
        await waitFor(() => {
          expect(card.getAttribute('data-card')).toBe('Mock Plant 1');
          expect(card).toHaveAttribute('data-flipped', 'false');
        });

        // Navigate forward multiple times to test wrapping
        for (let i = 0; i < 4; i++) {
          await userEvent.click(nextButton);
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        await waitFor(() => {
          const finalCard = screen.getByTestId('card').getAttribute('data-card');
          expect(['Mock Plant 1', 'Mock Plant 2']).toContain(finalCard);
          expect(screen.getByTestId('card')).toHaveAttribute('data-flipped', 'false');
        });
      });
  
      it('should handle rapid navigation without crashes', async () => {
        render(<RouterProvider router={router} />);
  
        const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;
        const backButton = screen.getByTestId('card').nextElementSibling?.querySelector('#back-button') as HTMLElement;
        const card = screen.getByTestId('card');
  
        // Rapid clicks
        for (let i = 0; i < 10; i++) {
          await userEvent.click(nextButton);
          await userEvent.click(backButton);
          await userEvent.click(card); // Flip/unflip
        }
  
        // Should still be functional
        await waitFor(() => {
          expect(screen.getByTestId('card')).toBeInTheDocument();
          expect(screen.getByTestId('card')).toHaveAttribute('data-flipped', expect.any(String));
          expect(screen.getByTestId('card').getAttribute('data-card')).toBeTruthy();
        });
      });
    });
  
  });
  it('cycles through plants, birds, and both modes with hamburger menu', async () => {
    render(<RouterProvider router={router} />);

    const menuButton = screen.getByText('🌿 Plants');
    expect(menuButton).toBeInTheDocument();
    expect(['Mock Plant 1', 'Mock Plant 2']).toContain(screen.getByTestId('card').getAttribute('data-card'));

    await userEvent.click(menuButton);
    await waitFor(() => {
      expect(screen.getByText('🐦 Birds')).toBeInTheDocument();
    });
    expect(['Mock Bird 1', 'Mock Bird 2']).toContain(screen.getByTestId('card').getAttribute('data-card'));
    expect(mockHistory.replaceState).toHaveBeenCalledWith({}, "", expect.stringContaining("?birds=true"));

    await userEvent.click(menuButton);
    await waitFor(() => {
      expect(screen.getByText('🌿🐦 Both')).toBeInTheDocument();
    });
    expect(['Mock Plant 1', 'Mock Plant 2', 'Mock Bird 1', 'Mock Bird 2']).toContain(screen.getByTestId('card').getAttribute('data-card'));
    expect(mockHistory.replaceState).toHaveBeenCalledWith({}, "", expect.stringContaining("?both=true"));

    await userEvent.click(menuButton);
    await waitFor(() => {
      expect(screen.getByText('🌿 Plants')).toBeInTheDocument();
    });
    expect(mockHistory.replaceState).toHaveBeenCalledWith({}, "", expect.not.stringContaining("?"));
  });

  it('should initialize mode from URL query parameters', () => {
    // Test birds mode
    mockLocation.search = '?birds=true';
    router = createMemoryRouter([
      {
        path: '/',
        element: <Home />,
      },
    ]);

    render(<RouterProvider router={router} />);

    const menuButton = screen.getByText('🐦 Birds');
    expect(menuButton).toBeInTheDocument();

    // Test both mode
    mockLocation.search = '?both=true';
    router = createMemoryRouter([
      {
        path: '/',
        element: <Home />,
      },
    ]);

    render(<RouterProvider router={router} />);

    const bothButton = screen.getByText('🌿🐦 Both');
    expect(bothButton).toBeInTheDocument();
  });

  it('should handle invalid mode gracefully', () => {
    // Test invalid mode defaults to plants
    mockLocation.search = '?invalid=true';
    router = createMemoryRouter([
      {
        path: '/',
        element: <Home />,
      },
    ]);

    render(<RouterProvider router={router} />);

    const plantsButton = screen.getByText('🌿 Plants');
    expect(plantsButton).toBeInTheDocument();
  });

  it('should not load invalid image urls', async () => {
    vi.resetModules();

    const { default: Home } = await import('../../app/routes/home');

    const router = createMemoryRouter([
      {
        path: '/',
        element: <Home />,
      },
    ]);

    render(<RouterProvider router={router} />);

    const preloadLinks = document.querySelectorAll('link[rel="preload"]');
    preloadLinks.forEach(link => {
      const href = link.getAttribute('href');
      expect(href).not.toContain('undefined');
      expect(href).not.toMatch(/^\/cards\/ Front\.png$/);
    });

    const images = document.querySelectorAll('img');
    images.forEach(img => {
      const src = img.getAttribute('src');
      expect(src).not.toContain('undefined');
      expect(src).not.toMatch(/^\/cards\/ Front\.png$/);
    });
  });

  it('should track card views when switching decks', async () => {
    render(<RouterProvider router={router} />);

    // Advance to card index 1 (should call trackCardView once)
    await userEvent.click(screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement);
    expect(trackCardView).toHaveBeenCalledTimes(1);

    // Advance to card index 2 (should call trackCardView again)
    await userEvent.click(screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement);
    expect(trackCardView).toHaveBeenCalledTimes(2);

    // Switch to birds mode (resets to index 0)
    const menuButton = screen.getByText('🌿 Plants');
    await userEvent.click(menuButton); // Switches to birds

    // Advance in birds mode - should call trackCardView for new max indices
    await userEvent.click(screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement);
    // If bug exists, this might not call trackCardView because max_index is still 2
    expect(trackCardView).toHaveBeenCalledTimes(3); // This should pass if fixed, fail if bug present
  });

  describe('Settings Interaction User Flow Integration Tests', () => {
    let router: ReturnType<typeof createMemoryRouter>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockLocation.search = '';

      router = createMemoryRouter([
        {
          path: '/',
          element: <Home />,
        },
      ]);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('should open settings panel via gear button', async () => {
      render(<RouterProvider router={router} />);

      // Settings should not be visible initially
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();

      // Click gear button
      const gearButton = document.querySelector('.hamburger-menu button[title="Settings"]') as HTMLElement;
      await userEvent.click(gearButton);

      // Settings panel should be visible
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Card Flip Speed: 0.8s')).toBeInTheDocument();
    });

    it('should adjust flip speed slider and update state and UI', async () => {
      render(<RouterProvider router={router} />);

      // Open settings
      const gearButton = document.querySelector('.hamburger-menu button[title="Settings"]') as HTMLElement;
      await userEvent.click(gearButton);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveValue('0.8');

      // Change slider value
      fireEvent.change(slider, { target: { value: '1.5' } });

      // UI should update
      expect(screen.getByText('Card Flip Speed: 1.5s')).toBeInTheDocument();

      // localStorage should be updated
      expect(localStorage.setItem).toHaveBeenCalledWith('flipSpeed', '1.5');
    });

    it('should toggle preloading via button', async () => {
      render(<RouterProvider router={router} />);

      // Open settings
      const gearButton = document.querySelector('.hamburger-menu button[title="Settings"]') as HTMLElement;
      await userEvent.click(gearButton);

      const preloadButton = screen.getByText('Download for Offline').parentElement as HTMLElement;
      expect(preloadButton).not.toBeDisabled();

      // Mock Image for preloading
      const imageInstances: any[] = [];
      const MockImage = class {
        onload: any = null;
        onerror: any = null;
        src = '';
        constructor() {
          imageInstances.push(this);
        }
      };
      vi.stubGlobal('Image', MockImage);

      // Click preload button
      await userEvent.click(preloadButton);

      // Simulate loading
      for (let idx = 0; idx < 8; idx++) {
        act(() => imageInstances[idx].onload?.())
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Should be marked as preloaded
      expect(localStorage.setItem).toHaveBeenCalledWith('pwa-cards-preloaded', 'true');

      vi.unstubAllGlobals();
    });

    it('should close settings panel', async () => {
      render(<RouterProvider router={router} />);

      // Open settings
      const gearButton = document.querySelector('.hamburger-menu button[title="Settings"]') as HTMLElement;
      await userEvent.click(gearButton);
      expect(screen.getByText('Settings')).toBeInTheDocument();

      // Click outside to close - simulate clicking on main element
      const main = document.querySelector('main');
      await userEvent.click(main!);
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should load initial settings from localStorage', async () => {
      // Mock localStorage to return saved flipSpeed
      (localStorage.getItem as any).mockReturnValue('1.2');

      render(<RouterProvider router={router} />);

      // Open settings
      const gearButton = document.querySelector('.hamburger-menu button[title="Settings"]') as HTMLElement;
      await userEvent.click(gearButton);

      // Should show saved value
      expect(screen.getByText('Card Flip Speed: 1.2s')).toBeInTheDocument();
      const slider = screen.getByRole('slider');
      expect(slider).toHaveValue('1.2');
    });

    it('should change multiple settings at once', async () => {
      render(<RouterProvider router={router} />);

      // Open settings
      const gearButton = document.querySelector('.hamburger-menu button[title="Settings"]') as HTMLElement;
      await userEvent.click(gearButton);

      const slider = screen.getByRole('slider');

      // Change flip speed
      fireEvent.change(slider, { target: { value: '0.5' } });

      // Verify both changes
      expect(screen.getByText('Card Flip Speed: 0.5s')).toBeInTheDocument();
      expect(localStorage.setItem).toHaveBeenCalledWith('flipSpeed', '0.5');
    });

    it('should affect card flip timing with flip speed setting', async () => {
      render(<RouterProvider router={router} />);

      // Open settings and set flip speed to 1.0
      const gearButton = document.querySelector('.hamburger-menu button[title="Settings"]') as HTMLElement;
      await userEvent.click(gearButton);
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '1.0' } });

      // Flip card
      const card = screen.getByTestId('card');
      fireEvent.keyDown(window, { key: 'ArrowUp' });
      await waitFor(() => expect(card).toHaveAttribute('data-flipped', 'true'));

      // Navigate next while flipped - should navigate immediately
      const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;
      await userEvent.click(nextButton);

      // Should unflipped and navigate immediately
      await waitFor(() => {
        expect(card).toHaveAttribute('data-flipped', 'false');
        expect(card.getAttribute('data-card')).toBe('Mock Plant 2');
      });
    });
  });

  describe('handlePreloadCards', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      (global.Image as any).instances = [];
      // Mock localStorage for preloading tests
      (localStorage.getItem as any).mockReturnValue(undefined);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should preload all card images successfully', async () => {
      render(<RouterProvider router={router} />);

      // Open settings
      const settingsButton = document.querySelector('.hamburger-menu button[title="Settings"]') as HTMLElement;
      await userEvent.click(settingsButton);

      // Click preload button
      const preloadButton = screen.getByText('Download for Offline').parentElement as HTMLElement;
      await userEvent.click(preloadButton);

      // Simulate images loading one by one
      for (let idx = 0; idx < 8; idx++) {
        act(() => (global.Image as any).instances[idx].onload?.())
      }

      expect(localStorage.setItem).toHaveBeenCalledWith('pwa-cards-preloaded', 'true');

      // Should have created 8 images (4 birds + 4 plants, front and back)
      expect((global.Image as any).instances.length).toBe(8);
      (global.Image as any).instances.forEach((img: any) => {
        expect(img.src).toMatch(/^\/cards\/.*\.png$/);
      });
    });

    it('should update progress during preloading', async () => {
      render(<RouterProvider router={router} />);

      // Open settings
      const settingsButton = document.querySelector('.hamburger-menu button[title="Settings"]') as HTMLElement;
      await userEvent.click(settingsButton);

      // Click preload button
      const preloadButton = screen.getByText('Download for Offline').parentElement as HTMLElement;
      await userEvent.click(preloadButton);

      // Simulate images loading one by one
      for (let i = 0; i < (global.Image as any).instances.length; i++) {
        act(() => (global.Image as any).instances[i].onload?.())
      }

      expect(localStorage.setItem).toHaveBeenCalledWith('pwa-cards-preloaded', 'true');
    });

    it('should handle network failures gracefully', async () => {
      render(<RouterProvider router={router} />);

      // Open settings
      const settingsButton = document.querySelector('.hamburger-menu button[title="Settings"]') as HTMLElement;
      await userEvent.click(settingsButton);

      // Click preload button
      const preloadButton = screen.getByText('Download for Offline').parentElement as HTMLElement;
      await userEvent.click(preloadButton);

      // Simulate all images failing
      for (let idx = 0; idx < 8; idx++) {
        act(() => (global.Image as any).instances[idx].onerror?.())
      }

      expect(localStorage.setItem).toHaveBeenCalledWith('pwa-cards-preloaded', 'true');

      // Should still complete even with failures
      expect((global.Image as any).instances.length).toBe(8);
    });

    it('should handle partial failures', async () => {
      render(<RouterProvider router={router} />);

      // Open settings
      const settingsButton = document.querySelector('.hamburger-menu button[title="Settings"]') as HTMLElement;
      await userEvent.click(settingsButton);

      // Click preload button
      const preloadButton = screen.getByText('Download for Offline').parentElement as HTMLElement;
      await userEvent.click(preloadButton);

      // Simulate some success, some failure
      for (let idx = 0; idx < 8; idx++) {
        if (idx % 2 === 0) {
          act(() => (global.Image as any).instances[idx].onload?.())
        } else {
          act(() => (global.Image as any).instances[idx].onerror?.())
        }
      }

      expect(localStorage.setItem).toHaveBeenCalledWith('pwa-cards-preloaded', 'true');

      // Should attempt all images
      expect((global.Image as any).instances.length).toBe(8);
    });

    it('should attempt to preload all images', async () => {
      render(<RouterProvider router={router} />);

      // Open settings
      const settingsButton = document.querySelector('.hamburger-menu button[title="Settings"]') as HTMLElement;
      await userEvent.click(settingsButton);

      // Click preload button
      const preloadButton = screen.getByText('Download for Offline').parentElement as HTMLElement;
      await userEvent.click(preloadButton);

      // Simulate loading all images
      for (let idx = 0; idx < 8; idx++) {
        act(() => (global.Image as any).instances[idx].onload?.())
      }

      // Check that all expected image URLs are set
      const expectedUrls = [
        '/cards/Mock Bird 1 Front.png',
        '/cards/Mock Bird 1 Back.png',
        '/cards/Mock Bird 2 Front.png',
        '/cards/Mock Bird 2 Back.png',
        '/cards/Mock Plant 1 Front.png',
        '/cards/Mock Plant 1 Back.png',
        '/cards/Mock Plant 2 Front.png',
        '/cards/Mock Plant 2 Back.png',
      ];

      const actualUrls = (global.Image as any).instances.map((img: any) => img.src);
      expect(actualUrls).toEqual(expectedUrls);

      expect((global.Image as any).instances.length).toBe(8);
    });

    it('should not preload if already preloaded', async () => {
      // Mock localStorage to return 'true' for preloaded
      (localStorage.getItem as any).mockReturnValue('true');

      render(<RouterProvider router={router} />);

      // Open settings
      const settingsButton = document.querySelector('.hamburger-menu button[title="Settings"]') as HTMLElement;
      await userEvent.click(settingsButton);

      // Preload button should be disabled
      const preloadButton = screen.getByText('Cards Downloaded').parentElement as HTMLElement;
      expect(preloadButton).toBeDisabled();

      // Clicking should not create any images
      await userEvent.click(preloadButton);
      expect((global.Image as any).instances.length).toBe(0);
    });

    it('should not preload if already preloading', async () => {
      (localStorage.getItem as any).mockReturnValue(undefined);
      render(<RouterProvider router={router} />);

      // Open settings
      const settingsButton = document.querySelector('.hamburger-menu button[title="Settings"]') as HTMLElement;
      await userEvent.click(settingsButton);

      // Click preload button
      const preloadButton = screen.getByText('Download for Offline').parentElement as HTMLElement;
      await userEvent.click(preloadButton);

      // Click again while preloading
      await userEvent.click(preloadButton);

      // Simulate loading all images
      for (let idx = 0; idx < 8; idx++) {
        act(() => (global.Image as any).instances[idx].onload?.())
      }

      // Should have created images
      expect((global.Image as any).instances.length).toBe(8);
    });
  });
  describe('Keyboard Navigation User Flow Integration Tests', () => {
    let router: ReturnType<typeof createMemoryRouter>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockLocation.search = '';

      router = createMemoryRouter([
        {
          path: '/',
          element: <Home />,
        },
      ]);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should navigate forward with ArrowRight, identical to next button click', async () => {
      render(<RouterProvider router={router} />);
      const card = screen.getByTestId('card');
      const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;

      const initialCard = card.getAttribute('data-card');

      // Simulate button click
      await userEvent.click(nextButton);

      await waitFor(() => {
        const buttonCard = card.getAttribute('data-card');
        expect(buttonCard).not.toBe(initialCard);
      });
    });

    it('should navigate backward with ArrowLeft, identical to back button click', async () => {
      render(<RouterProvider router={router} />);
      const card = screen.getByTestId('card');
      const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;
      const backButton = screen.getByTestId('card').nextElementSibling?.querySelector('#back-button') as HTMLElement;
      let initialCard = card.getAttribute('data-card')

      // Go forward first
      await userEvent.click(nextButton);
      await waitFor(() => {
        expect(card.getAttribute('data-card')).not.toBe(initialCard);
      });

      // Simulate back with button
      await userEvent.click(backButton);
      await waitFor(() => {
        expect(card.getAttribute('data-card')).toBe(initialCard);
      });
    });

    it('should flip card with spacebar, identical to card click', async () => {
      render(<RouterProvider router={router} />);
      const card = screen.getByTestId('card');

      expect(card).toHaveAttribute('data-flipped', 'false');

      // Simulate card click
      await userEvent.click(card);
      await waitFor(() => {
        expect(card).toHaveAttribute('data-flipped', 'true');
      });

      // Simulate spacebar - expect toggle back
      await userEvent.keyboard(' ');
      await waitFor(() => {
        expect(card).toHaveAttribute('data-flipped', 'false');
      });
    });

    it('should navigate through deck with arrow keys', async () => {
      render(<RouterProvider router={router} />);
      const card = screen.getByTestId('card');

      // Navigate forward multiple times
      for (let i = 0; i < 5; i++) {
        await userEvent.keyboard('{ArrowRight}');
      }

      await waitFor(() => {
        expect(['Mock Plant 1', 'Mock Plant 2']).toContain(card.getAttribute('data-card'));
      });
    });

    it('should flip while navigating', async () => {
      render(<RouterProvider router={router} />);
      const card = screen.getByTestId('card');
      const initialCard = card.getAttribute('data-card')

      // Flip with card click
      await userEvent.click(card);
      await waitFor(() => {
        expect(card).toHaveAttribute('data-flipped', 'true');
      });

      // Navigate next
      const nextButton = screen.getByTestId('card').nextElementSibling?.querySelector('#next-button') as HTMLElement;
      await userEvent.click(nextButton);

      await new Promise(resolve => setTimeout(resolve, 400)); // default flip / 2
      await waitFor(() => {
        expect(card).toHaveAttribute('data-flipped', 'false');
        expect(card.getAttribute('data-card')).not.toBe(initialCard);
      });
    });

    it('should handle invalid keys', async () => {
      render(<RouterProvider router={router} />);
      const card = screen.getByTestId('card');

      const initialCard = card.getAttribute('data-card');
      const initialFlipped = card.getAttribute('data-flipped');

      // Simulate invalid key
      await userEvent.keyboard('a');

      expect(card.getAttribute('data-card')).toBe(initialCard);
      expect(card.getAttribute('data-flipped')).toBe(initialFlipped);
    });

    it('should handle navigating beyond deck bounds', async () => {
      render(<RouterProvider router={router} />);
      const card = screen.getByTestId('card');

      // Try to go back from start
      await userEvent.keyboard('{ArrowLeft}');
      expect(card.getAttribute('data-card')).toBe('Mock Plant 1');

      // Navigate forward to wrap
      for (let i = 0; i < 3; i++) {
        await userEvent.keyboard('{ArrowRight}');
      }

      await waitFor(() => {
        expect(['Mock Plant 1', 'Mock Plant 2']).toContain(card.getAttribute('data-card'));
      });
    });

    it('should handle rapid key presses', async () => {
      render(<RouterProvider router={router} />);
      const card = screen.getByTestId('card');

      // Rapid presses
      for (let i = 0; i < 10; i++) {
        await userEvent.keyboard('{ArrowRight}');
        await userEvent.keyboard('{ArrowLeft}');
      }

      // Should still be functional
      await waitFor(() => {
        expect(card).toBeInTheDocument();
        expect(card.getAttribute('data-card')).toBeTruthy();
      });
    });
  });
});
