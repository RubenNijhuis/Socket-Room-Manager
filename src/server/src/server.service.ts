import { Member } from "./RoomManager";

const findAnotherPlayer = (
    player: Member.Instance,
    opponents: Member.Instance[],
    evaluation: (
        player: Member.Instance,
        potentialOpponent: Member.Instance
    ) => boolean
): Member.Instance => {
    // Set a default in case we can't find a valid one
    let selectedOpponent: Member.Instance = opponents[0];

    // Go through all opponents
    for (const potentialOpponent of opponents) {
        if (player.uid === potentialOpponent.uid) continue;

        // Check if the opponent is valid
        const isValidOpponent = evaluation(player, potentialOpponent);

        // If so we return it
        if (isValidOpponent) return potentialOpponent;
    }

    // Return the default one if no valid one was found
    return selectedOpponent;
};

export { findAnotherPlayer };
