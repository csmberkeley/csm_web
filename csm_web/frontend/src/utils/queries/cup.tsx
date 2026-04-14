import { fetchNormalized } from "../api";
import { handlePermissionsError, ServerError } from "./helpers";

export interface LeaderboardEntry {
  id: number;
  familyName: string;
  course: string;
  mentors: string[];
  totalPoints: number;
}

export const getLeaderboardData = async () => {
  // query disabled when id undefined

  const response = await fetchNormalized(`/cup/leaderboard/`);
  if (response.ok) {
    return await response.json();
  } else {
    handlePermissionsError(response.status);
    throw new ServerError(`Failed to fetch leaderboard data}`);
  }
};
