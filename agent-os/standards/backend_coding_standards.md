# Backend Coding Standards

These standards apply to the backend codebase, which is implemented using Node.js in an AWS Lambda environment.

## Technologies

*   **Language:** JavaScript (ESNext).
*   **Runtime:** Node.js (AWS Lambda).
*   **Module System:** CommonJS (inferred from absence of `"type": "module"` in `package.json` for Lambda functions).

## General Practices

*   **Consistency:** Maintain consistent code style and formatting throughout the backend services.
*   **Error Handling:** Implement robust error handling for all Lambda functions, especially for external API calls and database operations.
*   **Logging:** Utilize structured logging for better observability and debugging in the AWS environment.
*   **Modularity:** Organize code into small, focused modules for better maintainability and reusability.
*   **Security:** Follow security best practices for Node.js applications, including input validation and proper handling of sensitive data.
*   **Performance:** Optimize Lambda functions for performance and cost-efficiency, keeping cold starts and execution duration in mind.
*   **API Design:** Design clear and consistent API interfaces for the Lambda functions.
