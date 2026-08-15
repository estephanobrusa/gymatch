"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import type { GymSearchResult } from "@gymatch/core";

type PlacesApiPlace = {
  id: string;
  displayName: { text: string };
  formattedAddress: string;
};

type PlacesApiResponse = {
  places?: PlacesApiPlace[];
};

/**
 * Returns the DB user id for the currently authenticated user.
 * Redirects to /login if unauthenticated or missing from DB.
 */
async function resolveCurrentUserId(): Promise<string> {
  const authUser = await getUser();
  if (!authUser) redirect("/login");

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true },
  });

  if (!dbUser) redirect("/login");
  return dbUser.id;
}

/**
 * Searches for gyms via the Google Places Text Search API.
 * The API key is server-only — never exposed to the client bundle.
 *
 * Returns [] when:
 * - query is shorter than 2 characters
 * - a network or API error occurs
 */
export async function searchGymsAction(query: string): Promise<GymSearchResult[]> {
  if (query.length < 2) return [];

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_PLACES_API_KEY is not configured.");
    return [];
  }

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
        },
        body: JSON.stringify({
          textQuery: query,
          includedType: "gym",
        }),
      }
    );

    const data = (await response.json()) as PlacesApiResponse;

    if (!data.places) return [];

    return data.places.map((place) => ({
      placeId: place.id,
      name: place.displayName.text,
      address: place.formattedAddress,
    }));
  } catch {
    // Swallow network errors gracefully — return empty results
    return [];
  }
}

/**
 * Upserts a Gym record by googlePlaceId and links it to the current user.
 * If a gym with the same placeId already exists, no duplicate is created.
 */
export async function saveGymAction(
  placeId: string,
  name: string,
  address: string
): Promise<{ success: true } | { error: string }> {
  const userId = await resolveCurrentUserId();

  try {
    const gym = await prismaAdmin.gym.upsert({
      where: { googlePlaceId: placeId },
      create: {
        name,
        address,
        googlePlaceId: placeId,
      },
      update: {
        name,
        address,
      },
    });

    await prismaAdmin.user.update({
      where: { id: userId },
      data: { gymId: gym.id },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error saving gym.";
    return { error: message };
  }
}
