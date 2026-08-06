import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";

import { ChallengeEntry, getChallenges } from "../../utils/queries/cup";
import Modal from "../Modal";
import "../../css/cup.scss";

/**
 * Parse a "YYYY-MM-DD" DateField string as a local date at midnight,
 * avoiding the UTC-parsing pitfall of `new Date("YYYY-MM-DD")`.
 */
function parseDateOnly(dateStr?: string): Date {
  if (!dateStr || typeof dateStr !== "string" || !dateStr.includes("-")) {
    console.warn("Received invalid date string in parseDateOnly:", dateStr);
    return new Date();
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** End of day (23:59:59.999) for a given DateField's end_date. */
function endOfDay(dateStr: string): Date {
  const d = parseDateOnly(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

function isActive(challenge: ChallengeEntry, now: Date): boolean {
  const start = parseDateOnly(challenge.start_date);
  const end = endOfDay(challenge.end_date);
  return start <= now && now <= end;
}

function isPast(challenge: ChallengeEntry, now: Date): boolean {
  return endOfDay(challenge.end_date) < now;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0d 0h 0m 0s";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function CountdownTimer({ endDate }: { endDate: string }): JSX.Element {
  const now = useNow();
  const remainingMs = endOfDay(endDate).getTime() - now.getTime();

  return <span className="countdown-timer">{remainingMs > 0 ? formatDuration(remainingMs) : "Challenge ended"}</span>;
}

function ChallengeBanner({ challenge }: { challenge: ChallengeEntry }): JSX.Element {
  return (
    <div className="challenge-banner">
      <div className="challenge-banner-header">
        <h3>{challenge.name}</h3>
        <span className="challenge-points-badge">{challenge.maxPoints} pts</span>
      </div>
      {challenge.description && <p className="challenge-banner-description">{challenge.description}</p>}
      <div className="challenge-banner-footer">
        <span className="challenge-dates">
          {challenge.start_date} – {challenge.end_date}
        </span>
        <CountdownTimer endDate={challenge.end_date} />
      </div>
    </div>
  );
}

export default function CurrentChallenge(): JSX.Element {
  const {
    data: challenges = [],
    isLoading,
    isError
  } = useQuery<ChallengeEntry[], Error>({
    queryKey: ["challenges"],
    queryFn: getChallenges
  });

  const [pastModalOpen, setPastModalOpen] = useState<boolean>(false);
  const now = useNow(60_000); // recompute active/past buckets once a minute

  const activeChallenges = useMemo(() => challenges.filter((c: ChallengeEntry) => isActive(c, now)), [challenges, now]);

  const pastChallenges = useMemo(
    () =>
      challenges
        .filter((c: ChallengeEntry) => isPast(c, now))
        .sort(
          (a: ChallengeEntry, b: ChallengeEntry) =>
            parseDateOnly(b.end_date).getTime() - parseDateOnly(a.end_date).getTime()
        ),
    [challenges, now]
  );

  if (isLoading) return <div className="current-challenge">Loading current challenge...</div>;
  if (isError) return <div className="current-challenge">Error loading challenges.</div>;

  return (
    <div className="current-challenge">
      <div className="current-challenge-header">
        <h2>Current Challenge{activeChallenges.length !== 1 ? "s" : ""}</h2>
        {pastChallenges.length > 0 && (
          <button className="past-challenges-btn" onClick={() => setPastModalOpen(true)}>
            Past Challenges
          </button>
        )}
      </div>

      {activeChallenges.length === 0 ? (
        <p>No current challenge available.</p>
      ) : (
        <div className="challenge-banner-list">
          {activeChallenges.map((challenge: ChallengeEntry) => (
            <ChallengeBanner key={challenge.id} challenge={challenge} />
          ))}
        </div>
      )}

      {pastModalOpen && (
        <Modal closeModal={() => setPastModalOpen(false)}>
          <div className="modal-content past-challenges-content">
            <h3>Past Challenges</h3>
            {pastChallenges.length === 0 ? (
              <p>No past challenges yet.</p>
            ) : (
              <ul className="past-challenges-list">
                {pastChallenges.map((challenge: ChallengeEntry) => (
                  <li key={challenge.id} className="past-challenge-item">
                    <div className="past-challenge-header">
                      <span className="past-challenge-name">{challenge.name}</span>
                      <span className="past-challenge-points">{challenge.maxPoints} pts</span>
                    </div>
                    <span className="past-challenge-dates">
                      {challenge.start_date} – {challenge.end_date}
                    </span>
                    {challenge.description && <p className="past-challenge-description">{challenge.description}</p>}
                  </li>
                ))}
              </ul>
            )}
            <div className="modal-actions">
              <button className="btn-close" onClick={() => setPastModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
