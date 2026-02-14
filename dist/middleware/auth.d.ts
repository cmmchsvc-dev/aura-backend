import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    userId?: string;
    userEmail?: string;
}
/**
 * Firebase Auth middleware — validates Bearer token
 */
export declare function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.d.ts.map