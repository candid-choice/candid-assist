import { Request } from 'express';
import * as admin from 'firebase-admin';

export interface UserRequest extends Request {
  user?: admin.auth.DecodedIdToken;
  idToken?: string;
}
