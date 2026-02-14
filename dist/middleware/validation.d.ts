import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
/**
 * Express middleware factory for Zod validation
 */
export declare function validate(schema: ZodSchema): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map