import React from 'react';
import { Note, Collection } from './types';

export const MOCK_NOTES: Note[] = [
  {
    id: 'note-1',
    title: 'OCI (Oracle Cloud Infrastructure)',
    content: 'DNS Domain Name: K3ssublnet.nevo.oraclevcn.com',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    collectionId: 'liberator',
    isPinned: true,
  },
  {
    id: 'note-3',
    title: 'My Address',
    content: '666/982 Supalai Veranda Phasi Charoen, Phetkasem Rd, Bang Wa, Phasi Charoen, Bangkok 10160',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    isPinned: true,
  },
  {
    id: 'note-2',
    title: 'Fintellect Consulting Website',
    content: 'e learning in website',
    date: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
    collectionId: 'solopreneur'
  },
  {
    id: 'note-4',
    title: 'Lib Responsibilities',
    content: 'I have access permission for both Dev and Infrastructure.',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    collectionId: 'liberator'
  },
   {
    id: 'note-5',
    title: 'Senior DevOps engineer task',
    content: 'Your task is to dockerize my application that uses Neon.\n1. **Development Environment (Local):**\n2. **Staging Environment:**\n3. **Production Environment:**',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    collectionId: 'liberator'
  },
  {
    id: 'note-6',
    title: 'Note to myself',
    content: 'we might be able to do some thing with',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    collectionId: 'solopreneur'
  },
  {
    id: 'note-7',
    title: 'Workout Plan',
    content: 'Monday: Chest & Triceps\nWednesday: Back & Biceps\nFriday: Legs & Shoulders',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    collectionId: 'workout'
  },
  {
    id: 'note-8',
    title: 'Quarterly Financial Goals',
    content: '- Increase savings by 5%\n- Invest $2000 in index funds\n- Review budget for potential cuts',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    collectionId: 'money'
  }
];

export const MOCK_COLLECTIONS: Collection[] = [
    { id: 'liberator', name: 'Liberator', icon: '⚡️' },
    { id: 'money', name: 'Money', icon: '💰' },
    { id: 'health', name: 'Health', icon: '❤️' },
    { id: 'workout', name: 'Workout', icon: '💪' },
    { id: 'solopreneur', name: 'Solopreneur', icon: '🚀' },
];
