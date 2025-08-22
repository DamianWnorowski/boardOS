# Rosemar_SiteOps

## Setup

Install dependencies before running the development server or test suite:

```
npm install
```

## Testing

This project uses [Vitest](https://vitest.dev/) with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro) and a `jsdom` test environment.
Execute all unit tests with:

```
npm test
```

The `jsdom` environment allows DOM APIs to be used in tests without a browser.
