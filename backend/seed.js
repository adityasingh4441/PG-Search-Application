import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import PG from './src/models/PG.js';
import User from './src/models/User.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const password = process.env.SEED_PASSWORD;
if (!password || password.startsWith('replace-')) {
  console.error('Set SEED_PASSWORD in .env to a throwaway local password before seeding.');
  process.exit(1);
}

const listings = [
  { name: 'The Neem House', area: 'Raya Road', address: '18 Knowledge Park Road, Mathura', rent: 8500, deposit: 8500, gender: 'Any', availability: 3, amenities: ['Wi-Fi', 'Meals', 'Laundry', 'Housekeeping'], image: 'photo-1600210492486-724fe5c67fb0', coords: [77.5881, 27.6084], description: 'A light-filled, easygoing home with shared meals, quiet study corners and a leafy courtyard. A short ride from GLA University.' },
  { name: 'Mango Courtyard', area: 'Chhatikara', address: '7 Temple View Lane, Vrindavan', rent: 11000, deposit: 10000, gender: 'Women', availability: 2, amenities: ['Wi-Fi', 'AC', 'Meals', 'Parking'], image: 'photo-1600607687939-ce8a6c25118c', coords: [77.6736, 27.5798], description: 'A calm, secure stay with bright private rooms, a shared kitchen and a shaded courtyard. Groceries and transit are close by.' },
  { name: 'Studio 27', area: 'Govardhan Road', address: '27 Krishna Nagar, Mathura', rent: 7800, deposit: 5000, gender: 'Men', availability: 4, amenities: ['Wi-Fi', 'Laundry', 'Parking'], image: 'photo-1522708323590-d24dbb6b0267', coords: [77.6842, 27.4921], description: 'Simple, well-kept rooms in a friendly house-share with reliable Wi-Fi and a dedicated place to study.' },
  { name: 'The Peepal Stay', area: 'Raya Road', address: '4 Campus Link Street, Mathura', rent: 13500, deposit: 12000, gender: 'Any', availability: 1, amenities: ['Wi-Fi', 'AC', 'Meals', 'Housekeeping'], image: 'photo-1616486338812-3dadae4b4ace', coords: [77.5938, 27.6019], description: 'A freshly furnished home with a relaxed common room, regular home-cooked meals and flexible move-in dates.' },
  { name: 'Arbor House', area: 'Mathura Cantt', address: '12 Station Approach, Mathura', rent: 9500, deposit: 7000, gender: 'Women', availability: 2, amenities: ['Wi-Fi', 'Laundry', 'Housekeeping'], image: 'photo-1618221195710-dd6b41faaea6', coords: [77.6731, 27.4952], description: 'A welcoming, well-connected home with shared living space and a small garden for slow Sunday mornings.' },
  { name: 'Sunday Rooms', area: 'Krishna Nagar', address: '31 Market Road, Mathura', rent: 16000, deposit: 15000, gender: 'Any', availability: 2, amenities: ['Wi-Fi', 'AC', 'Parking'], image: 'photo-1616486029423-aaa4789e8c9a', coords: [77.6815, 27.4937], description: 'Private furnished rooms with an airy common area, secure entry and cafes, shops and buses nearby.' }
];

try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pg_search');
  const passwordHash = await bcrypt.hash(password, 12);
  const [admin, owner, student] = await Promise.all([
    User.findOneAndUpdate({ email: process.env.SEED_ADMIN_EMAIL || 'admin@roomroot.local' }, { $set: { name: 'Roomroot Admin', passwordHash, role: 'admin', isBlocked: false } }, { upsert: true, new: true, runValidators: true }),
    User.findOneAndUpdate({ email: process.env.SEED_OWNER_EMAIL || 'owner@roomroot.local' }, { $set: { name: 'Aarav Sharma', passwordHash, role: 'owner', isBlocked: false, phone: '+91 98765 43210' } }, { upsert: true, new: true, runValidators: true }),
    User.findOneAndUpdate({ email: process.env.SEED_STUDENT_EMAIL || 'student@roomroot.local' }, { $set: { name: 'Mira Student', passwordHash, role: 'student', isBlocked: false } }, { upsert: true, new: true, runValidators: true })
  ]);
  for (const listing of listings) {
    const { image, coords, ...fields } = listing;
    await PG.findOneAndUpdate(
      { ownerId: owner._id, name: fields.name },
      { $setOnInsert: { ...fields, ownerId: owner._id, status: 'approved', images: [`https://images.unsplash.com/${image}?auto=format&fit=crop&w=1200&q=80`], roomTypes: [{ name: 'Private room', rent: fields.rent, available: fields.availability }], location: { type: 'Point', coordinates: coords }, rating: 0, reviewCount: 0 } },
      { upsert: true, new: true, runValidators: true }
    );
  }
  console.log(`Seeded ${listings.length} approved stays and local accounts:`);
  console.log(`Admin: ${admin.email}`);
  console.log(`Owner: ${owner.email}`);
  console.log(`Student: ${student.email}`);
  console.log('All three use the SEED_PASSWORD value from .env.');
} catch (error) {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}