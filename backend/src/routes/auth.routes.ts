import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma';
import { config } from '../config';

const router = Router();
const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

router.post('/google', async (req: Request, res: Response) => {
  try {
    const { token, mockUser } = req.body;

    let email = 'demo.user@reachinbox.ai';
    let name = 'Alex Rivera';
    let avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    let googleId = 'demo-google-12345';

    if (token && config.GOOGLE_CLIENT_ID) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: token,
          audience: config.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (payload) {
          email = payload.email || email;
          name = payload.name || name;
          avatar = payload.picture || avatar;
          googleId = payload.sub || googleId;
        }
      } catch (authErr: any) {
        console.warn('[Auth] Google verify error:', authErr.message);
      }
    } else if (mockUser) {
      email = mockUser.email || email;
      name = mockUser.name || name;
      avatar = mockUser.avatar || avatar;
      googleId = mockUser.googleId || googleId;
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: { name, avatar, googleId },
      create: { email, name, avatar, googleId }
    });

    return res.json({
      success: true,
      user,
      token: 'jwt-session-token-' + user.id
    });
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ error: 'Authentication failed: ' + err.message });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  const user = await prisma.user.findFirst();
  return res.json({ user: user || { id: 'default-user', email: 'demo@reachinbox.ai', name: 'ReachInbox Demo User' } });
});

export default router;
