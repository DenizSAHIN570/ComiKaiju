# Contributing to ComiKaiju

We welcome contributions to ComiKaiju! Whether it's fixing bugs, improving documentation, or adding new features, your help is appreciated.

Please take a moment to review this document to make the contribution process as smooth as possible.

## Code of Conduct

We expect all contributors to adhere to our Code of Conduct. Please treat everyone with respect and foster a positive community environment.

## How to Contribute

1.  **Fork** the repository on GitHub.
2.  **Clone** your forked repository to your local machine.
3.  **Create a new branch** for your feature or bug fix: `git checkout -b feature/your-feature-name` or `git checkout -b bugfix/issue-description`.
4.  **Make your changes**.
5.  **Test your changes** thoroughly.
6.  **Commit your changes** with a clear and concise message.
7.  **Push your branch** to your forked repository.
8.  **Open a Pull Request** to the `main` branch of the original ComiKaiju repository.

## Getting Started

To set up your development environment:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/OnlineComicReader.git
    cd OnlineComicReader
    ```
    (Replace `your-username` with your GitHub username)

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    This command will also trigger the `setup:libarchive` script, which copies necessary worker files. Ensure this completes successfully.

3.  **Start the development server:**
    ```bash
    npm run dev
    ```
    The application should now be running at `http://localhost:5173` (or a similar address).

## Project Structure

Here's a brief overview of relevant directories:

*   `src/lib/archive/`: Handles interaction with `libarchive.js`.
*   `src/lib/services/`: Core business logic (e.g., `comicProcessor.ts`).
*   `src/lib/storage/`: IndexedDB interaction layer (e.g., `comicStorage.ts`).
*   `src/lib/store/`: Svelte stores for reactive state management.
*   `src/lib/ui/`: Reusable Svelte components.
*   `src/routes/`: Application routes.
*   `src/types/`: TypeScript type definitions.

## Linting, Formatting, and Type Checking

Before submitting a pull request, please ensure your code adheres to the project's style and passes checks:

*   **Lint:** `npm run lint`
*   **Format:** `npm run format`
*   **Type Check:** `npm run check`

## Submitting a Pull Request

*   Ensure your branch is up-to-date with the `main` branch.
*   Provide a clear title and description for your pull request, detailing the changes and why they were made.
*   Reference any related issues.

Thank you for contributing!
