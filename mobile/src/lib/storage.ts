import AsyncStorage from "@react-native-async-storage/async-storage";
import type { EmployeeProfile } from "../types";

const TOKEN_KEY = "checkinqr_mobile_token";
const PROFILE_KEY = "checkinqr_mobile_profile";

export async function saveSession(token: string, profile: EmployeeProfile) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [PROFILE_KEY, JSON.stringify(profile)],
  ]);
}

export async function loadSession() {
  const [[, token], [, profileRaw]] = await AsyncStorage.multiGet([
    TOKEN_KEY,
    PROFILE_KEY,
  ]);

  return {
    token,
    profile: profileRaw ? (JSON.parse(profileRaw) as EmployeeProfile) : null,
  };
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, PROFILE_KEY]);
}
