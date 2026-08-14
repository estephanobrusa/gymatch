export { prisma } from './client'

// Re-export domain types so consumers don't need a direct @prisma/client dep
export type {
  User,
  UserPhoto,
  Gym,
  Swipe,
  SwipeDirection,
  Match,
  Conversation,
  Message,
  Report,
  Block,
  Event,
  EventRsvp,
  EventType,
} from '@prisma/client'
