import { Request, Response } from 'express';
import { registerToken, broadcastMessage, getAllTokens } from '../services/pushService';

export const registerPushTokenHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token required' });
    registerToken(userId, token);
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'failed' });
  }
};

export const broadcastHandler = async (req: Request, res: Response) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'title/body required' });
    const result = await broadcastMessage(title, body, { ts: Date.now() });
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'failed' });
  }
};

export const listTokensHandler = async (req: Request, res: Response) => {
  try {
    const tokens = getAllTokens();
    return res.json({ tokens });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'failed' });
  }
};
