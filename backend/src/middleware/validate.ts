import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = (result.error as ZodError).errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return res.status(422).json({ error: 'Validation failed', details });
    }
    req.body = result.data;
    next();
  };
}
