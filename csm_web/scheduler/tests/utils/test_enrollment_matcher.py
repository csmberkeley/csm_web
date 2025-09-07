import pytest
from scheduler.utils.match_solver import (
    get_matches,
    MentorTuple,
    SlotTuple,
    PreferenceTuple,
    MatcherValidationError,
)


@pytest.fixture
def setup():
    return


@pytest.mark.parametrize(
    ["mentors", "slots", "preferences", "expected_matchings"],
    [
        (
            [MentorTuple(100), MentorTuple(200), MentorTuple(300)],
            [SlotTuple(1, 1, 3), SlotTuple(2, 1, 2), SlotTuple(3, 1, 1)],
            [
                # mentor 100
                PreferenceTuple(100, 1, 5),
                PreferenceTuple(100, 2, 4),
                PreferenceTuple(100, 3, 3),
                # mentor 200
                PreferenceTuple(200, 1, 4),
                PreferenceTuple(200, 2, 5),
                PreferenceTuple(200, 3, 3),
                # mentor 300
                PreferenceTuple(300, 1, 4),
                PreferenceTuple(300, 2, 3),
                PreferenceTuple(300, 3, 5),
            ],
            {100: 1, 200: 2, 300: 3},
        ),
        (
            [MentorTuple(1), MentorTuple(2), MentorTuple(3)],
            [SlotTuple(1, 1, 3), SlotTuple(2, 1, 2), SlotTuple(3, 1, 1)],
            [
                # mentor 1
                PreferenceTuple(1, 1, 5),
                PreferenceTuple(1, 2, 4),
                PreferenceTuple(1, 3, 3),
                # mentor 2
                PreferenceTuple(2, 1, 5),
                PreferenceTuple(2, 2, 3),
                PreferenceTuple(2, 3, 4),
                # mentor 3
                PreferenceTuple(3, 1, 4),
                PreferenceTuple(3, 2, 3),
                PreferenceTuple(3, 3, 5),
            ],
            {1: 2, 2: 1, 3: 3},
        ),
        (
            [MentorTuple(1), MentorTuple(2), MentorTuple(3)],
            [SlotTuple(1, 1, 3), SlotTuple(2, 0, 1), SlotTuple(3, 0, 1)],
            [
                # mentor 1
                PreferenceTuple(1, 1, 5),
                PreferenceTuple(1, 2, 4),
                PreferenceTuple(1, 3, 1),
                # mentor 2
                PreferenceTuple(2, 1, 5),
                PreferenceTuple(2, 2, 1),
                PreferenceTuple(2, 3, 1),
                # mentor 3
                PreferenceTuple(3, 1, 5),
                PreferenceTuple(3, 2, 1),
                PreferenceTuple(3, 3, 1),
            ],
            {1: 1, 2: 1, 3: 1},
        ),
        (
            [MentorTuple(1), MentorTuple(2), MentorTuple(3)],
            [SlotTuple(1, 1, 1), SlotTuple(2, 0, 1), SlotTuple(3, 0, 1)],
            [
                # mentor 1
                PreferenceTuple(1, 1, 5),
                PreferenceTuple(1, 2, 1),
                PreferenceTuple(1, 3, 1),
                # mentor 2
                PreferenceTuple(2, 1, 5),
                PreferenceTuple(2, 2, 2),
                PreferenceTuple(2, 3, 1),
                # mentor 3
                PreferenceTuple(3, 1, 5),
                PreferenceTuple(3, 2, 1),
                PreferenceTuple(3, 3, 2),
            ],
            {1: 1, 2: 2, 3: 3},
        ),
        (
            [
                MentorTuple(1),
                MentorTuple(2),
                MentorTuple(3),
                MentorTuple(4),
                MentorTuple(5),
                MentorTuple(6),
            ],
            [SlotTuple(1, 1, 5), SlotTuple(2, 0, 1), SlotTuple(3, 0, 1)],
            [
                # mentor 1
                PreferenceTuple(1, 1, 1),
                PreferenceTuple(1, 2, 5),
                PreferenceTuple(1, 3, 4),
                # mentor 2
                PreferenceTuple(2, 1, 2),
                PreferenceTuple(2, 2, 5),
                PreferenceTuple(2, 3, 4),
                # mentor 3
                PreferenceTuple(3, 1, 1),
                PreferenceTuple(3, 2, 4),
                PreferenceTuple(3, 3, 5),
                # mentor 4
                PreferenceTuple(4, 1, 2),
                PreferenceTuple(4, 2, 4),
                PreferenceTuple(4, 3, 5),
                # mentor 5
                PreferenceTuple(5, 1, 3),
                PreferenceTuple(5, 2, 5),
                PreferenceTuple(5, 3, 5),
                # mentor 6
                PreferenceTuple(6, 1, 3),
                PreferenceTuple(6, 2, 5),
                PreferenceTuple(6, 3, 5),
            ],
            {1: 2, 2: 1, 3: 3, 4: 1, 5: 1, 6: 1},
        ),
    ],
    ids=[
        "no_conflict",
        "top_preference_conflict",
        "match_to_one_slot",
        "limited_slot_capacity",
        "high_preference_for_small_slots",
    ],
)
def test_full_match(setup, mentors, slots, preferences, expected_matchings):
    matchings, unmatchable_mentor_ids = get_matches(mentors, slots, preferences)
    assert expected_matchings == matchings
    assert unmatchable_mentor_ids == []


@pytest.mark.parametrize(
    ["mentors", "slots", "preferences", "expected_matchings", "expected_unmatchable"],
    [
        (
            [MentorTuple(1), MentorTuple(2), MentorTuple(3), MentorTuple(4)],
            [SlotTuple(1, 1, 1), SlotTuple(2, 1, 1), SlotTuple(3, 1, 2)],
            [
                # mentor 1
                PreferenceTuple(1, 1, 5),
                PreferenceTuple(1, 2, 0),
                PreferenceTuple(1, 3, 0),
                # mentor 2
                PreferenceTuple(2, 1, 0),
                PreferenceTuple(2, 2, 5),
                PreferenceTuple(2, 3, 0),
                # mentor 3
                PreferenceTuple(3, 1, 0),
                PreferenceTuple(3, 2, 0),
                PreferenceTuple(3, 3, 5),
                # mentor 4 (conflicts with mentor 1)
                PreferenceTuple(4, 1, 4),
                PreferenceTuple(4, 2, 0),
                PreferenceTuple(4, 3, 0),
            ],
            {
                1: 1,
                2: 2,
                3: 3,
            },
            [4],
        ),
        (
            [MentorTuple(1), MentorTuple(2), MentorTuple(3), MentorTuple(4)],
            [SlotTuple(1, 1, 1), SlotTuple(2, 1, 1), SlotTuple(3, 1, 2)],
            [
                # mentor 1
                PreferenceTuple(1, 1, 5),
                PreferenceTuple(1, 2, 0),
                PreferenceTuple(1, 3, 0),
                # mentor 2
                PreferenceTuple(2, 1, 0),
                PreferenceTuple(2, 2, 5),
                PreferenceTuple(2, 3, 0),
                # mentor 3
                PreferenceTuple(3, 1, 0),
                PreferenceTuple(3, 2, 0),
                PreferenceTuple(3, 3, 5),
                # mentor 4 (no preferences)
                PreferenceTuple(4, 1, 0),
                PreferenceTuple(4, 2, 0),
                PreferenceTuple(4, 3, 0),
            ],
            {
                1: 1,
                2: 2,
                3: 3,
            },
            [4],
        ),
        (
            [MentorTuple(1), MentorTuple(2), MentorTuple(3), MentorTuple(4)],
            [SlotTuple(1, 1, 1), SlotTuple(2, 1, 1), SlotTuple(3, 1, 2)],
            [
                # mentor 1
                PreferenceTuple(1, 1, 0),
                PreferenceTuple(1, 2, 0),
                PreferenceTuple(1, 3, 0),
                # mentor 2
                PreferenceTuple(2, 1, 0),
                PreferenceTuple(2, 2, 0),
                PreferenceTuple(2, 3, 0),
                # mentor 3
                PreferenceTuple(3, 1, 0),
                PreferenceTuple(3, 2, 0),
                PreferenceTuple(3, 3, 0),
                # mentor 4
                PreferenceTuple(4, 1, 0),
                PreferenceTuple(4, 2, 0),
                PreferenceTuple(4, 3, 0),
            ],
            dict(),
            [1, 2, 3, 4],
        ),
    ],
    ids=[
        "max_capacity_no_other_available_slot",
        "mentor_with_no_preferences",
        "all_with_no_preferences",
    ],
)
def test_with_unmatchable(
    setup, mentors, slots, preferences, expected_matchings, expected_unmatchable
):
    matchings, unmatchable_mentor_ids = get_matches(mentors, slots, preferences)
    assert expected_matchings == matchings
    assert expected_unmatchable == unmatchable_mentor_ids


@pytest.mark.parametrize(
    ["mentors", "slots", "preferences", "expected_error"],
    [
        (
            [MentorTuple(1), MentorTuple(2)],
            [SlotTuple(1, 0, 1)],
            [PreferenceTuple(1, 1, 1), PreferenceTuple(2, 1, 1)],
            MatcherValidationError,
        ),
        (
            [MentorTuple(1), MentorTuple(2)],
            [SlotTuple(1, 3, 4)],
            [PreferenceTuple(1, 1, 1), PreferenceTuple(2, 1, 1)],
            MatcherValidationError,
        ),
        (
            [MentorTuple(1)],
            [SlotTuple(1, 2, 1)],
            [PreferenceTuple(1, 1, 1)],
            MatcherValidationError,
        ),
    ],
    ids=[
        "more_mentors_than_slots",
        "more_required_slots_than_mentors",
        "min_mentors_greater_than_max_mentors",
    ],
)
def test_invalid_input(setup, mentors, slots, preferences, expected_error):
    with pytest.raises(expected_error):
        get_matches(mentors, slots, preferences)
