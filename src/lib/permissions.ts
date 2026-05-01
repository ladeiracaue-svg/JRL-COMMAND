import { UserProfile, UserRole } from '../types';
import { query, where, collection, CollectionReference, Query, DocumentData, orderBy, limit } from 'firebase/firestore';

export function getBaseQuery(colRef: CollectionReference<DocumentData>, profile: UserProfile, teamIds?: string[]): Query<DocumentData> {
  const role = profile.role;
  
  if (role === 'admin') {
    return query(colRef, orderBy('createdAt', 'desc'), limit(100));
  }
  
  if (role === 'manager') {
    if (teamIds && teamIds.length > 0) {
      // Filter by any of the team IDs + the manager's own ID
      const allAllowedIds = [...teamIds, profile.uid];
      const path = colRef.path;
      const field = path === 'companies' ? 'responsibleUserId' : 
                    path === 'proposals' ? 'userId' :
                    path === 'tickets' ? 'sellerId' : 
                    path === 'commissions' ? 'userId' : 'userId';
      
      // Firestore 'in' limitation: max 30. If team is larger, we might have issues.
      // But for this app, 30 is likely enough.
      return query(colRef, where(field, 'in', allAllowedIds.slice(0, 30)), orderBy('createdAt', 'desc'), limit(100));
    }
    // Fallback: only show own if team not provided yet
    const field = colRef.path === 'companies' ? 'responsibleUserId' : 'userId';
    return query(colRef, where(field, '==', profile.uid), orderBy('createdAt', 'desc'), limit(100));
  }
  
  if (role === 'seller') {
    const path = colRef.path;
    const field = path === 'companies' ? 'responsibleUserId' : 
                  path === 'proposals' ? 'userId' :
                  path === 'tickets' ? 'sellerId' : 
                  path === 'commissions' ? 'userId' : 'userId';
    return query(colRef, where(field, '==', profile.uid), orderBy('createdAt', 'desc'), limit(100));
  }
  
  return query(colRef, limit(0)); // Should not happen
}

export function canCreateUser(profile: UserProfile): boolean {
  return profile.role === 'admin' || profile.role === 'manager';
}

export function canEditUser(profile: UserProfile, targetUser: UserProfile): boolean {
  if (profile.role === 'admin') return true;
  if (profile.role === 'manager' && targetUser.role === 'seller' && targetUser.managerId === profile.uid) return true;
  return false;
}
