import { Request, Response } from 'express';

const deprecatedPaymentMethodResponse = (res: Response) => {
  return res.status(410).json({
    success: false,
    error: 'Saved payment methods are deprecated. Booking checkout now uses RevenueCat.',
  });
};

export const getPaymentMethods = async (_req: Request, res: Response) => {
  return res.json({ paymentMethods: [] });
};

export const addPaymentMethod = async (_req: Request, res: Response) => {
  return deprecatedPaymentMethodResponse(res);
};

export const deletePaymentMethod = async (_req: Request, res: Response) => {
  return deprecatedPaymentMethodResponse(res);
};

export const setDefaultPaymentMethod = async (_req: Request, res: Response) => {
  return deprecatedPaymentMethodResponse(res);
};

export const createSetupIntent = async (_req: Request, res: Response) => {
  return deprecatedPaymentMethodResponse(res);
};

export const confirmSetupIntent = async (_req: Request, res: Response) => {
  return deprecatedPaymentMethodResponse(res);
};
