/**
 * Error handling utilities
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  console.error('Unhandled error:', error);
  
  // Return actual error message for debugging (in development)
  const errorMessage = error instanceof Error ? error.message : 'Internal server error';
  
  return Response.json(
    {
      success: false,
      error: errorMessage,
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

export function successResponse<T>(data: T, status: number = 200): Response {
  return Response.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function paginatedResponse<T>(
  data: T[],
  meta: { page: number; limit: number; total: number },
  status: number = 200
): Response {
  return Response.json(
    {
      success: true,
      data,
      meta: {
        ...meta,
        totalPages: Math.ceil(meta.total / meta.limit),
      },
    },
    { status }
  );
}

