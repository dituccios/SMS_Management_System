# Contributing to SMS Management System

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Request Process

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using GitHub's [issue tracker](https://github.com/dituccios/SMS_Management_System/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/dituccios/SMS_Management_System/issues/new); it's that easy!

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/dituccios/SMS_Management_System.git
   cd SMS_Management_System
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npx prisma migrate dev
   npx prisma generate
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend-nextjs
   npm install
   cp .env.example .env.local
   # Edit .env.local with your configuration
   npm run dev
   ```

### Code Style

We use ESLint and Prettier for code formatting. Please ensure your code follows our style guidelines:

```bash
# Backend
cd backend
npm run lint
npm run lint:fix

# Frontend
cd frontend-nextjs
npm run lint
npm run lint:fix
```

### Testing

Please add tests for any new functionality:

```bash
# Backend tests
cd backend
npm test
npm run test:coverage

# Frontend tests
cd frontend-nextjs
npm test
```

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Changes that do not affect the meaning of the code
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `test:` Adding missing tests or correcting existing tests
- `chore:` Changes to the build process or auxiliary tools

Example:
```
feat: add AI-powered risk classification endpoint
fix: resolve authentication token expiration issue
docs: update API documentation for ML endpoints
```

## Feature Requests

We welcome feature requests! Please:

1. Check if the feature has already been requested
2. Provide a clear description of the problem you're trying to solve
3. Describe the solution you'd like
4. Consider alternative solutions
5. Provide additional context

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Enforcement

Project maintainers are responsible for clarifying the standards of acceptable behavior and are expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior.

## Getting Help

- Check the [documentation](./docs/)
- Search existing [issues](https://github.com/dituccios/SMS_Management_System/issues)
- Join our discussions
- Contact the maintainers

## Recognition

Contributors will be recognized in our README and release notes. We appreciate all contributions, no matter how small!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Don't hesitate to reach out if you have any questions about contributing. We're here to help!
