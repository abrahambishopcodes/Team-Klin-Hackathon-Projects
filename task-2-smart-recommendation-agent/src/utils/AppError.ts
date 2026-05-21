export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public status: string;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Useful to distinguish between operational errors and programming bugs
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

    // Set the prototype explicitly to ensure instanceof works
    Object.setPrototypeOf(this, AppError.prototype);

    // Capture the stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;
