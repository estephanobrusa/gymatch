/**
 * Reset testing interactions for the real user and provision 3 fresh users.
 *
 * Steps:
 *  1. Delete all interactions of the real user: swipes, matches (cascade
 *     conversations + messages), reports given, blocks, notifications.
 *  2. Delete the old test/mock users (emails ending @gymatch.test + Compu Nerd)
 *     — their remaining matches/swipes cascade away.
 *  3. Create 3 fresh users, each matched with the real user (bidirectional
 *     LIKE + Match row + conversation + 2 messages + NEW_MATCH notification).
 *
 * Run from packages/db with ADMIN_DATABASE_URL loaded from apps/web/.env.local.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const REAL_USER_ID = "dbd2f714-056e-4dec-9cd3-76749e6196eb";

async function main() {
  console.log("=== 1. Cleaning real user interactions ===");

  const blocksDeleted = await prisma.block.deleteMany({
    where: { OR: [{ fromId: REAL_USER_ID }, { toId: REAL_USER_ID }] },
  });
  console.log("blocks deleted:", blocksDeleted.count);

  const reportsGiven = await prisma.report.deleteMany({
    where: { reporterId: REAL_USER_ID },
  });
  console.log("reports given deleted:", reportsGiven.count);

  const swipesDeleted = await prisma.swipe.deleteMany({
    where: { OR: [{ fromId: REAL_USER_ID }, { toId: REAL_USER_ID }] },
  });
  console.log("swipes deleted:", swipesDeleted.count);

  const matchesDeleted = await prisma.match.deleteMany({
    where: { OR: [{ userAId: REAL_USER_ID }, { userBId: REAL_USER_ID }] },
  });
  console.log("matches deleted (cascades conversations+messages):", matchesDeleted.count);

  const notifDeleted = await prisma.notification.deleteMany({
    where: { OR: [{ userId: REAL_USER_ID }, { actorId: REAL_USER_ID }] },
  });
  console.log("notifications deleted:", notifDeleted.count);

  console.log("\n=== 2. Deleting old mock users ===");

  const mockUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { endsWith: "@gymatch.test" } },
        { email: "compunerdec@gmail.com" },
      ],
    },
    select: { id: true, name: true, email: true },
  });
  console.log("mock users found:", mockUsers.length);
  for (const u of mockUsers) {
    await prisma.swipe.deleteMany({
      where: { OR: [{ fromId: u.id }, { toId: u.id }] },
    });
    await prisma.notification.deleteMany({
      where: { OR: [{ userId: u.id }, { actorId: u.id }] },
    });
    await prisma.user.delete({ where: { id: u.id } });
    console.log("  deleted:", u.name, "<" + u.email + ">");
  }

  console.log("\n=== 3. Creating 3 fresh users ===");

  const profiles = [
    {
      name: "Sofía Ramírez",
      email: "sofia.ramirez@gymmatch.test",
      username: "sofiaramirez",
      city: "Buenos Aires",
      bio: "CrossFit 5x por semana. Competidora amateur de HYROX.",
      photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
      greeting: "Hola! Vi que entrenamos en la misma zona. ¿Entrenás mucho?",
      reply: "¡Sí! Arranqué crossfit hace 2 años y no paro. ¿Y vos?",
    },
    {
      name: "Martín Herrera",
      email: "martin.herrera@gymmatch.test",
      username: "martinherrera",
      city: "Palermo",
      bio: "Powerlifting. Deadlift 200kg. Busco spotter y compañero de hierro.",
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
      greeting: "Buenas! Vi tu perfil, ¿hacemos una sesión de pecho juntos?",
      reply: "Dale, el lunes a la tarde voy al gym. ¿Te prendés?",
    },
    {
      name: "Valentina Rossi",
      email: "valentina.rossi@gymmatch.test",
      username: "valerossi",
      city: "Recoleta",
      bio: "Yoga + running. Entreno al aire libre cuando puedo.",
      photoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
      greeting: "Hola! ¿Corrés también o sos más de gym?",
      reply: "Principalmente gym, pero quiero arrancar con el running.",
    },
  ];

  for (const p of profiles) {
    const user = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        username: p.username,
        supabaseId: `mock-${p.email.split("@")[0]}-${Date.now()}`,
        birthDate: new Date("1995-05-15"),
        city: p.city,
        bio: p.bio,
        gender: p.name.includes("Sofía") || p.name.includes("Valentina") ? "FEMALE" : "MALE",
        experienceLevel: p.name.includes("Valentina") ? "BEGINNER" : "INTERMEDIATE",
        fitnessGoals: p.name.includes("Valentina") ? ["FAT_LOSS"] : ["MUSCLE_GAIN"],
        maxDistance: 30,
        minAge: 20,
        maxAge: 40,
        photos: { create: [{ url: p.photoUrl, position: 0 }] },
      },
    });
    console.log("  created:", p.name, "->", user.id);

    // Bidirectional LIKE
    await prisma.swipe.create({
      data: { fromId: REAL_USER_ID, toId: user.id, direction: "LIKE" },
    });
    await prisma.swipe.create({
      data: { fromId: user.id, toId: REAL_USER_ID, direction: "LIKE" },
    });

    // Match row with lexicographic invariant (userAId = min)
    const [userAId, userBId] =
      REAL_USER_ID < user.id ? [REAL_USER_ID, user.id] : [user.id, REAL_USER_ID];
    const match = await prisma.match.create({
      data: { userAId, userBId },
    });

    const conversation = await prisma.conversation.create({
      data: { matchId: match.id },
    });

    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          senderId: user.id,
          body: p.greeting,
          createdAt: new Date(Date.now() - 5 * 60 * 1000),
        },
        {
          conversationId: conversation.id,
          senderId: REAL_USER_ID,
          body: p.reply,
          createdAt: new Date(Date.now() - 2 * 60 * 1000),
        },
      ],
    });

    await prisma.notification.create({
      data: {
        userId: REAL_USER_ID,
        type: "NEW_MATCH",
        actorId: user.id,
      },
    });

    console.log("  match + conversation + messages + notification created");
  }

  const counts = {
    users: await prisma.user.count(),
    blocks: await prisma.block.count({ where: { fromId: REAL_USER_ID } }),
    reports: await prisma.report.count({ where: { reporterId: REAL_USER_ID } }),
    matches: await prisma.match.count({
      where: { OR: [{ userAId: REAL_USER_ID }, { userBId: REAL_USER_ID }] },
    }),
  };
  console.log("\n=== Final state ===", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
