import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '../types';

export function useTeam(profile: UserProfile) {
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile.role === 'manager') {
      const q = query(collection(db, 'users'), where('managerId', '==', profile.uid));
      const unsub = onSnapshot(q, (snap) => {
        setTeamIds(snap.docs.map(d => d.id));
        setLoading(false);
      });
      return unsub;
    } else {
      setTeamIds([]);
      setLoading(false);
    }
  }, [profile]);

  return { teamIds, loading };
}
