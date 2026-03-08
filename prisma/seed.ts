import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEV_USER_ID = 'dev-user-001';
const VEHICLE_1_ID = 'v1';
const VEHICLE_2_ID = 'v2';

async function main() {
  // ─── User ───────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { id: DEV_USER_ID },
    update: {},
    create: {
      id: DEV_USER_ID,
      name: 'Thomas Nandola',
      email: 'thomas@myrobotaxi.dev',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=thomas',
    },
  });
  console.log(`Upserted user: ${user.name}`);

  // ─── Vehicles ───────────────────────────────────────────────────────
  const vehicle1 = await prisma.vehicle.upsert({
    where: { id: VEHICLE_1_ID },
    update: {},
    create: {
      id: VEHICLE_1_ID,
      userId: DEV_USER_ID,
      teslaVehicleId: 'tesla-v1-id',
      vin: '5YJ3E1EA1NF000001',
      name: 'Midnight Runner',
      model: 'Model Y Long Range',
      year: 2024,
      color: 'Midnight Silver Metallic',
      licensePlate: 'RTX-4090',
      chargeLevel: 78,
      estimatedRange: 245,
      status: 'driving',
      speed: 65,
      heading: 280,
      locationName: 'I-35 North',
      locationAddress: 'I-35 N near 51st St, Austin, TX',
      latitude: 30.325,
      longitude: -97.738,
      interiorTemp: 72,
      exteriorTemp: 88,
      odometerMiles: 12847,
      fsdMilesToday: 15.3,
      destinationName: 'Domain Northside',
      destinationAddress: '11506 Century Oaks Terrace, Austin, TX',
      etaMinutes: 23,
      tripDistanceMiles: 14.2,
      tripDistanceRemaining: 8.7,
    },
  });

  const vehicle2 = await prisma.vehicle.upsert({
    where: { id: VEHICLE_2_ID },
    update: {},
    create: {
      id: VEHICLE_2_ID,
      userId: DEV_USER_ID,
      teslaVehicleId: 'tesla-v2-id',
      vin: '5YJ3E1EA1NF000002',
      name: 'Pearl',
      model: 'Model 3 Performance',
      year: 2025,
      color: 'Pearl White Multi-Coat',
      licensePlate: 'EV-2025',
      chargeLevel: 42,
      estimatedRange: 128,
      status: 'charging',
      speed: 0,
      heading: 0,
      locationName: 'Tesla Supercharger',
      locationAddress: '1201 Barbara Jordan Blvd, Austin, TX 78723',
      latitude: 30.299,
      longitude: -97.7069,
      interiorTemp: 68,
      exteriorTemp: 88,
      odometerMiles: 3201,
      fsdMilesToday: 4.9,
    },
  });
  console.log(`Upserted vehicles: ${vehicle1.name}, ${vehicle2.name}`);

  // ─── Trip Stop ──────────────────────────────────────────────────────
  await prisma.tripStop.upsert({
    where: { id: 'stop-1' },
    update: {},
    create: {
      id: 'stop-1',
      vehicleId: VEHICLE_1_ID,
      name: 'Tesla Supercharger',
      address: '1201 Barbara Jordan Blvd',
      type: 'charging',
    },
  });
  console.log('Upserted trip stop');

  // ─── Drives ─────────────────────────────────────────────────────────
  const drives = [
    {
      id: 'd1',
      vehicleId: VEHICLE_1_ID,
      date: '2026-02-22',
      startTime: '2:15 PM',
      endTime: '3:02 PM',
      startLocation: 'Thompson Hotel',
      startAddress: '506 San Jacinto Blvd, Austin, TX',
      endLocation: 'Domain Northside',
      endAddress: '11506 Century Oaks Terrace, Austin, TX',
      distanceMiles: 14.2,
      durationMinutes: 47,
      avgSpeedMph: 38,
      maxSpeedMph: 72,
      energyUsedKwh: 4.8,
      startChargeLevel: 92,
      endChargeLevel: 78,
      fsdMiles: 12.1,
      fsdPercentage: 85,
      interventions: 1,
      routePoints: [
        [-97.7405, 30.265], [-97.742, 30.272], [-97.743, 30.28],
        [-97.7435, 30.288], [-97.743, 30.296], [-97.741, 30.305],
        [-97.738, 30.315], [-97.738, 30.325], [-97.736, 30.335],
        [-97.733, 30.345], [-97.73, 30.355], [-97.727, 30.365],
        [-97.725, 30.375], [-97.723, 30.385], [-97.722, 30.395],
        [-97.724, 30.402],
      ],
    },
    {
      id: 'd2',
      vehicleId: VEHICLE_1_ID,
      date: '2026-02-22',
      startTime: '9:30 AM',
      endTime: '10:05 AM',
      startLocation: 'Home',
      startAddress: '1200 Barton Springs Rd, Austin, TX',
      endLocation: 'Whole Foods HQ',
      endAddress: '550 Bowie St, Austin, TX',
      distanceMiles: 3.8,
      durationMinutes: 35,
      avgSpeedMph: 22,
      maxSpeedMph: 45,
      energyUsedKwh: 1.2,
      startChargeLevel: 95,
      endChargeLevel: 92,
      fsdMiles: 3.2,
      fsdPercentage: 84,
      interventions: 0,
      routePoints: [
        [-97.7631, 30.2622], [-97.759, 30.264], [-97.754, 30.266],
        [-97.75, 30.265], [-97.748, 30.264], [-97.745, 30.263],
      ],
    },
    {
      id: 'd3',
      vehicleId: VEHICLE_1_ID,
      date: '2026-02-21',
      startTime: '6:00 PM',
      endTime: '6:45 PM',
      startLocation: 'Whole Foods HQ',
      startAddress: '550 Bowie St, Austin, TX',
      endLocation: 'Home',
      endAddress: '1200 Barton Springs Rd, Austin, TX',
      distanceMiles: 4.1,
      durationMinutes: 45,
      avgSpeedMph: 18,
      maxSpeedMph: 40,
      energyUsedKwh: 1.5,
      startChargeLevel: 88,
      endChargeLevel: 85,
      fsdMiles: 3.8,
      fsdPercentage: 93,
      interventions: 0,
      routePoints: [
        [-97.745, 30.263], [-97.748, 30.264], [-97.752, 30.265],
        [-97.756, 30.264], [-97.76, 30.263], [-97.7631, 30.2622],
      ],
    },
    {
      id: 'd4',
      vehicleId: VEHICLE_1_ID,
      date: '2026-02-21',
      startTime: '8:45 AM',
      endTime: '9:20 AM',
      startLocation: 'Home',
      startAddress: '1200 Barton Springs Rd, Austin, TX',
      endLocation: 'Whole Foods HQ',
      endAddress: '550 Bowie St, Austin, TX',
      distanceMiles: 3.9,
      durationMinutes: 35,
      avgSpeedMph: 24,
      maxSpeedMph: 48,
      energyUsedKwh: 1.3,
      startChargeLevel: 91,
      endChargeLevel: 88,
      fsdMiles: 3.6,
      fsdPercentage: 92,
      interventions: 0,
      routePoints: [
        [-97.7631, 30.2622], [-97.759, 30.264], [-97.754, 30.266],
        [-97.75, 30.265], [-97.748, 30.264], [-97.745, 30.263],
      ],
    },
    {
      id: 'd5',
      vehicleId: VEHICLE_1_ID,
      date: '2026-02-20',
      startTime: '3:00 PM',
      endTime: '4:15 PM',
      startLocation: 'Home',
      startAddress: '1200 Barton Springs Rd, Austin, TX',
      endLocation: 'Circuit of the Americas',
      endAddress: '9201 Circuit of the Americas Blvd, Austin, TX',
      distanceMiles: 18.6,
      durationMinutes: 75,
      avgSpeedMph: 42,
      maxSpeedMph: 75,
      energyUsedKwh: 6.2,
      startChargeLevel: 96,
      endChargeLevel: 78,
      fsdMiles: 16.2,
      fsdPercentage: 87,
      interventions: 2,
      routePoints: [
        [-97.7631, 30.2622], [-97.755, 30.255], [-97.745, 30.248],
        [-97.735, 30.24], [-97.725, 30.23], [-97.71, 30.22],
        [-97.695, 30.21], [-97.685, 30.2], [-97.65, 30.135],
      ],
    },
    {
      id: 'd6',
      vehicleId: VEHICLE_2_ID,
      date: '2026-02-22',
      startTime: '11:00 AM',
      endTime: '11:25 AM',
      startLocation: 'Downtown Condo',
      startAddress: '300 Bowie St, Austin, TX',
      endLocation: 'Tesla Supercharger',
      endAddress: '1201 Barbara Jordan Blvd, Austin, TX',
      distanceMiles: 5.4,
      durationMinutes: 25,
      avgSpeedMph: 28,
      maxSpeedMph: 55,
      energyUsedKwh: 1.8,
      startChargeLevel: 18,
      endChargeLevel: 15,
      fsdMiles: 4.9,
      fsdPercentage: 91,
      interventions: 0,
      routePoints: [
        [-97.75, 30.263], [-97.743, 30.268], [-97.735, 30.275],
        [-97.725, 30.283], [-97.715, 30.29], [-97.7069, 30.299],
      ],
    },
  ] as const;

  for (const drive of drives) {
    await prisma.drive.upsert({
      where: { id: drive.id },
      update: {},
      create: { ...drive, routePoints: drive.routePoints as unknown as number[][] },
    });
  }
  console.log(`Upserted ${drives.length} drives`);

  // ─── Invites ────────────────────────────────────────────────────────
  const invites = [
    {
      id: 'inv1',
      vehicleId: VEHICLE_1_ID,
      senderId: DEV_USER_ID,
      label: 'Mom',
      email: 'sarah.t@gmail.com',
      status: 'accepted' as const,
      permission: 'live_history' as const,
      sentDate: new Date('2026-01-15'),
      acceptedDate: new Date('2026-01-15'),
      lastSeen: new Date('2026-02-22T10:00:00'),
      isOnline: false,
    },
    {
      id: 'inv2',
      vehicleId: VEHICLE_1_ID,
      senderId: DEV_USER_ID,
      label: 'Alex',
      email: 'alex.chen@outlook.com',
      status: 'accepted' as const,
      permission: 'live' as const,
      sentDate: new Date('2026-02-01'),
      acceptedDate: new Date('2026-02-02'),
      lastSeen: new Date('2026-02-22T12:55:00'),
      isOnline: true,
    },
    {
      id: 'inv3',
      vehicleId: VEHICLE_1_ID,
      senderId: DEV_USER_ID,
      label: 'Jamie',
      email: 'jamie.w@proton.me',
      status: 'pending' as const,
      permission: 'live_history' as const,
      sentDate: new Date('2026-02-20'),
    },
    {
      id: 'inv4',
      vehicleId: VEHICLE_1_ID,
      senderId: DEV_USER_ID,
      label: 'Dad',
      email: 'robert.t@yahoo.com',
      status: 'pending' as const,
      permission: 'live' as const,
      sentDate: new Date('2026-02-21'),
    },
  ];

  for (const invite of invites) {
    await prisma.invite.upsert({
      where: { id: invite.id },
      update: {},
      create: invite,
    });
  }
  console.log(`Upserted ${invites.length} invites`);

  // ─── Tesla Account (simulates linked Tesla for E2E) ────────────────
  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: 'tesla',
        providerAccountId: 'tesla-dev-account',
      },
    },
    update: {},
    create: {
      userId: DEV_USER_ID,
      type: 'oauth',
      provider: 'tesla',
      providerAccountId: 'tesla-dev-account',
      access_token: 'dev-tesla-access-token',
      refresh_token: 'dev-tesla-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      token_type: 'Bearer',
      scope: 'openid offline_access user_data vehicle_device_data vehicle_location',
    },
  });
  console.log('Upserted Tesla account');

  // ─── Settings ───────────────────────────────────────────────────────
  await prisma.settings.upsert({
    where: { userId: DEV_USER_ID },
    update: { virtualKeyPaired: true },
    create: {
      userId: DEV_USER_ID,
      teslaLinked: true,
      teslaVehicleName: 'Midnight Runner',
      virtualKeyPaired: true,
      notifyDriveStarted: true,
      notifyDriveCompleted: true,
      notifyChargingComplete: true,
      notifyViewerJoined: true,
    },
  });
  console.log('Upserted settings');

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
