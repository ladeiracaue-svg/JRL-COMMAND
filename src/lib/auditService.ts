import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function logAudit(
  userId: string, 
  userName: string, 
  entityType: 'company' | 'proposal' | 'branch' | 'user',
  entityId: string,
  action: string,
  oldValue?: any,
  newValue?: any
) {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      userId,
      userName,
      entityType,
      entityId,
      action,
      oldValue: oldValue || null,
      newValue: newValue || null,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
}
