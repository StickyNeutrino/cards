# Canyonlands Flash Cards

A Progressive Web App (PWA) for educational flashcards designed to help users identify birds and plants in the San Diego Canyonlands. This app features over 70 bird species and 85 plant species, with special highlighting for invasive plants to promote environmental awareness and conservation efforts.

## Key Features
- **Multiple Modes**: Choose from Plants, Birds, or Both categories.
- **Card Lists Page**: Browse and filter cards with search functionality.
- **Adjustable Flip Speed**: Customize flip timing from 0-2 seconds or instant flip.
- **Progressive Web App**: Installable PWA with offline functionality.
- **Offline Capability**: Preloads images for offline use with service worker support.
- **Keyboard Shortcuts**: Use Space to flip cards, arrow keys to navigate, and Escape for settings.
- **Responsive Design**: Optimized for both mobile and desktop devices.

## Installation

To get started with the Canyonlands Flash Cards project, follow these steps:

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd canyonlands-flash-cards
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Development

Start the development server:
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

## Building for Production

Create a production build:
```bash
npm run build
```

Serve the built app:
```bash
npm start
```

## Testing

The project includes comprehensive testing setup:

- **Unit Tests**: Run with Vitest
  ```bash
  npm run test
  ```

- **UI Tests**: Interactive test runner
  ```bash
  npm run test:ui
  ```

- **Headless Tests**: Run tests without UI
  ```bash
  npm run test:run
  ```

- **Coverage Reports**: Generate test coverage
  ```bash
  npm run test:coverage
  ```

- **End-to-End Tests**: Using Playwright (configure via `playwright.config.ts`)
  ```bash
  npx playwright test
  ```

## Deployment

### Docker

Build the Docker image:
```bash
docker build -t canyonlands-flash-cards .
```

Run the container:
```bash
docker run -p 3000:3000 canyonlands-flash-cards
```

### Kubernetes

Kubernetes manifests are provided for the testing environment at `testing.cards.unimpossy.com`. The manifests include:

- `k8s/cards-testing-deployment.yaml`
- `k8s/cards-testing-service.yaml`
- `k8s/cards-testing-ingress.yaml`

For the error receiver service at `errors.cards.unimpossy.com`:

- `k8s/error-receiver-deployment.yaml`
- `k8s/error-receiver-service.yaml`
- `k8s/error-receiver-ingress.yaml`

## Built With

- **React Router**: For routing and navigation
- **Vite**: Fast build tool and development server
- **TailwindCSS**: Utility-first CSS framework
- **TypeScript**: Typed JavaScript for better development experience
- **Service Worker**: For offline functionality
- **Playwright**: End-to-end testing
- **Vitest**: Unit testing framework

## Dependencies

### Runtime Dependencies
- `@react-router/node`: ^7.9.2
- `@react-router/serve`: ^7.9.2
- `isbot`: ^5.1.31
- `react`: ^19.1.1
- `react-dom`: ^19.1.1
- `react-router`: ^7.9.2
- `serve`: ^14.2.5

### Development Dependencies
- `@playwright/test`: ^1.57.0
- `@react-router/dev`: ^7.9.4
- `@tailwindcss/vite`: ^4.1.13
- `@testing-library/jest-dom`: ^6.9.1
- `@testing-library/react`: ^16.3.0
- `@testing-library/user-event`: ^14.6.1
- `@types/node`: ^22.19.0
- `@types/react`: ^19.1.13
- `@types/react-dom`: ^19.1.9
- `@vitest/coverage-v8`: ^4.0.7
- `cors`: ^2.8.5
- `fast-check`: ^3.22.0
- `jsdom`: ^26.1.0
- `supertest`: ^7.1.4
- `tailwindcss`: ^4.1.13
- `typescript`: ^5.9.2
- `vite`: ^7.1.7
- `vite-tsconfig-paths`: ^5.1.4
- `vitest`: ^4.0.7