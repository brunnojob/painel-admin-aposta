import type { VercelRequest, VercelResponse } from '@vercel/node';
export class ApiError extends Error { status: number; constructor(status: number, message: string); }
export function configuration(): { url: string; key: string };
export function database(token: string, path: string, options?: RequestInit): Promise<any>;
export function principal(req: VercelRequest): Promise<{token: string; ownerId: string}>;
export function sendError(res: VercelResponse, error: unknown): VercelResponse;
export function bodyObject(value: unknown, maxBytes?: number): Record<string, any>;
export function boundedInteger(value: unknown, fallback: number, max: number): number;
