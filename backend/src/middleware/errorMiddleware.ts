import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[API Error]:', err.message);
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 400;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};

