"use client";

import { MyLeaderboard } from "@/shared/ui/leaderboard";

/** Where this recipient stands by gifts received (and wishes asked for); other recipients stay anonymous. */
export default function LeaderboardPage() {
  return (
    <MyLeaderboard
      path="/recipient/leaderboard"
      title="Leaderboard"
      description="Gifts you've received and wishes you've asked for, compared with other SecretWish recipients. Nobody else's name or details are shown."
      score={(n) => `${n.toLocaleString()} received`}
      secondary={(n) => `${n.toLocaleString()} wish${n === 1 ? "" : "es"} asked`}
      next={(n) => `${n} more gift${n === 1 ? "" : "s"} received moves you up a place.`}
      empty="Add wishes to a wishlist and share it to join the leaderboard."
    />
  );
}
