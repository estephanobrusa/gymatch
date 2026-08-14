/**
 * Gymatch V2 — Database Seed Script
 *
 * Idempotent: uses upsert everywhere. Safe to run multiple times.
 * Run:  pnpm --filter @gymatch/db db:seed
 * Test: pnpm --filter apps/web test -- src/lib/seed.test.ts
 */
import {
  PrismaClient,
  Discipline,
  FitnessGoal,
  ExperienceLevel,
  Schedule,
  Gender,
  LookingFor,
  SwipeDirection,
} from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SwipePair = {
  fromIndex: number;
  toIndex: number;
  direction: "LIKE" | "PASS";
};

// ─── Pure Helpers ────────────────────────────────────────────────────────────

/**
 * Build an Unsplash URL for a given photo ID.
 * @pure — no side effects, deterministic.
 */
export function photoUrl(id: string): string {
  return `https://picsum.photos/id/${id}/400/600`;
}

/**
 * Find all mutually-liked index pairs in a swipe list.
 * Returns each mutual pair once, with the lower index first.
 * @pure — no side effects, deterministic.
 */
export function extractMutualLikes(pairs: SwipePair[]): [number, number][] {
  const likeSet = new Set<string>();
  for (const p of pairs) {
    if (p.direction === "LIKE") {
      likeSet.add(`${p.fromIndex}:${p.toIndex}`);
    }
  }

  const mutuals: [number, number][] = [];
  for (const p of pairs) {
    if (
      p.direction === "LIKE" &&
      p.fromIndex < p.toIndex && // emit each pair only once
      likeSet.has(`${p.toIndex}:${p.fromIndex}`)
    ) {
      mutuals.push([p.fromIndex, p.toIndex]);
    }
  }
  return mutuals;
}

// ─── Photo Pool ──────────────────────────────────────────────────────────────

/** Picsum photo IDs — reliable, no API key needed, fitness-friendly numbers. */
export const PHOTO_POOL: string[] = [
  "1062", "1074", "1078", "1080", "1084",
  "1090", "1094", "1096", "1005", "1011",
];

// ─── Gyms ────────────────────────────────────────────────────────────────────

export const GYMS = [
  {
    name: "Gold's Gym Palermo",
    address: "Av. Santa Fe 3627, Palermo",
    city: "Buenos Aires",
    googlePlaceId: "place_gymatch_seed_001",
    lat: -34.5888,
    lng: -58.4249,
  },
  {
    name: "Megatlon Recoleta",
    address: "Av. del Libertador 750, Recoleta",
    city: "Buenos Aires",
    googlePlaceId: "place_gymatch_seed_002",
    lat: -34.5867,
    lng: -58.3954,
  },
  {
    name: "SmartFit Caballito",
    address: "Av. Rivadavia 5200, Caballito",
    city: "Buenos Aires",
    googlePlaceId: "place_gymatch_seed_003",
    lat: -34.6178,
    lng: -58.4412,
  },
  {
    name: "CrossFit Belgrano",
    address: "Av. Monroe 3500, Belgrano",
    city: "Buenos Aires",
    googlePlaceId: "place_gymatch_seed_004",
    lat: -34.5601,
    lng: -58.4575,
  },
  {
    name: "Urban Fitness Villa Crespo",
    address: "Av. Corrientes 4500, Villa Crespo",
    city: "Buenos Aires",
    googlePlaceId: "place_gymatch_seed_005",
    lat: -34.5978,
    lng: -58.4418,
  },
] as const;

// ─── Users ───────────────────────────────────────────────────────────────────

export const USERS = [
  // ── 0 ──
  {
    supabaseId: "470020a6-35d6-44a3-8c40-f83ccb4af48a",
    email: "valentina.rossi@gymatch.test",
    name: "Valentina Rossi",
    username: "valen_rossi",
    birthDate: new Date("1990-03-15"),
    bio: "CrossFit & café de por medio. Busco compañera de entrenamiento.",
    city: "Buenos Aires",
    gender: Gender.FEMALE,
    maxDistance: 10,
    fitnessGoals: [FitnessGoal.STRENGTH, FitnessGoal.GENERAL_FITNESS],
    experienceLevel: ExperienceLevel.ADVANCED,
    schedule: [Schedule.MORNING, Schedule.EARLY_MORNING],
    disciplines: [Discipline.CROSSFIT, Discipline.WEIGHTLIFTING],
    lookingFor: [LookingFor.TRAINING_PARTNER, LookingFor.ACCOUNTABILITY_PARTNER],
    height: 165,
    weight: 60,
    weeklyFrequency: 5,
  },
  // ── 1 ──
  {
    supabaseId: "c264f076-b598-4c3a-b7fc-f7e03fcc9449",
    email: "matias.garcia@gymatch.test",
    name: "Matías García",
    username: "mati_garcia",
    birthDate: new Date("1990-07-22"),
    bio: "Levanto pesas desde los 18. Siempre buscando mejorar el PR.",
    city: "Buenos Aires",
    gender: Gender.MALE,
    maxDistance: 15,
    fitnessGoals: [FitnessGoal.MUSCLE_GAIN, FitnessGoal.STRENGTH],
    experienceLevel: ExperienceLevel.EXPERT,
    schedule: [Schedule.MORNING],
    disciplines: [Discipline.WEIGHTLIFTING, Discipline.FUNCTIONAL],
    lookingFor: [LookingFor.SPOTTER, LookingFor.TRAINING_PARTNER],
    height: 180,
    weight: 85,
    weeklyFrequency: 6,
  },
  // ── 2 ──
  {
    supabaseId: "a1edaba0-5f24-480d-8bdf-859072b7f672",
    email: "santiago.lopez@gymatch.test",
    name: "Santiago López",
    username: "santi_lopez",
    birthDate: new Date("1991-11-30"),
    bio: "Running y funcional. Salgo a correr los fines de semana.",
    city: "Buenos Aires",
    gender: Gender.MALE,
    maxDistance: 20,
    fitnessGoals: [FitnessGoal.ENDURANCE, FitnessGoal.GENERAL_FITNESS],
    experienceLevel: ExperienceLevel.INTERMEDIATE,
    schedule: [Schedule.EARLY_MORNING, Schedule.EVENING],
    disciplines: [Discipline.RUNNING, Discipline.FUNCTIONAL],
    lookingFor: [LookingFor.RUNNING_BUDDY, LookingFor.ACCOUNTABILITY_PARTNER],
    height: 175,
    weight: 72,
    weeklyFrequency: 4,
  },
  // ── 3 ──
  {
    supabaseId: "f3aed68f-93aa-4e8b-951d-4f325b2fad93",
    email: "camila.fernandez@gymatch.test",
    name: "Camila Fernández",
    username: "cami_fer",
    birthDate: new Date("1991-04-08"),
    bio: "Yoga y pilates para el cuerpo y la mente. Buscando grupo.",
    city: "Buenos Aires",
    gender: Gender.FEMALE,
    maxDistance: 8,
    fitnessGoals: [FitnessGoal.FLEXIBILITY, FitnessGoal.GENERAL_FITNESS],
    experienceLevel: ExperienceLevel.INTERMEDIATE,
    schedule: [Schedule.MORNING, Schedule.MIDDAY],
    disciplines: [Discipline.YOGA, Discipline.PILATES],
    lookingFor: [LookingFor.WORKOUT_GROUP, LookingFor.ACCOUNTABILITY_PARTNER],
    height: 162,
    weight: 55,
    weeklyFrequency: 3,
  },
  // ── 4 ──
  {
    supabaseId: "29a1086a-159b-4145-b1fa-01318d07863a",
    email: "lucas.martinez@gymatch.test",
    name: "Lucas Martínez",
    username: "lucas_mtz",
    birthDate: new Date("1992-09-14"),
    bio: "Calistenia en el parque. Muscle-up en progreso.",
    city: "Buenos Aires",
    gender: Gender.MALE,
    maxDistance: 12,
    fitnessGoals: [FitnessGoal.STRENGTH, FitnessGoal.MUSCLE_GAIN],
    experienceLevel: ExperienceLevel.INTERMEDIATE,
    schedule: [Schedule.AFTERNOON, Schedule.EVENING],
    disciplines: [Discipline.CALISTHENICS, Discipline.HIIT],
    lookingFor: [LookingFor.TRAINING_PARTNER, LookingFor.MENTOR],
    height: 178,
    weight: 75,
    weeklyFrequency: 5,
  },
  // ── 5 ──
  {
    supabaseId: "cc7606fc-75b4-494a-8abc-961379776d47",
    email: "lucia.perez@gymatch.test",
    name: "Lucía Pérez",
    username: "lu_perez",
    birthDate: new Date("1992-02-28"),
    bio: "Nado y corro, la vida es movimiento. Busco quien venga al natatorio.",
    city: "Buenos Aires",
    gender: Gender.FEMALE,
    maxDistance: 18,
    fitnessGoals: [FitnessGoal.ENDURANCE, FitnessGoal.FAT_LOSS],
    experienceLevel: ExperienceLevel.ADVANCED,
    schedule: [Schedule.EARLY_MORNING, Schedule.MORNING],
    disciplines: [Discipline.SWIMMING, Discipline.RUNNING],
    lookingFor: [LookingFor.RUNNING_BUDDY, LookingFor.ACCOUNTABILITY_PARTNER],
    height: 168,
    weight: 58,
    weeklyFrequency: 6,
  },
  // ── 6 ──
  {
    supabaseId: "1f70485d-5a4b-4d7d-bdc2-6e71ee38c33f",
    email: "agustin.romero@gymatch.test",
    name: "Agustín Romero",
    username: "agus_romero",
    birthDate: new Date("1993-06-05"),
    bio: "Box y muay thai. Entreno para la vida, no solo para el cuerpo.",
    city: "Buenos Aires",
    gender: Gender.MALE,
    maxDistance: 25,
    fitnessGoals: [FitnessGoal.SPORTS_PERFORMANCE, FitnessGoal.STRENGTH],
    experienceLevel: ExperienceLevel.ADVANCED,
    schedule: [Schedule.EVENING, Schedule.NIGHT],
    disciplines: [Discipline.BOXING, Discipline.MARTIAL_ARTS],
    lookingFor: [LookingFor.TRAINING_PARTNER, LookingFor.SPOTTER],
    height: 182,
    weight: 82,
    weeklyFrequency: 4,
  },
  // ── 7 ──
  {
    supabaseId: "184404a2-c6a7-4775-b995-d6ef55353a2a",
    email: "florencia.diaz@gymatch.test",
    name: "Florencia Díaz",
    username: "flor_diaz",
    birthDate: new Date("1994-12-20"),
    bio: "CrossFit y funcional. Me gustan los WODs largos.",
    city: "Buenos Aires",
    gender: Gender.FEMALE,
    maxDistance: 10,
    fitnessGoals: [FitnessGoal.GENERAL_FITNESS, FitnessGoal.STRENGTH],
    experienceLevel: ExperienceLevel.INTERMEDIATE,
    schedule: [Schedule.MORNING, Schedule.MIDDAY],
    disciplines: [Discipline.CROSSFIT, Discipline.FUNCTIONAL],
    lookingFor: [LookingFor.ACCOUNTABILITY_PARTNER, LookingFor.WORKOUT_GROUP],
    height: 170,
    weight: 63,
    weeklyFrequency: 3,
  },
  // ── 8 ──
  {
    supabaseId: "02a82442-4dbb-4e06-978c-909feb750e82",
    email: "ezequiel.torres@gymatch.test",
    name: "Ezequiel Torres",
    username: "eze_torres",
    birthDate: new Date("1994-01-17"),
    bio: "Ciclismo y running. Participo en carreras de 10K.",
    city: "Buenos Aires",
    gender: Gender.MALE,
    maxDistance: 30,
    fitnessGoals: [FitnessGoal.ENDURANCE, FitnessGoal.SPORTS_PERFORMANCE],
    experienceLevel: ExperienceLevel.ADVANCED,
    schedule: [Schedule.EARLY_MORNING, Schedule.AFTERNOON],
    disciplines: [Discipline.CYCLING, Discipline.RUNNING],
    lookingFor: [LookingFor.RUNNING_BUDDY, LookingFor.TRAINING_PARTNER],
    height: 176,
    weight: 70,
    weeklyFrequency: 7,
  },
  // ── 9 ──
  {
    supabaseId: "71418685-2129-4fc9-9027-1e2453ba3a46",
    email: "juliana.acosta@gymatch.test",
    name: "Juliana Acosta",
    username: "juli_acosta",
    birthDate: new Date("1995-08-03"),
    bio: "HIIT y spinning. Siempre con buena música.",
    city: "Buenos Aires",
    gender: Gender.FEMALE,
    maxDistance: 15,
    fitnessGoals: [FitnessGoal.FAT_LOSS, FitnessGoal.GENERAL_FITNESS],
    experienceLevel: ExperienceLevel.BEGINNER,
    schedule: [Schedule.AFTERNOON, Schedule.EVENING],
    disciplines: [Discipline.HIIT, Discipline.CYCLING],
    lookingFor: [LookingFor.ACCOUNTABILITY_PARTNER, LookingFor.MENTEE],
    height: 160,
    weight: 57,
    weeklyFrequency: 3,
  },
  // ── 10 ──
  {
    supabaseId: "ecfffd29-e6c8-4cac-a778-08e898dfec31",
    email: "nicolas.sosa@gymatch.test",
    name: "Nicolás Sosa",
    username: "nico_sosa",
    birthDate: new Date("1996-05-25"),
    bio: "Powerlifting y comida. El gym es mi segundo hogar.",
    city: "Buenos Aires",
    gender: Gender.MALE,
    maxDistance: 20,
    fitnessGoals: [FitnessGoal.STRENGTH, FitnessGoal.MUSCLE_GAIN],
    experienceLevel: ExperienceLevel.ADVANCED,
    schedule: [Schedule.EVENING, Schedule.NIGHT],
    disciplines: [Discipline.WEIGHTLIFTING, Discipline.FUNCTIONAL],
    lookingFor: [LookingFor.SPOTTER, LookingFor.TRAINING_PARTNER],
    height: 183,
    weight: 95,
    weeklyFrequency: 5,
  },
  // ── 11 ──
  {
    supabaseId: "559e9bc0-c1f5-49cc-8fc8-e4172f393915",
    email: "sofia.mendez@gymatch.test",
    name: "Sofía Méndez",
    username: "sofi_mendez",
    birthDate: new Date("1996-10-11"),
    bio: "Yoga y meditación. Buscando paz interior y core de acero.",
    city: "Buenos Aires",
    gender: Gender.FEMALE,
    maxDistance: 5,
    fitnessGoals: [FitnessGoal.FLEXIBILITY, FitnessGoal.GENERAL_FITNESS],
    experienceLevel: ExperienceLevel.INTERMEDIATE,
    schedule: [Schedule.MORNING, Schedule.MIDDAY],
    disciplines: [Discipline.YOGA, Discipline.PILATES],
    lookingFor: [LookingFor.WORKOUT_GROUP, LookingFor.MENTOR],
    height: 163,
    weight: 52,
    weeklyFrequency: 4,
  },
  // ── 12 ──
  {
    supabaseId: "cc2dbdfe-42a5-4958-9eba-4b011a0e8772",
    email: "tomas.herrera@gymatch.test",
    name: "Tomás Herrera",
    username: "tomi_herrera",
    birthDate: new Date("1997-03-29"),
    bio: "Funcional y calistenia. Me gusta entrenar al aire libre.",
    city: "Buenos Aires",
    gender: Gender.MALE,
    maxDistance: 15,
    fitnessGoals: [FitnessGoal.GENERAL_FITNESS, FitnessGoal.MUSCLE_GAIN],
    experienceLevel: ExperienceLevel.BEGINNER,
    schedule: [Schedule.AFTERNOON, Schedule.MORNING],
    disciplines: [Discipline.FUNCTIONAL, Discipline.CALISTHENICS],
    lookingFor: [LookingFor.MENTOR, LookingFor.TRAINING_PARTNER],
    height: 177,
    weight: 73,
    weeklyFrequency: 2,
  },
  // ── 13 ──
  {
    supabaseId: "1e2e87d0-1dba-4741-9a1e-55d8f90d37de",
    email: "antonella.vega@gymatch.test",
    name: "Antonella Vega",
    username: "anto_vega",
    birthDate: new Date("1998-07-16"),
    bio: "CrossFit competitiva. Busco sparring y entrenamiento duro.",
    city: "Buenos Aires",
    gender: Gender.FEMALE,
    maxDistance: 25,
    fitnessGoals: [FitnessGoal.SPORTS_PERFORMANCE, FitnessGoal.STRENGTH],
    experienceLevel: ExperienceLevel.EXPERT,
    schedule: [Schedule.EARLY_MORNING, Schedule.MORNING],
    disciplines: [Discipline.CROSSFIT, Discipline.WEIGHTLIFTING],
    lookingFor: [LookingFor.TRAINING_PARTNER, LookingFor.ACCOUNTABILITY_PARTNER],
    height: 167,
    weight: 62,
    weeklyFrequency: 6,
  },
  // ── 14 ──
  {
    supabaseId: "4a16b226-26fe-490d-bbf1-0a5c1f1b1bb3",
    email: "facundo.rios@gymatch.test",
    name: "Facundo Ríos",
    username: "facu_rios",
    birthDate: new Date("1998-11-08"),
    bio: "Muay thai y crossfit. El dolor es temporal, el orgullo es eterno.",
    city: "Buenos Aires",
    gender: Gender.MALE,
    maxDistance: 20,
    fitnessGoals: [FitnessGoal.SPORTS_PERFORMANCE, FitnessGoal.FAT_LOSS],
    experienceLevel: ExperienceLevel.INTERMEDIATE,
    schedule: [Schedule.EVENING, Schedule.NIGHT],
    disciplines: [Discipline.MARTIAL_ARTS, Discipline.CROSSFIT],
    lookingFor: [LookingFor.TRAINING_PARTNER, LookingFor.SPOTTER],
    height: 179,
    weight: 78,
    weeklyFrequency: 4,
  },
  // ── 15 ──
  {
    supabaseId: "ec39ebcc-5b21-4b8a-bf77-fc416abc7477",
    email: "catalina.morales@gymatch.test",
    name: "Catalina Morales",
    username: "cata_morales",
    birthDate: new Date("1999-02-14"),
    bio: "Spinning y natación. Siempre en movimiento.",
    city: "Buenos Aires",
    gender: Gender.FEMALE,
    maxDistance: 10,
    fitnessGoals: [FitnessGoal.ENDURANCE, FitnessGoal.FAT_LOSS],
    experienceLevel: ExperienceLevel.BEGINNER,
    schedule: [Schedule.MORNING, Schedule.MIDDAY],
    disciplines: [Discipline.CYCLING, Discipline.SWIMMING],
    lookingFor: [LookingFor.ACCOUNTABILITY_PARTNER, LookingFor.MENTEE],
    height: 164,
    weight: 56,
    weeklyFrequency: 3,
  },
  // ── 16 ──
  {
    supabaseId: "b3ccc2a3-a9a3-472a-a179-790b61348b94",
    email: "ignacio.reyes@gymatch.test",
    name: "Ignacio Reyes",
    username: "nacho_reyes",
    birthDate: new Date("2000-09-22"),
    bio: "HIIT y pesas. Empecé el año pasado y no paro más.",
    city: "Buenos Aires",
    gender: Gender.MALE,
    maxDistance: 12,
    fitnessGoals: [FitnessGoal.MUSCLE_GAIN, FitnessGoal.FAT_LOSS],
    experienceLevel: ExperienceLevel.BEGINNER,
    schedule: [Schedule.AFTERNOON, Schedule.EVENING],
    disciplines: [Discipline.HIIT, Discipline.WEIGHTLIFTING],
    lookingFor: [LookingFor.MENTEE, LookingFor.ACCOUNTABILITY_PARTNER],
    height: 174,
    weight: 71,
    weeklyFrequency: 3,
  },
  // ── 17 ──
  {
    supabaseId: "ebaae03e-bbdf-48a4-9171-333c1a7e379f",
    email: "mariana.silva@gymatch.test",
    name: "Mariana Silva",
    username: "mari_silva",
    birthDate: new Date("2000-04-30"),
    bio: "Pilates reformer y funcional. Cuerpo y mente equilibrados.",
    city: "Buenos Aires",
    gender: Gender.FEMALE,
    maxDistance: 8,
    fitnessGoals: [FitnessGoal.FLEXIBILITY, FitnessGoal.GENERAL_FITNESS],
    experienceLevel: ExperienceLevel.BEGINNER,
    schedule: [Schedule.MORNING, Schedule.AFTERNOON],
    disciplines: [Discipline.PILATES, Discipline.FUNCTIONAL],
    lookingFor: [LookingFor.WORKOUT_GROUP, LookingFor.ACCOUNTABILITY_PARTNER],
    height: 161,
    weight: 54,
    weeklyFrequency: 2,
  },
  // ── 18 ──
  {
    supabaseId: "27ea6e71-6fd2-4ef1-a9ca-4059da9d0787",
    email: "braian.ortega@gymatch.test",
    name: "Braian Ortega",
    username: "brai_ortega",
    birthDate: new Date("2001-06-18"),
    bio: "Cali y street workout. El parque es mi gimnasio.",
    city: "Buenos Aires",
    gender: Gender.MALE,
    maxDistance: 15,
    fitnessGoals: [FitnessGoal.STRENGTH, FitnessGoal.GENERAL_FITNESS],
    experienceLevel: ExperienceLevel.INTERMEDIATE,
    schedule: [Schedule.AFTERNOON, Schedule.EVENING],
    disciplines: [Discipline.CALISTHENICS, Discipline.FUNCTIONAL],
    lookingFor: [LookingFor.TRAINING_PARTNER, LookingFor.WORKOUT_GROUP],
    height: 176,
    weight: 74,
    weeklyFrequency: 4,
  },
  // ── 19 ──
  {
    supabaseId: "ce39782c-21ed-475f-8c96-1ceac676f67b",
    email: "rocio.gutierrez@gymatch.test",
    name: "Rocío Gutiérrez",
    username: "roci_gutierrez",
    birthDate: new Date("2002-12-05"),
    bio: "Running y yoga. Media maratón en proceso.",
    city: "Buenos Aires",
    gender: Gender.FEMALE,
    maxDistance: 20,
    fitnessGoals: [FitnessGoal.ENDURANCE, FitnessGoal.FLEXIBILITY],
    experienceLevel: ExperienceLevel.BEGINNER,
    schedule: [Schedule.EARLY_MORNING, Schedule.MORNING],
    disciplines: [Discipline.RUNNING, Discipline.YOGA],
    lookingFor: [LookingFor.RUNNING_BUDDY, LookingFor.ACCOUNTABILITY_PARTNER],
    height: 159,
    weight: 51,
    weeklyFrequency: 4,
  },
] as const;

// ─── Swipe Pairs ─────────────────────────────────────────────────────────────

/**
 * 10 swipes. 4 are mutual LIKE → generate matches for pairs [0,1] [2,3] [4,5] [6,7].
 */
export const SWIPE_PAIRS: SwipePair[] = [
  { fromIndex: 0, toIndex: 1, direction: "LIKE" }, // Valentina → Matías
  { fromIndex: 1, toIndex: 0, direction: "LIKE" }, // Matías → Valentina  ← MUTUAL 1
  { fromIndex: 2, toIndex: 3, direction: "LIKE" }, // Santiago → Camila
  { fromIndex: 3, toIndex: 2, direction: "LIKE" }, // Camila → Santiago    ← MUTUAL 2
  { fromIndex: 4, toIndex: 5, direction: "LIKE" }, // Lucas → Lucía
  { fromIndex: 5, toIndex: 4, direction: "LIKE" }, // Lucía → Lucas        ← MUTUAL 3
  { fromIndex: 6, toIndex: 7, direction: "LIKE" }, // Agustín → Florencia
  { fromIndex: 7, toIndex: 6, direction: "LIKE" }, // Florencia → Agustín  ← MUTUAL 4
  { fromIndex: 8, toIndex: 0, direction: "LIKE" }, // Ezequiel → Valentina (one-way)
  { fromIndex: 9, toIndex: 1, direction: "PASS" }, // Juliana PASS Matías
];

// ─── Match Messages ───────────────────────────────────────────────────────────

export const MATCH_MESSAGES = [
  "Ey! ¿A qué hora vas mañana?",
  "A las 7, antes de que llegue el gentío. ¿Te viene bien?",
  "Perfecto, nos vemos a las 7 en la puerta.",
  "¿Hacés pecho o espalda?",
  "Pecho! Vos?",
  "Espalda. Igual después te caigo al rack 😂",
  "Jaja dale, te ayudo con el peso. ¿Tenés cuántos kilos en banca?",
  "Ando en 80. Quiero llegar a 100 este mes.",
  "Vamos! El martes te paso el programa que uso yo.",
];

// ─── DB Operations ───────────────────────────────────────────────────────────

async function upsertGyms(prisma: PrismaClient) {
  console.log("  🏋️  Upserting gyms…");
  const created = [];
  for (const gym of GYMS) {
    const record = await prisma.gym.upsert({
      where: { googlePlaceId: gym.googlePlaceId },
      create: gym,
      update: { name: gym.name, address: gym.address, lat: gym.lat, lng: gym.lng },
    });
    created.push(record);
  }
  console.log(`     → ${created.length} gyms ready.`);
  return created;
}

async function upsertUsers(
  prisma: PrismaClient,
  gymIds: string[],
) {
  console.log("  👤  Upserting users…");
  const created = [];
  for (let i = 0; i < USERS.length; i++) {
    const u = USERS[i];
    const gymId = gymIds[i % gymIds.length]; // rotate through gyms
    const { fitnessGoals, disciplines, schedule, lookingFor, ...rest } = u;
    const record = await prisma.user.upsert({
      where: { supabaseId: u.supabaseId },
      create: {
        ...rest,
        gymId,
        fitnessGoals: [...fitnessGoals],
        disciplines: [...disciplines],
        schedule: [...schedule],
        lookingFor: [...lookingFor],
      },
      update: {
        gymId,
        fitnessGoals: [...fitnessGoals],
        disciplines: [...disciplines],
        schedule: [...schedule],
        lookingFor: [...lookingFor],
        maxDistance: u.maxDistance,
        weeklyFrequency: u.weeklyFrequency,
        experienceLevel: u.experienceLevel,
      },
    });
    created.push(record);
  }
  console.log(`     → ${created.length} users ready.`);
  return created;
}

async function seedPhotos(prisma: PrismaClient, userIds: string[]) {
  console.log("  📸  Seeding photos…");
  // Delete all seed photos first (idempotent reset)
  for (const userId of userIds) {
    await prisma.userPhoto.deleteMany({ where: { userId } });
  }
  const photoData: { userId: string; url: string; position: number }[] = [];
  for (let i = 0; i < userIds.length; i++) {
    const count = (i % 3) + 1; // 1, 2, or 3 photos per user
    for (let p = 0; p < count; p++) {
      const poolIdx = (i + p) % PHOTO_POOL.length;
      photoData.push({
        userId: userIds[i],
        url: photoUrl(PHOTO_POOL[poolIdx]),
        position: p,
      });
    }
  }
  await prisma.userPhoto.createMany({ data: photoData });
  console.log(`     → ${photoData.length} photos created.`);
}

async function seedSwipes(
  prisma: PrismaClient,
  userIds: string[],
) {
  console.log("  👆  Seeding swipes…");
  let count = 0;
  for (const pair of SWIPE_PAIRS) {
    const fromId = userIds[pair.fromIndex];
    const toId = userIds[pair.toIndex];
    const direction =
      pair.direction === "LIKE" ? SwipeDirection.LIKE : SwipeDirection.PASS;
    await prisma.swipe.upsert({
      where: { fromId_toId: { fromId, toId } },
      create: { fromId, toId, direction },
      update: { direction },
    });
    count++;
  }
  console.log(`     → ${count} swipes ready.`);
}

async function seedMatches(
  prisma: PrismaClient,
  userIds: string[],
) {
  console.log("  💚  Seeding matches…");
  const mutualPairs = extractMutualLikes(SWIPE_PAIRS);
  const matches = [];
  for (const [a, b] of mutualPairs) {
    const userAId = userIds[a];
    const userBId = userIds[b];
    const match = await prisma.match.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId },
      update: {},
    });
    matches.push(match);
  }
  console.log(`     → ${matches.length} matches ready.`);
  return matches;
}

async function seedConversations(
  prisma: PrismaClient,
  matches: { id: string; userAId: string; userBId: string }[],
) {
  console.log("  💬  Seeding conversations…");
  let convCount = 0;
  let msgCount = 0;
  for (const match of matches) {
    // Idempotent: only create if no conversation exists for this match yet
    const existing = await prisma.conversation.findFirst({
      where: { matchId: match.id },
    });
    if (existing) continue;

    const conversation = await prisma.conversation.create({
      data: { matchId: match.id },
    });
    convCount++;

    // Alternate senders: A starts, B replies, etc.
    const messages = MATCH_MESSAGES.slice(0, 5).map((body, i) => ({
      conversationId: conversation.id,
      senderId: i % 2 === 0 ? match.userAId : match.userBId,
      body,
    }));
    await prisma.message.createMany({ data: messages });
    msgCount += messages.length;
  }
  console.log(`     → ${convCount} conversations, ${msgCount} messages created.`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("🌱 Gymatch V2 seed starting…\n");

    const gyms = await upsertGyms(prisma);
    const gymIds = gyms.map((g) => g.id);

    const users = await upsertUsers(prisma, gymIds);
    const userIds = users.map((u) => u.id);

    await seedPhotos(prisma, userIds);
    await seedSwipes(prisma, userIds);
    const matches = await seedMatches(prisma, userIds);
    await seedConversations(prisma, matches);

    console.log("\n✅ Seed complete.");
  } finally {
    await prisma.$disconnect();
  }
}

// ─── Entry Guard ──────────────────────────────────────────────────────────────
// Vitest sets NODE_ENV=test automatically → main() is never called in tests.
// When run directly via `tsx prisma/seed.ts`, NODE_ENV is not 'test' → main() runs.

if (process.env.NODE_ENV !== "test") {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
