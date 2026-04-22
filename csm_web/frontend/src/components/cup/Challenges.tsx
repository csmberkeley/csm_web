import { useQuery } from "@tanstack/react-query";
import React from "react";

import { ChallengeEntry, getChallenges } from "../../utils/queries/cup";
import "../../css/cup.scss";

export default function CurrentChallenge(): JSX.Element {
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
        // We want to show the cupadmin all challenges
        // They should be able to add new challenges, edit existing challenges, and delete challenges.
        // When clicking on each challenge, show a modal (popup) with
        // the name, description, start date, end date, points, and max points.
        // It should be autofilled with the current information and allow the admin to edit it.

        // We can also show a button to edit the challenge and a button to delete the challenge.

        // The new challenge button should popup the same modal except an empty version to fill.

        // We will need to make a new mutation in the cup.tsx file to handle the add/edit/delete functionality.
        // Please see the useAddPointsMutation function for an example of how to do this.
        <p>{challenges[0].name}</p>

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
      )}
    </div>
  );
}
