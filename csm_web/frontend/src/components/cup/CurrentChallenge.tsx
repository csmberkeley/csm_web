import { useQuery } from "@tanstack/react-query";
import React from "react";

import { ChallengeEntry, getChallenges } from "../../utils/queries/cup";
import "../../css/cup.scss";

export default function CurrentChallenge(): JSX.Element {
  // Please ask gemini how useQuery and useQueryClient work if you are not sure.
  // See the cuptable component for examples of both as well as useState.

  // In summary, useQuery is used to fetch data from the backend and keep it up to date.
  // It takes a query key (which is used for caching and invalidation) and a query function
  // (which is the function that actually fetches the data).
  // The query function should return a promise that resolves to the data you want to fetch.

  // UseMutation is used to perform mutations (i.e. create, update, delete) on the backend.
  // It takes a mutation function (which is the function that actually performs the mutation) and
  // returns a mutate function that can be called to trigger the mutation, as well as some state about the mutation
  // (e.g. whether it is loading, whether it has an error, etc.).
  // The mutation function should return a promise that resolves when the mutation is complete.

  const { data: challenges = [] } = useQuery<ChallengeEntry[], Error>({
    queryKey: ["challenges"],
    queryFn: getChallenges
  });

  return (
    <div className="current-challenge">
      <h2>Current Challenge</h2>
      {challenges.length === 0 ? (
        <p>No current challenge available.</p>
      ) : (
        // We want to create a banner that will be used at the top of the public facing page.
        // It would be used to show the current avaliable challenges.
        // Filter through which challenges are currently active (current date is between start and end dates).
        // Show a count down timer for how long there is before the challenge ends.
        // Maybe we can also show past challenges in some sort of modal (popup)
        <p>{challenges[0].name}</p>
      )}
    </div>
  );
}
